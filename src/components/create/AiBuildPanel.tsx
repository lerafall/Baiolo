"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DictationField } from "@/components/ui/DictationField";
import { HtmlWorkshop } from "@/components/create/HtmlWorkshop";
import { cn } from "@/lib/cn";
import { authHref } from "@/lib/next-path";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import type { StarterFiles } from "@/lib/html-starters";
import type { ProjectCategory } from "@/lib/types";
import type { AiPlan } from "@/lib/ai-quota";

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

  useEffect(() => {
    if (!signedIn) return;
    void (async () => {
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
    })();
  }, [signedIn, userId, email, activePlan]);

  useEffect(() => {
    setMessages([]);
    setReply("");
    setError("");
    setCategoryHint(null);
  }, [prompt]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);

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
    const trimmed = prompt.trim();
    if (trimmed.length < 12) {
      setError(t("workshop.aiPromptShort"));
      return;
    }

    const thread = options.nextMessages ?? messages;
    setBusy(true);
    setPhase(options.action === "build" ? "build" : "chat");
    try {
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
        setError(data.error || t("workshop.aiFailed"));
        return;
      }

      onBuilt({
        files: data.files,
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
    setMessages([]);
    setReply("");
    // Vague “fix it” with existing code → repair directly (sends files to the model).
    const wantsFix =
      /\b(fix|repair|broken|bug|nie\s*dzia[łl]a|popraw|napraw|nadal|still\s*not|doesn'?t\s*work|not\s*working)\b/i.test(
        prompt,
      );
    if (files?.["index.html"] && wantsFix) {
      await request({ action: "build", nextMessages: [] });
      return;
    }
    await request({ action: "chat", nextMessages: [] });
  }

  async function sendReply() {
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
    await request({ action: "chat", nextMessages });
  }

  const chatting = messages.length > 0;
  const busyLabel =
    phase === "chat" ? t("workshop.aiChatThinking") : t("workshop.aiBuilding");

  return (
    <div className="space-y-6">
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
              disabled={busy}
              placeholder={t("workshop.aiPromptPlaceholder")}
              className="w-full rounded-xl border-2 border-border p-4 text-lg focus:border-brand focus:outline-none disabled:opacity-60"
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
            disabled={busy}
            onClick={() => void startOrRebuild()}
          >
            {busy && !chatting
              ? busyLabel
              : files
                ? /\b(fix|repair|broken|bug|nie\s*dzia[łl]a|popraw|napraw|nadal|still\s*not|doesn'?t\s*work|not\s*working)\b/i.test(
                    prompt,
                  )
                  ? t("workshop.aiRepair")
                  : t("workshop.aiRebuild")
                : chatting
                  ? t("workshop.aiRestartChat")
                  : t("workshop.aiStartChat")}
          </Button>
          {quota && (
            <p className="text-sm font-semibold text-ink-muted">
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
          )}
          <p className="text-sm text-ink-muted">{t("workshop.aiHintPaid")}</p>
        </div>
        {error && (
          <p className="mt-3 font-semibold text-danger" role="alert">
            {error}
          </p>
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
            {busy && phase === "chat" && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border-2 border-border bg-surface px-4 py-3 text-sm text-ink-muted">
                  {t("workshop.aiChatThinking")}
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
                    if (!busy) void sendReply();
                  }
                }}
                disabled={busy}
                placeholder={t("workshop.aiChatPlaceholder")}
                className="min-h-12 w-full rounded-pill border-2 border-border bg-surface px-5 text-base focus:border-brand focus:outline-none disabled:opacity-60"
              />
            </DictationField>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="l"
                disabled={busy}
                onClick={() => void sendReply()}
              >
                {t("workshop.aiChatSend")}
              </Button>
              <Button
                type="button"
                size="l"
                variant="secondary"
                disabled={busy}
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
          key={revision}
          files={files}
          onFilesChange={onFilesChange}
          showStarterPicker={false}
        />
      )}
    </div>
  );
}
