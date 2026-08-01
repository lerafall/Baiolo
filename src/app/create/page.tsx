"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { FilterPill } from "@/components/ui/FilterPill";
import { cn } from "@/lib/cn";
import {
  buildPackageFromFile,
  buildPackageFromLabel,
  resolveDraftHint,
  clearDraft,
  emptyDraft,
  readDraft,
  THUMB_OPTIONS,
  writeDraft,
  type CreateDraft,
} from "@/lib/draft";
import type { ProjectSubmission, UploadType } from "@/lib/moderation";
import { isCatalogDemoId } from "@/lib/ownership";
import { useSession } from "@/lib/session";
import { useSubmissions } from "@/lib/submissions";
import type { ProjectCategory } from "@/lib/types";
import {
  defaultTagsForCategory,
  normalizeTag,
  suggestedTags,
} from "@/lib/data/projects";
import { thumbBackgroundStyle } from "@/lib/thumb-style";
import { useT } from "@/lib/i18n/LocaleProvider";
import { DictationField } from "@/components/ui/DictationField";
import {
  cloneStarterFiles,
  HTML_STARTERS,
  type StarterId,
} from "@/lib/html-starters";
import { zipWorkshopFiles } from "@/lib/workshop-zip";
import { readMockPlayFiles, saveMockPlayFiles } from "@/lib/mock-play";
import {
  summarizeLocalAiUsage,
  type AiUsageSummary,
} from "@/lib/ai-usage";

const HtmlWorkshop = dynamic(
  () =>
    import("@/components/create/HtmlWorkshop").then((m) => m.HtmlWorkshop),
  {
    ssr: false,
    loading: () => (
      <p className="text-ink-muted">Loading editor…</p>
    ),
  },
);

const AiBuildPanel = dynamic(
  () =>
    import("@/components/create/AiBuildPanel").then((m) => m.AiBuildPanel),
  {
    ssr: false,
    loading: () => <p className="text-ink-muted">Loading…</p>,
  },
);

