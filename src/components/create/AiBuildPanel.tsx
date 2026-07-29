"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DictationField } from "@/components/ui/DictationField";
import { HtmlWorkshop, type HtmlWorkshopHandle } from "@/components/create/HtmlWorkshop";
import { cn } from "@/lib/cn";
import { authHref } from "@/lib/next-path";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import type { StarterFiles } from "@/lib/html-starters";
import type { ProjectCategory } from "@/lib/types";
import type { AiPlan } from "@/lib/ai-quota";
import {
  ensurePlayableFiles,
  looksIncompletePlayable,
} from "@/lib/ai-build";
import { coinCatcherFiles } from "@/lib/ai-game-fallbacks";
import {
  capturePreviewInsight,
} from "@/lib/preview-insight";

type ChatMessage = { role: "assistant" | "user"; content: string };

type QuotaState = {
  plan: AiPlan;
  used: number;
  limit: number;
  remaining: number;
};

type AiBuildPanelProps = {
  signedIn: boolean;
  userId: string | null;
  email: string | null;
  plan?: AiPlan | null;
  prompt: string;
  files: StarterFiles | undefined;
  onPromptChange: (prompt: string) => void;
  onBuilt: (data: {
    files: StarterFiles;
    title: string;
    description: string;
    category: ProjectCategory;
  }) => void;
  onFilesChange: (files: StarterFiles) => void;
};