function CreateWizard() {
  const t = useT();
  const router = useRouter();
  const search = useSearchParams();
  const editId = search.get("edit");
  const { upsert, items, ready: submissionsReady } = useSubmissions();
  const { session, ready: sessionReady } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const zipFileRef = useRef<File | null>(null);
  const hydratedOnce = useRef(false);

  const [draft, setDraft] = useState<CreateDraft>(emptyDraft);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [shareIntent, setShareIntent] = useState<"private" | "public">("private");
  const [aiUsage, setAiUsage] = useState<AiUsageSummary | null>(null);
  const steps = [
    t("create.stepChooseType"), t("create.stepAddContent"), t("create.stepTitleDesc"),
    t("create.stepCategoryTags"), t("create.stepThumbnail"), t("create.stepReview"),
    t("create.stepSubmit"),
  ];
  const uploadOptions: Array<{ id: UploadType; title: string; body: string }> = [
    { id: "zip", title: t("create.zipTitle"), body: t("create.zipBody") },
    { id: "link", title: t("create.linkTitle"), body: t("create.linkBody") },
    { id: "html", title: t("create.htmlTitle"), body: t("create.htmlBody") },
    { id: "ai", title: t("create.aiTitle"), body: t("create.aiBody") },
  ];

  useEffect(() => {
    if (!sessionReady) return;
    if (!session.userId && !session.email) return;

    const localSummary = summarizeLocalAiUsage(
      session.plan,
      items.filter((item) => item.ownerId === session.userId || !session.userId),
    );
    setAiUsage(localSummary);

    void (async () => {
      try {
        const res = await fetch("/api/account/ai-usage");
        if (!res.ok) return;
        const data = (await res.json()) as { summary?: AiUsageSummary };
        if (data.summary) setAiUsage(data.summary);
      } catch {
        /* keep local fallback */
      }
    })();
  }, [items, session.email, session.plan, session.userId, sessionReady]);

  const aiLocked = aiUsage
    ? aiUsage.generationsRemaining <= 0 ||
      aiUsage.activeAiCount >= aiUsage.activeAiLimit
    : false;
  const categories: Array<{ id: ProjectCategory; label: string }> = [
    { id: "game", label: t("explore.game") }, { id: "tool", label: t("explore.tool") },
    { id: "experiment", label: t("explore.experiment") }, { id: "demo", label: t("explore.demo") },
  ];
  const legacyTemplates = [
    { id: "Starter · Game", label: t("create.starterGame"), body: t("create.starterGameBody") },
    { id: "Starter · Tool", label: t("create.starterTool"), body: t("create.starterToolBody") },
    { id: "Starter · Experiment", label: t("create.starterExperiment"), body: t("create.starterExperimentBody") },
  ] as const;

  useEffect(() => {
    if (!submissionsReady || hydratedOnce.current) return;
    hydratedOnce.current = true;

    if (editId) {
      const sub = items.find((s) => s.id === editId);
      // Curated demos and other people's projects are readable here, but editing
      // one used to load its id into the draft and overwrite it on submit.
      const editable =
        sub &&
        !isCatalogDemoId(sub.id) &&
        (!sub.ownerId || !session.userId || sub.ownerId === session.userId);
      if (sub && editable) {
        const workshopFiles =
          sub.uploadType === "ai" || sub.uploadType === "html"
            ? readMockPlayFiles(sub.id)
            : null;
        const canEditCode = Boolean(workshopFiles?.["index.html"]);
        const loaded: CreateDraft = {
          id: sub.id,
          // Jump into the content editor so creators can tweak after playtesting.
          step:
            canEditCode || sub.status === "needs_changes"
              ? 1
              : sub.status === "draft"
                ? 0
                : 2,
          uploadType: sub.uploadType,
          sourceLabel: sub.sourceLabel,
          packageReady: true,
          title: sub.title,
          description: sub.description,
          category: sub.category,
          tags:
            sub.tags?.length > 0
              ? sub.tags
              : sub.category
                ? defaultTagsForCategory[sub.category]
                : [],
          thumb: sub.thumbnail || THUMB_OPTIONS[0],
          hints:
            sub.status === "needs_changes" && sub.changeRequest
              ? [sub.changeRequest]
              : [],
          workshopFiles: workshopFiles || undefined,
          workshopStarterId:
            sub.uploadType === "html"
              ? ((sub.category === "tool"
                  ? "tool"
                  : sub.category === "experiment"
                    ? "experiment"
                    : "game") as "game" | "tool" | "experiment")
              : undefined,
        };
        setDraft(loaded);
        writeDraft(loaded);
        setHydrated(true);
        return;
      }
    }

    setDraft(readDraft() ?? emptyDraft());
    setHydrated(true);
  }, [editId, items, submissionsReady, session.userId]);

  // Persist draft locally + mirror to My Projects (debounced — avoids render loops).
  useEffect(() => {
    if (!hydrated) return;

    writeDraft(draft);

    const flashTimer = window.setTimeout(() => {
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 900);
    }, 400);

    const upsertTimer = window.setTimeout(() => {
      if (!(draft.title.trim() || draft.sourceLabel.trim() || draft.uploadType)) {
        return;
      }
      // Editing an already-submitted project: keep local draft only until re-submit,
      // so we don't silently flip approved builds back to draft on every keystroke.
      const existing = editId
        ? items.find((s) => s.id === editId)
        : items.find((s) => s.id === draft.id);
      if (existing && existing.status !== "draft") {
        return;
      }
      upsert({
        id: draft.id,
        uploadType: draft.uploadType,
        sourceLabel: draft.sourceLabel,
        title: draft.title.trim() || t("create.untitledDraft"),
        description: draft.description,
        category: draft.category,
        tags: draft.tags,
        thumbnail: draft.thumb,
        status: "draft",
        risk: null,
        aiFlags: [],
        changeRequest: null,
        updatedAt: new Date().toISOString(),
        plays: 0,
        reactions: 0,
        sourceType:
          draft.uploadType === "ai"
            ? "ai_build"
            : draft.uploadType === "html"
              ? "html_starter"
              : undefined,
      });
    }, 500);

    return () => {
      window.clearTimeout(flashTimer);
      window.clearTimeout(upsertTimer);
    };
  }, [draft, hydrated, editId, items, t, upsert]);

  const progress = useMemo(
    () => ((draft.step + 1) / steps.length) * 100,
    [draft.step],
  );

  function patch(partial: Partial<CreateDraft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function toggleTag(tag: string) {
    const next = normalizeTag(tag);
    if (!next) return;
    setDraft((d) => {
      if (d.tags.includes(next)) {
        return { ...d, tags: d.tags.filter((t) => t !== next) };
      }
      if (d.tags.length >= 5) return d;
      return { ...d, tags: [...d.tags, next] };
    });
  }

  function addCustomTag() {
    const next = normalizeTag(tagInput);
    if (!next) return;
    toggleTag(next);
    setTagInput("");
  }

  function pickCategory(id: ProjectCategory) {
    setDraft((d) => {
      const seeded =
        d.tags.length === 0 ? defaultTagsForCategory[id] : d.tags;
      return { ...d, category: id, tags: seeded.slice(0, 5) };
    });
  }

  function applyFile(file: File) {
    zipFileRef.current = file;
    const result = buildPackageFromFile(file);
    setDraft((d) => ({
      ...d,
      sourceLabel: result.sourceLabel,
      packageReady: result.packageReady,
      fileSizeLabel: result.fileSizeLabel,
      hints: result.hints,
      title: d.title || result.suggestedTitle,
    }));
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function runPackagingHelper() {
    const result = buildPackageFromLabel(draft.sourceLabel);
    if (!result.packageReady) {
      setError(resolveDraftHint(result.hints[0] || "create.errAddFileFirst", t));
      return;
    }
    setError("");
    patch({
      sourceLabel: result.sourceLabel,
      packageReady: true,
      hints: result.hints,
    });
  }

  function tryAutoPackage(label: string) {
    const trimmed = label.trim();
    if (!trimmed) return;
    const result = buildPackageFromLabel(trimmed);
    if (!result.packageReady) return;
    setError("");
    patch({
      sourceLabel: result.sourceLabel,
      packageReady: true,
      hints: result.hints,
    });
  }

  const primaryLabel =
    draft.step === steps.length - 1
      ? submitting
        ? t("create.submitting")
        : t("create.submitForChecking")
      : t("create.continue");

  function renderActions(sticky = false) {
    return (
      <div
        className={cn(
          "flex flex-wrap gap-3",
          sticky && "w-full justify-stretch sm:justify-start",
        )}
      >
        {draft.step > 0 && (
          <Button
            type="button"
            variant="ghost"
            onClick={back}
            disabled={submitting}
            className={sticky ? "flex-1 sm:flex-none" : undefined}
          >
            {t("create.back")}
          </Button>
        )}
        <Button
          type="button"
          size="l"
          onClick={next}
          disabled={submitting}
          className={sticky ? "flex-[2] sm:flex-none" : undefined}
        >
          {primaryLabel}
        </Button>
      </div>
    );
  }

  function next() {
    setError("");
    const {
      step,
      uploadType,
      sourceLabel,
      packageReady,
      title,
      description,
      category,
    } = draft;

    if (step === 0 && !uploadType) {
      setError(t("create.errPickType"));
      return;
    }
    if (step === 1) {
      if (uploadType === "ai" || uploadType === "html") {
        if (!draft.workshopFiles?.["index.html"]?.trim()) {
          setError(
            uploadType === "ai"
              ? t("create.errAiBuild")
              : t("create.errWorkshop"),
          );
          return;
        }
      } else if (!sourceLabel.trim()) {
        setError(
          uploadType === "link"
            ? t("create.errPasteLink")
            : t("create.errAddFile"),
        );
        return;
      }
      if (uploadType === "link" && !/^https?:\/\//i.test(sourceLabel.trim())) {
        setError(t("create.errHttps"));
        return;
      }
      if (uploadType === "zip" && !packageReady) {
        setError(t("create.errPackage"));
        return;
      }
    }
    if (step === 2) {
      if (!title.trim()) {
        setError(t("create.errTitle"));
        return;
      }
      if (description.trim().length < 8) {
        setError(t("create.errDesc"));
        return;
      }
    }
    if (step === 3 && !category) {
      setError(t("create.errCategory"));
      return;
    }

    if (step >= steps.length - 1) {
      if (submitting) return;
      void (async () => {
        setSubmitting(true);
        try {
          let storagePath: string | null = null;
          if (uploadType === "zip" && zipFileRef.current) {
            const form = new FormData();
            form.append("file", zipFileRef.current);
            form.append("projectId", draft.id);
            form.append("ownerId", session.userId || "anon");
            const up = await fetch("/api/projects/upload", {
              method: "POST",
              body: form,
            });
            const upData = (await up.json()) as {
              storagePath?: string;
              error?: string;
              skipped?: boolean;
            };
            if (!up.ok && !upData.skipped) {
              setError(upData.error || t("create.errUpload"));
              return;
            }
            storagePath = upData.storagePath ?? null;
          } else if (
            (uploadType === "html" || uploadType === "ai") &&
            draft.workshopFiles
          ) {
            const blob = await zipWorkshopFiles(draft.workshopFiles);
            const file = new File([blob], `${draft.id}.zip`, {
              type: "application/zip",
            });
            const form = new FormData();
            form.append("file", file);
            form.append("projectId", draft.id);
            form.append("ownerId", session.userId || "anon");
            const up = await fetch("/api/projects/upload", {
              method: "POST",
              body: form,
            });
            const upData = (await up.json()) as {
              storagePath?: string;
              error?: string;
              skipped?: boolean;
            };
            if (!up.ok && !upData.skipped) {
              setError(upData.error || t("create.errUpload"));
              return;
            }
            storagePath = upData.storagePath ?? null;
          }

          const mockPreviewUrl =
            (uploadType === "html" || uploadType === "ai") &&
            draft.workshopFiles?.["index.html"]
              ? saveMockPlayFiles(draft.id, draft.workshopFiles)
              : null;

          const payload = {
            id: draft.id,
            uploadType,
            sourceLabel,
            title: title.trim(),
            description: description.trim(),
            category,
            tags: draft.tags,
            thumbnail: draft.thumb,
            ownerId: session.userId,
            storagePath,
            shareIntent,
            mockPreviewUrl,
            playUrl:
              uploadType === "link" ? sourceLabel.trim() : null,
          };
          const res = await fetch("/api/projects/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = (await res.json()) as {
            submission?: ProjectSubmission;
            stages?: Array<{ name: string; ok: boolean; detail: string }>;
            error?: string;
            fallback?: {
              submission: ProjectSubmission;
              stages?: Array<{ name: string; ok: boolean; detail: string }>;
            };
          };
          const submission = data.submission ?? data.fallback?.submission;
          if (!submission) {
            setError(data.error || t("create.errSubmit"));
            return;
          }
          const prior = items.find((s) => s.id === draft.id);
          const stages = data.stages ?? data.fallback?.stages ?? [];
          sessionStorage.setItem(
            "baiolo.last-pipeline-stages",
            JSON.stringify(stages),
          );
          upsert({
            ...submission,
            plays: prior?.plays ?? submission.plays,
            reactions: prior?.reactions ?? submission.reactions,
            aiSlotActive:
              submission.sourceType === "ai_build" || submission.uploadType === "ai"
                ? true
                : submission.aiSlotActive,
          });
          clearDraft();
          zipFileRef.current = null;
          router.push(`/create/submitted?id=${encodeURIComponent(draft.id)}`);
        } catch {
          setError(t("create.errSubmit"));
        } finally {
          setSubmitting(false);
        }
      })();
      return;
    }

    patch({ step: step + 1 });
  }

  function back() {
    setError("");
    patch({ step: Math.max(0, draft.step - 1) });
  }

  const signedIn = sessionReady && Boolean(session.userId || session.email);

  return (
    <>
      <SiteHeader showJoin={false} />
      <main className="mx-auto w-full max-w-2xl px-5 py-10 pb-36 md:px-8 md:pb-10">
        {!signedIn && sessionReady && (
          <div className="mb-6 rounded-xl bg-lilac/50 px-5 py-4 text-sm text-ink">
            <span className="font-bold">{t("projects.tip")}: </span>
            {t("create.tipBody")}{" "}
            <a href="/auth?next=%2Fcreate" className="font-bold text-brand-strong underline">
              {t("nav.join")}
            </a>{" "}
            {t("create.tipAfter")}
          </div>
        )}

        <div className="mb-6 rounded-xl bg-mint/40 px-5 py-4 text-sm text-ink">
          <span className="font-bold">{t("create.newHerePrefix")} </span>
          {t("create.newHereBody")}{" "}
          <a href="/make" className="font-bold text-brand-strong underline">
            {t("create.newHereLink")}
          </a>
          .
        </div>

        {editId && (
          <div className="mb-6 rounded-xl border-2 border-brand/25 bg-lilac/40 px-5 py-4 text-sm text-ink">
            <p className="font-extrabold">{t("create.editingExisting")}</p>
            <p className="mt-1 text-ink-muted">{t("create.editingExistingBody")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="m"
                onClick={() => {
                  if (draft.workshopFiles?.["index.html"]) {
                    saveMockPlayFiles(editId, draft.workshopFiles);
                  }
                  window.location.assign(`/play/${encodeURIComponent(editId)}`);
                }}
              >
                {t("create.testPlayAgain")}
              </Button>
              <Button
                href={`/project/${encodeURIComponent(editId)}`}
                size="m"
                variant="secondary"
              >
                {t("create.openProjectPage")}
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-ink-muted">
              {t("create.stepOf", { current: draft.step + 1, total: steps.length })}
            </p>
            <h1 className="mt-2 text-4xl font-extrabold">
              {steps[draft.step]}
            </h1>
          </div>
          <p
            className={cn(
              "text-sm font-bold text-ink-muted transition-opacity",
              savedFlash ? "opacity-100" : "opacity-40",
            )}
            aria-live="polite"
          >
            {t("create.draftSaved")}
          </p>
        </div>

        <div
          className="mt-6 h-3 overflow-hidden rounded-pill bg-lilac"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={draft.step + 1}
        >
          <div
            className="h-full rounded-pill bg-brand transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-10 rounded-xl bg-surface p-6 shadow-[var(--shadow-1)] md:p-8">
          {draft.step === 0 && (
            <div className="space-y-3">
              <p className="text-ink-muted">
                {t("create.chooseWay")}
              </p>
              {uploadOptions.map((opt) => {
                const locked = opt.id === "ai" && aiLocked;
                if (locked && aiUsage) {
                  return (
                    <div
                      key={opt.id}
                      className="w-full rounded-xl border-2 border-border bg-canvas p-5 text-left opacity-90"
                      title={t("create.aiLockedHint", {
                        date: aiUsage.nextPeriodStart,
                      })}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xl font-extrabold">
                            {opt.title} 🔒
                          </p>
                          <p className="mt-1 text-ink-muted">{opt.body}</p>
                        </div>
                        <span className="rounded-pill bg-brand/10 px-3 py-1 text-sm font-bold text-brand-strong">
                          {t("create.aiUsageBadge", {
                            remaining: aiUsage.generationsRemaining,
                            limit: aiUsage.generationsLimit,
                          })}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-ink-muted">
                        {t("create.aiUsageMeta", {
                          used: aiUsage.generationsUsed,
                          limit: aiUsage.generationsLimit,
                          active: aiUsage.activeAiCount,
                          activeLimit:
                            aiUsage.activeAiLimit === Number.POSITIVE_INFINITY
                              ? "∞"
                              : aiUsage.activeAiLimit,
                        })}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <Button href="/pricing" size="l">
                          {t("create.upgradePlan")}
                        </Button>
                        <p className="text-sm text-ink-muted">
                          {t("create.aiLockedHint", {
                            date: aiUsage.nextPeriodStart,
                          })}
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    if (opt.id === "html") {
                      const starterId: StarterId = "game";
                      const starter = HTML_STARTERS[starterId];
                      patch({
                        uploadType: "html",
                        packageReady: true,
                        sourceLabel: `html-starter-${starterId}`,
                        workshopStarterId: starterId,
                        workshopFiles: cloneStarterFiles(starterId),
                        title: draft.title || starter.suggestedTitle,
                        description:
                          draft.description || starter.suggestedDescription,
                        category: draft.category || starter.category,
                        hints: [],
                      });
                      return;
                    }
                    if (opt.id === "ai") {
                      patch({
                        uploadType: "ai",
                        packageReady: false,
                        sourceLabel: "",
                        workshopFiles: undefined,
                        workshopStarterId: undefined,
                        hints: [],
                      });
                      return;
                    }
                    patch({
                      uploadType: opt.id,
                      packageReady: opt.id !== "zip",
                      sourceLabel:
                        opt.id === "template" ? legacyTemplates[0].id : "",
                      workshopFiles: undefined,
                      workshopStarterId: undefined,
                      hints: [],
                    });
                  }}
                  className={cn(
                    "w-full rounded-xl border-2 bg-surface p-5 text-left transition-all",
                    draft.uploadType === opt.id
                      ? "border-brand bg-lilac/40 shadow-[var(--shadow-1)]"
                      : "border-border hover:border-border-strong",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xl font-extrabold">{opt.title}</p>
                      <p className="mt-1 text-ink-muted">{opt.body}</p>
                    </div>
                    {opt.id === "ai" && aiUsage && (
                      <span className="rounded-pill bg-brand/10 px-3 py-1 text-sm font-bold text-brand-strong">
                        {t("create.aiUsageBadge", {
                          remaining: aiUsage.generationsRemaining,
                          limit: aiUsage.generationsLimit,
                        })}
                      </span>
                    )}
                  </div>
                  {opt.id === "ai" && aiUsage && (
                    <p className="mt-3 text-sm text-ink-muted">
                      {t("create.aiUsageMeta", {
                        used: aiUsage.generationsUsed,
                        limit: aiUsage.generationsLimit,
                        active: aiUsage.activeAiCount,
                        activeLimit:
                          aiUsage.activeAiLimit === Number.POSITIVE_INFINITY
                            ? "∞"
                            : aiUsage.activeAiLimit,
                      })}
                    </p>
                  )}
                </button>
                );
              })}
            </div>
          )}

          {draft.step === 1 && draft.uploadType === "zip" && (
            <div>
              <p className="text-lg font-bold">{t("create.addFiles")}</p>
              <p className="mt-1 text-ink-muted">
                {t("create.addFilesSub")}
              </p>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) applyFile(file);
                }}
                className={cn(
                  "mt-4 flex min-h-36 flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
                  draft.packageReady && draft.sourceLabel
                    ? "border-brand bg-lilac/30"
                    : dragOver
                      ? "border-brand bg-lilac/40"
                      : "border-border bg-canvas",
                )}
              >
                {draft.packageReady && draft.sourceLabel ? (
                  <>
                    <p className="font-bold text-ink">{t("create.packageReady")}</p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {draft.sourceLabel}
                      {draft.fileSizeLabel ? ` · ${draft.fileSizeLabel}` : ""}
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-4"
                      onClick={() => fileRef.current?.click()}
                    >
                      {t("create.chooseAnotherZip")}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-ink">{t("create.dropZip")}</p>
                    <p className="mt-1 text-sm text-ink-muted">{t("create.orChooseFile")}</p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-4"
                      onClick={() => fileRef.current?.click()}
                    >
                      {t("create.chooseZip")}
                    </Button>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) applyFile(file);
                  }}
                />
              </div>

              <p className="mt-4 text-sm font-bold text-ink-muted">
                {t("create.orTypeName")}
              </p>
              <DictationField
                className="mt-2"
                value={draft.sourceLabel}
                append={false}
                onChange={(sourceLabel) =>
                  patch({
                    sourceLabel,
                    packageReady: false,
                    hints: [],
                  })
                }
              >
                <input
                  value={draft.sourceLabel}
                  onChange={(e) =>
                    patch({
                      sourceLabel: e.target.value,
                      packageReady: false,
                      hints: [],
                    })
                  }
                  onBlur={() => tryAutoPackage(draft.sourceLabel)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      tryAutoPackage(draft.sourceLabel);
                    }
                  }}
                  placeholder="my-fun-game.zip or my-folder"
                  className="min-h-14 w-full rounded-pill border-2 border-border px-5 text-lg focus:border-brand focus:outline-none"
                />
              </DictationField>
              <Button
                type="button"
                variant="secondary"
                className="mt-4"
                onClick={runPackagingHelper}
              >
                {t("create.buildPackage")}
              </Button>
              <ul className="mt-4 space-y-1 text-sm text-ink-muted">
                <li>• {t("create.tipZip")}</li>
                <li>• {t("create.tipStartFile")}</li>
                <li>• {t("create.tipLight")}</li>
              </ul>
              {draft.fileSizeLabel && (
                <p className="mt-3 text-sm text-ink-muted">
                  {t("create.fileSize", { size: draft.fileSizeLabel })}
                </p>
              )}
              {draft.sourceLabel.trim() && !draft.packageReady && (
                <div className="mt-4 rounded-lg bg-warning/15 px-4 py-3">
                  <p className="font-bold text-ink">{t("create.almostReady")}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {t("create.almostReadyBody")}
                  </p>
                </div>
              )}
              {draft.packageReady && (
                <div className="mt-4 space-y-2 rounded-lg bg-mint/50 px-4 py-3">
                  <p className="font-bold text-secondary-strong">
                    {t("create.packageReadyMsg")}
                  </p>
                  {(draft.hints ?? []).map((h) => (
                    <p key={h} className="text-sm text-ink-muted">
                      {resolveDraftHint(h, t)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {draft.step === 1 && draft.uploadType === "link" && (
            <label className="block">
              <span className="text-lg font-bold">{t("create.pasteLink")}</span>
              <p className="mt-1 text-ink-muted">
                {t("create.pasteLinkSub")}
              </p>
              <DictationField
                className="mt-4"
                value={draft.sourceLabel}
                onChange={(sourceLabel) => patch({ sourceLabel })}
                append={false}
              >
                <input
                  value={draft.sourceLabel}
                  onChange={(e) => patch({ sourceLabel: e.target.value })}
                  placeholder="https://..."
                  className="min-h-14 w-full rounded-pill border-2 border-border px-5 text-lg focus:border-brand focus:outline-none"
                />
              </DictationField>
            </label>
          )}

          {draft.step === 1 && draft.uploadType === "html" && (
            <HtmlWorkshop
              starterId={draft.workshopStarterId || "game"}
              files={
                draft.workshopFiles ||
                cloneStarterFiles(draft.workshopStarterId || "game")
              }
              onStarterChange={(id) => {
                const starter = HTML_STARTERS[id];
                patch({
                  workshopStarterId: id,
                  workshopFiles: cloneStarterFiles(id),
                  sourceLabel: `html-starter-${id}`,
                  packageReady: true,
                  title: draft.title || starter.suggestedTitle,
                  description:
                    draft.description || starter.suggestedDescription,
                  category: draft.category || starter.category,
                });
              }}
              onFilesChange={(files) => {
                patch({
                  workshopFiles: files,
                  packageReady: Boolean(files["index.html"]?.trim()),
                  sourceLabel: `html-starter-${draft.workshopStarterId || "game"}`,
                });
                if (editId && files["index.html"]?.trim()) {
                  saveMockPlayFiles(editId, files);
                }
              }}
            />
          )}

          {draft.step === 1 && draft.uploadType === "ai" && (
            <AiBuildPanel
              signedIn={
                sessionReady && Boolean(session.userId || session.email)
              }
              userId={session.userId}
              email={session.email}
              plan={session.plan}
              prompt={draft.sourceLabel}
              files={draft.workshopFiles}
              onPromptChange={(sourceLabel) => patch({ sourceLabel })}
              onBuilt={({ files, title, description, category }) => {
                patch({
                  workshopFiles: files,
                  packageReady: true,
                  sourceLabel: draft.sourceLabel.trim() || title,
                  title: draft.title || title,
                  description: draft.description || description,
                  category: draft.category || category,
                  hints: [],
                });
                if (editId) saveMockPlayFiles(editId, files);
              }}
              onFilesChange={(workshopFiles) => {
                patch({
                  workshopFiles,
                  packageReady: Boolean(workshopFiles["index.html"]?.trim()),
                });
                if (editId && workshopFiles["index.html"]?.trim()) {
                  saveMockPlayFiles(editId, workshopFiles);
                }
              }}
            />
          )}

          {draft.step === 1 && draft.uploadType === "template" && (
            <div>
              <p className="text-lg font-bold">{t("create.pickStarter")}</p>
              <p className="mt-1 text-ink-muted">
                {t("create.pickStarterSub")}
              </p>
              <div className="mt-4 space-y-3">
                {legacyTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() =>
                      patch({
                        sourceLabel: template.id,
                        packageReady: true,
                      })
                    }
                    className={cn(
                      "w-full rounded-xl border-2 bg-surface p-5 text-left transition-all",
                      draft.sourceLabel === template.id
                        ? "border-brand bg-lilac/40 shadow-[var(--shadow-1)]"
                        : "border-border hover:border-border-strong",
                    )}
                  >
                    <p className="text-xl font-extrabold">{template.label}</p>
                    <p className="mt-1 text-ink-muted">{template.body}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {draft.step === 2 && (
            <div className="space-y-5">
              <label className="block">
                <span className="text-lg font-bold">{t("create.title")}</span>
                <DictationField
                  className="mt-2"
                  value={draft.title}
                  onChange={(title) => patch({ title })}
                >
                  <input
                    value={draft.title}
                    onChange={(e) => patch({ title: e.target.value })}
                    placeholder="Cloud Hopper"
                    className="min-h-14 w-full rounded-pill border-2 border-border px-5 text-lg focus:border-brand focus:outline-none"
                  />
                </DictationField>
              </label>
              <label className="block">
                <span className="text-lg font-bold">{t("create.shortDesc")}</span>
                <DictationField
                  className="mt-2"
                  value={draft.description}
                  onChange={(description) => patch({ description })}
                >
                  <textarea
                    value={draft.description}
                    onChange={(e) => patch({ description: e.target.value })}
                    rows={4}
                    placeholder="A tiny platformer where you bounce on soft clouds."
                    className="w-full rounded-lg border-2 border-border p-4 text-base focus:border-brand focus:outline-none"
                  />
                </DictationField>
              </label>
            </div>
          )}

          {draft.step === 3 && (
            <div>
              <p className="text-lg font-bold">{t("create.whatKind")}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <FilterPill
                    key={c.id}
                    label={c.label}
                    active={draft.category === c.id}
                    onClick={() => pickCategory(c.id)}
                  />
                ))}
              </div>

              <p className="mt-8 text-lg font-bold">{t("create.addTags")}</p>
              <p className="mt-1 text-ink-muted">
                {t("create.addTagsSub")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  ...(draft.category
                    ? defaultTagsForCategory[draft.category]
                    : []),
                  ...suggestedTags,
                ]
                  .filter((t, i, arr) => arr.indexOf(t) === i)
                  .map((t) => (
                    <FilterPill
                      key={t}
                      label={t}
                      active={draft.tags.includes(t)}
                      onClick={() => toggleTag(t)}
                    />
                  ))}
              </div>
              <div className="mt-4 flex flex-wrap items-start gap-2">
                <DictationField
                  className="min-w-0 flex-1"
                  value={tagInput}
                  onChange={setTagInput}
                  append={false}
                >
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomTag();
                      }
                    }}
                    placeholder={t("create.ownTag")}
                    maxLength={24}
                    className="min-h-12 w-full rounded-pill border-2 border-border bg-surface px-5 text-ink placeholder:text-placeholder focus:border-brand focus:outline-none"
                  />
                </DictationField>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addCustomTag}
                  disabled={!tagInput.trim() || draft.tags.length >= 5}
                >
                  {t("create.addTag")}
                </Button>
              </div>
              {draft.tags.length > 0 && (
                <p className="mt-3 text-sm font-semibold text-ink-muted">
                  {t("create.selected", { tags: draft.tags.join(" · ") })}
                </p>
              )}
            </div>
          )}

          {draft.step === 4 && (
            <div>
              <p className="text-lg font-bold">{t("create.addScreenshot")}</p>
              <p className="mt-1 text-ink-muted">
                {t("create.addScreenshotSub")}
              </p>
              <label className="mt-5 block">
                <span className="text-sm font-bold text-ink-muted">
                  {t("create.uploadScreenshot")}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 block w-full text-sm text-ink-muted file:mr-3 file:rounded-pill file:border-0 file:bg-brand file:px-4 file:py-2 file:font-bold file:text-on-brand"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2_500_000) {
                      setError(t("create.imageBig"));
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === "string") {
                        patch({ thumb: reader.result });
                        setError("");
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              {draft.thumb.startsWith("data:") || draft.thumb.startsWith("/") ? (
                <div
                  className="mt-4 aspect-[4/3] rounded-lg border-4 border-brand bg-cover bg-center"
                  style={{ backgroundImage: `url(${draft.thumb})` }}
                  role="img"
                  aria-label={t("create.screenshotPreview")}
                />
              ) : null}
              <p className="mt-5 text-sm font-bold text-ink-muted">
                {t("create.orColorVibe")}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {THUMB_OPTIONS.map((thumb) => (
                  <button
                    key={thumb}
                    type="button"
                    onClick={() => patch({ thumb })}
                    className={cn(
                      "aspect-[4/3] rounded-lg border-4 transition-transform hover:scale-[1.02]",
                      draft.thumb === thumb ? "border-brand" : "border-transparent",
                    )}
                    style={{ background: thumb }}
                    aria-label={t("create.chooseVibe")}
                  />
                ))}
              </div>
            </div>
          )}

          {draft.step === 5 && (
            <div>
              <p className="text-lg font-bold">{t("create.lookRight")}</p>
              <p className="mt-1 text-ink-muted">
                {t("create.lookRightSub")}
              </p>
              {(draft.hints ?? []).length > 0 && (
                <div className="mt-4 rounded-lg bg-warning/15 px-4 py-3 text-sm font-semibold">
                  {resolveDraftHint(draft.hints![0], t)}
                </div>
              )}
              <div className="mt-6 overflow-hidden rounded-xl border border-border shadow-[var(--shadow-1)]">
                <div
                  className="aspect-[4/3] bg-cover bg-center"
                  style={thumbBackgroundStyle(draft.thumb)}
                />
                <div className="p-5">
                  <p className="text-xl font-extrabold">
                    {draft.title || t("create.untitledIdea")}
                  </p>
                  <p className="mt-1 text-sm capitalize text-ink-muted">
                    {draft.category ? t(`explore.${draft.category}`) : t("create.uncategorized")} ·{" "}
                    {draft.uploadType || t("create.zipTitle")}
                  </p>
                  {draft.tags.length > 0 && (
                    <p className="mt-2 text-sm font-semibold text-brand-strong">
                      {draft.tags.join(" · ")}
                    </p>
                  )}
                  <p className="mt-3 text-ink-muted">
                    {draft.description || t("create.noDescription")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {draft.step === 6 && (
            <div>
              <p className="text-lg font-bold">{t("create.submitTitle")}</p>
              <p className="mt-2 text-ink-muted">
                {t("create.submitBody")}
              </p>
              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  onClick={() => setShareIntent("private")}
                  className={cn(
                    "w-full rounded-xl border-2 p-4 text-left",
                    shareIntent === "private"
                      ? "border-brand bg-lilac/40"
                      : "border-border",
                  )}
                >
                  <p className="font-extrabold">{t("create.intentPrivate")}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {t("create.intentPrivateBody")}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setShareIntent("public")}
                  className={cn(
                    "w-full rounded-xl border-2 p-4 text-left",
                    shareIntent === "public"
                      ? "border-brand bg-lilac/40"
                      : "border-border",
                  )}
                >
                  <p className="font-extrabold">{t("create.intentPublic")}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {t("create.intentPublicBody")}
                  </p>
                </button>
              </div>
              <ul className="mt-5 space-y-2 text-ink-muted">
                <li>• {t("create.check1")}</li>
                <li>• {t("create.check2")}</li>
                <li>• {t("create.check3")}</li>
              </ul>
            </div>
          )}

          {error && (
            <p className="mt-5 rounded-lg bg-danger/10 px-4 py-3 font-semibold text-danger">
              {error}
            </p>
          )}

          <div className="mt-8 hidden md:block">{renderActions()}</div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[var(--shadow-2)] backdrop-blur md:hidden">
        <div className="mx-auto max-w-2xl">
          {error && (
            <p className="mb-2 line-clamp-2 text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          {renderActions(true)}
        </div>
      </div>
    </>
  );
}

export default function CreatePage() {
  const t = useT();
  return (
    <Suspense
      fallback={
        <>
          <SiteHeader showJoin={false} />
          <main className="mx-auto max-w-2xl px-5 py-16 text-ink-muted">
            {t("create.loadingCreator")}
          </main>
        </>
      }
    >
      <CreateWizard />
    </Suspense>
  );
}