export function AiBuildPanel({
  signedIn,
  userId,
  email,
  plan,
  prompt,
  files,
  onPromptChange,
  onBuilt,
  onFilesChange,
}: AiBuildPanelProps) {
  const t = useT();
  const { locale } = useLocale();
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "chat" | "build">("idle");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reply, setReply] = useState("");
  const [categoryHint, setCategoryHint] = useState<ProjectCategory | null>(null);
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const activePlan = plan ?? "free";
  const chatEndRef = useRef<HTMLDivElement>(null);
  const workshopRef = useRef<HtmlWorkshopHandle>(null);
  const autoHealKey = useRef<string | null>(null);

  // Broken Score:0 shells → replace with a playable package once (preview can't invent a canvas).
  useEffect(() => {
    if (!files?.["index.html"]) return;
    if (!looksIncompletePlayable(files, "game")) return;
    const key = `${files["index.html"]!.length}:${files["script.js"]?.length ?? 0}:${files["index.html"]!.slice(0, 80)}`;
    if (autoHealKey.current === key) return;
    autoHealKey.current = key;
    const titleMatch = files["index.html"].match(/<title>([^<]*)<\/title>/i);
    const title = (titleMatch?.[1] || "Coin Catcher").trim().slice(0, 40);
    const healed = ensurePlayableFiles(files, {
      title,
      brief: prompt || title,
      category: "game",
    });
    if (!looksIncompletePlayable(healed, "game")) {
      onBuilt({
        files: healed,
        title,
        description:
          locale === "pl"
            ? "Łap monety koszykiem — strzałki lub przeciąganie."
            : "Catch coins with the basket — arrows or drag.",
        category: "game",
      });
      setRevision((n) => n + 1);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            locale === "pl"
              ? "Podgląd był pusty (sama skorupa). Wstawiłem działającą grę."
              : "The preview was an empty shell — I inserted a working game.",
        },
      ]);
    }
  }, [files, prompt, locale, onBuilt]);


  const loadQuota = useCallback(async () => {
    if (!signedIn) return;
    try {
      const res = await fetch(
        `/api/build?plan=${encodeURIComponent(activePlan)}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as { quota?: QuotaState };
      if (data.quota) setQuota(data.quota);
    } catch {
      /* ignore */
    }
  }, [signedIn, activePlan]);

  useEffect(() => {
    void loadQuota();
  }, [loadQuota, userId, email, activePlan]);

  // Re-sync quota when returning to the tab / wizard step (avoid stale “3 of 3”).
  useEffect(() => {
    const onFocus = () => {
      void loadQuota();
    };
    const onVis = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loadQuota]);

  useEffect(() => {
    setMessages([]);
    setReply("");
    setError("");
    setCategoryHint(null);
  }, [prompt]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);

  const quotaExhausted = Boolean(quota && quota.remaining <= 0);
  const actionsLocked = busy || quotaExhausted;
  if (!signedIn) {
    return (
      <div className="rounded-xl border-2 border-brand/30 bg-lilac/40 p-6 text-center">
        <p className="text-xl font-extrabold">{t("workshop.aiTitle")}</p>
        <p className="mt-2 text-ink-muted">{t("workshop.aiNeedAccount")}</p>
        <Button href={authHref("/create", { mode: "join" })} className="mt-5" size="l">
          {t("workshop.aiJoin")}
        </Button>
      </div>
    );
  }

  async function request(options: {
    action: "chat" | "build";
    nextMessages?: ChatMessage[];
  }) {
    setError("");
    if (quota && quota.remaining <= 0) {
      setError(t("workshop.aiQuotaLimit"));
      return;
    }
    const trimmed = prompt.trim();
    if (trimmed.length < 12) {
      setError(t("workshop.aiPromptShort"));
      return;
    }

    const thread = options.nextMessages ?? messages;
    setBusy(true);
    setPhase(options.action === "build" ? "build" : "chat");
    try {
      // Let the preview paint a couple frames before we snapshot it for the model.
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await new Promise((r) => setTimeout(r, 180));
      const previewInsight = files
        ? (workshopRef.current?.capturePreview() ??
          capturePreviewInsight(null, files))
        : null;

      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          userId,
          email,
          locale,
          plan: activePlan,
          action: options.action,
          messages: thread,
          categoryHint,
          mode: files ? "regenerate" : "new_project",
          files: files ?? undefined,
          previewInsight: previewInsight
            ? {
                summary: previewInsight.summary,
                imageDataUrl: previewInsight.imageDataUrl,
                hasCanvas: previewInsight.hasCanvas,
                likelyBlank: previewInsight.likelyBlank,
              }
            : undefined,
        }),
      });
      let data: {
        error?: string;
        code?: string;
        status?: string;
        message?: string;
        title?: string;
        description?: string;
        category?: ProjectCategory;
        categoryHint?: ProjectCategory | null;
        files?: StarterFiles;
        quota?: QuotaState;
      } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        setError(
          res.status === 504 || res.status === 408
            ? t("workshop.aiTimeout")
            : t("workshop.aiHttpError", { status: String(res.status || "?") }),
        );
        return;
      }

      if (data.quota) setQuota(data.quota);

      if (!res.ok) {
        if (res.status === 429) {
          setError(data.error || t("workshop.aiQuotaLimit"));
        } else if (res.status === 503 || data.code === "ai_unavailable") {
          setError(t("workshop.aiUnavailable"));
        } else if (res.status === 401) {
          setError(t("workshop.aiNeedAccount"));
        } else {
          setError(data.error || t("workshop.aiFailed"));
        }
        return;
      }

      if (data.categoryHint) {
        setCategoryHint(data.categoryHint);
      }

      if (data.status === "chat" && data.message) {
        setMessages([...thread, { role: "assistant", content: data.message }]);
        return;
      }

      if (data.message) {
        setMessages([...thread, { role: "assistant", content: data.message }]);
      }

      if (!data.files?.["index.html"]) {
        // Chat-only success already returned above; missing files = failed build.
        // If the editor already has a broken shell, heal it locally so the user isn't stuck.
        if (files && looksIncompletePlayable(files, "game")) {
          const healed = ensurePlayableFiles(files, {
            title: "Coin Catcher",
            brief: trimmed,
            category: "game",
          });
          onBuilt({
            files: healed,
            title: "Coin Catcher",
            description: trimmed.slice(0, 160),
            category: "game",
          });
          setRevision((n) => n + 1);
          setMessages([
            ...thread,
            {
              role: "assistant",
              content:
                locale === "pl"
                  ? "Wstawiłem działającą wersję gry do podglądu."
                  : "I dropped a working version into the preview.",
            },
          ]);
          return;
        }
        setError(data.error || t("workshop.aiFailed"));
        return;
      }

      const healed = ensurePlayableFiles(data.files, {
        title: data.title,
        brief: trimmed,
        category: data.category || "game",
      });
      onBuilt({
        files: healed,
        title: data.title || "AI project",
        description: data.description || trimmed.slice(0, 160),
        category: data.category || "experiment",
      });
      setRevision((n) => n + 1);
    } catch {
      setError(t("workshop.aiFailed"));
    } finally {
      setBusy(false);
      setPhase("idle");
    }
  }

  async function startOrRebuild() {
    if (quotaExhausted) {
      setError(t("workshop.aiQuotaLimit"));
      return;
    }
    setMessages([]);
    setReply("");
    // Existing project → rebuild/edit immediately. New idea → clarify first.
    if (files?.["index.html"]) {
      await request({ action: "build", nextMessages: [] });
      return;
    }
    await request({ action: "chat", nextMessages: [] });
  }

  async function sendReply() {
    if (quotaExhausted) {
      setError(t("workshop.aiQuotaLimit"));
      return;
    }
    const text = reply.trim();
    if (!text) {
      setError(t("workshop.aiChatEmpty"));
      return;
    }
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(nextMessages);
    setReply("");
    // With code in the editor, each chat line is an edit instruction → build.
    // (Don't keep treating a stale top-prompt bug report as “fix forever”.)
    if (files?.["index.html"]) {
      await request({ action: "build", nextMessages });
      return;
    }
    await request({ action: "chat", nextMessages });
  }

  async function applyLocalPlayableFix() {
    if (!files?.["index.html"]) return;
    const titleMatch = files["index.html"].match(/<title>([^<]*)<\/title>/i);
    const title = (titleMatch?.[1] || "Coin Catcher").trim().slice(0, 40);
    const healed = ensurePlayableFiles(coinCatcherFiles(title), {
      title,
      brief: prompt,
      category: "game",
    });
    onBuilt({
      files: healed,
      title,
      description:
        locale === "pl"
          ? "Łap monety koszykiem — strzałki lub przeciąganie."
          : "Catch coins with the basket — arrows or drag.",
      category: "game",
    });
    setRevision((n) => n + 1);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          locale === "pl"
            ? "Wstawiłem działającą grę Coin Catcher do edytora i podglądu."
            : "I put a working Coin Catcher into the editor and preview.",
      },
    ]);
    setError("");
  }

  const chatting = messages.length > 0;
  const brokenPreview = Boolean(
    files && looksIncompletePlayable(files, "game"),
  );
  const busyLabel =
    phase === "chat" ? t("workshop.aiChatThinking") : t("workshop.aiBuilding");

  return (
    <div className="space-y-6">
      {quota && (
        <div
          className={cn(
            "sticky top-2 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 px-4 py-2.5 shadow-[var(--shadow-1)]",
            quotaExhausted
              ? "border-danger/40 bg-danger/10"
              : "border-brand/25 bg-surface/95 backdrop-blur-sm",
          )}
        >
          <p className="text-sm font-extrabold text-ink">
            <span className="mr-2 rounded-md bg-brand px-2 py-0.5 text-xs text-on-brand">
              AI
            </span>
            {t("workshop.aiQuota", {
              remaining: quota.remaining,
              limit: quota.limit,
              plan:
                quota.plan === "free"
                  ? t("workshop.aiQuotaFree")
                  : quota.plan === "pro"
                    ? t("workshop.aiQuotaPro")
                    : t("workshop.aiQuotaStudio"),
            })}
          </p>
          {quotaExhausted ? (
            <a
              href="/pricing"
              className="text-sm font-bold text-brand-strong underline"
            >
              {t("workshop.upgradePlan")}
            </a>
          ) : null}
        </div>
      )}

      <div>
        <p className="text-lg font-bold">{t("workshop.aiTitle")}</p>
        <p className="mt-1 text-ink-muted">{t("workshop.aiPromptSub")}</p>
        <label className="mt-4 block">
          <span className="sr-only">{t("workshop.aiPromptLabel")}</span>
          <DictationField value={prompt} onChange={onPromptChange}>
            <textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              rows={4}
              maxLength={2000}
              disabled={actionsLocked}
              placeholder={t("workshop.aiPromptPlaceholder")}
              className="w-full rounded-xl border-2 border-border p-4 text-lg focus:border-brand focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
          </DictationField>
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="min-w-full text-sm font-semibold text-ink-muted">
            {t("workshop.currentPlan", {
              plan:
                activePlan === "studio"
                  ? t("workshop.planStudio")
                  : activePlan === "pro"
                    ? t("workshop.planPro")
                    : t("workshop.planFree"),
            })}{" "}
            <a href="/pricing" className="text-brand-strong underline">
              {t("workshop.upgradePlan")}
            </a>
          </p>
          <Button
            type="button"
            size="l"
            disabled={actionsLocked}
            onClick={() => void startOrRebuild()}
          >
            {quotaExhausted
              ? t("workshop.aiLimitReached")
              : busy && !chatting
                ? busyLabel
                : files
                  ? t("workshop.aiRebuild")
                  : chatting
                    ? t("workshop.aiRestartChat")
                    : t("workshop.aiStartChat")}
          </Button>
          <p className="text-sm text-ink-muted">{t("workshop.aiHintPaid")}</p>
        </div>
        {quotaExhausted && (
          <p className="mt-3 font-semibold text-danger" role="status">
            {t("workshop.aiQuotaLimit")}
          </p>
        )}
        {error && (
          <p className="mt-3 font-semibold text-danger" role="alert">
            {error}
          </p>
        )}
        {brokenPreview && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-ink">
              {locale === "pl"
                ? "Podgląd wygląda na pusty (tylko Score). Możesz od razu wstawić działającą grę:"
                : "Preview looks empty (score only). Insert a working game now:"}
            </p>
            <Button
              type="button"
              size="m"
              disabled={busy}
              onClick={() => applyLocalPlayableFix()}
            >
              {locale === "pl" ? "Wstaw działającą grę" : "Insert working game"}
            </Button>
          </div>
        )}
      </div>

      {chatting && (
        <div className="rounded-xl border-2 border-brand/25 bg-gradient-to-b from-lilac/50 to-mint/20 p-4 md:p-5">
          <p className="text-sm font-bold text-ink-muted">
            {t("workshop.aiChatTitle")}
          </p>
          <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[90%] rounded-2xl px-4 py-3 text-[15px] leading-snug md:max-w-[80%]",
                    m.role === "user"
                      ? "rounded-br-md bg-brand text-on-brand"
                      : "rounded-bl-md border-2 border-border bg-surface text-ink shadow-[var(--shadow-1)]",
                  )}
                >
                  {m.role === "assistant" && (
                    <p className="mb-1 text-xs font-extrabold text-brand-strong">
                      Baiolo
                    </p>
                  )}
                  <p>{m.content}</p>
                </div>
              </div>
            ))}
            {busy && (phase === "chat" || phase === "build") && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border-2 border-border bg-surface px-4 py-3 text-sm text-ink-muted">
                  {busyLabel}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="mt-4 space-y-3">
            <DictationField value={reply} onChange={setReply}>
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!actionsLocked) void sendReply();
                  }
                }}
                disabled={actionsLocked}
                placeholder={t("workshop.aiChatPlaceholder")}
                className="min-h-12 w-full rounded-pill border-2 border-border bg-surface px-5 text-base focus:border-brand focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
            </DictationField>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="l"
                disabled={actionsLocked}
                onClick={() => void sendReply()}
              >
                {t("workshop.aiChatSend")}
              </Button>
              <Button
                type="button"
                size="l"
                variant="secondary"
                disabled={actionsLocked}
                onClick={() => void request({ action: "build" })}
              >
                {busy && phase === "build"
                  ? t("workshop.aiBuilding")
                  : t("workshop.aiBuildNow")}
              </Button>
            </div>
            <p className="text-sm text-ink-muted">{t("workshop.aiChatHint")}</p>
          </div>
        </div>
      )}

      {files && (
        <HtmlWorkshop
          ref={workshopRef}
          key={revision}
          files={files}
          onFilesChange={onFilesChange}
          showStarterPicker={false}
        />
      )}
    </div>
  );
}
