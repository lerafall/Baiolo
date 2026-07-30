"use client";

import Link from "next/link";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MiniSparkline } from "@/components/projects/MiniSparkline";
import { ProjectCardMenu } from "@/components/projects/ProjectCardMenu";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ProjectThumb } from "@/components/ui/ProjectThumb";
import { StatusBadge, StatusMessage } from "@/components/ui/StatusBadge";
import { summarizeLocalAiUsage, type AiUsageSummary } from "@/lib/ai-usage";
import { cn } from "@/lib/cn";
import { newDraftId } from "@/lib/draft";
import { useCreatorFeedback } from "@/lib/engagement";
import { formatCount, formatDateTime } from "@/lib/format";
import { useT } from "@/lib/i18n/LocaleProvider";
import type { ProjectSubmission } from "@/lib/moderation";
import {
  getPlayHistory,
  recordPlaySnapshot,
  summarizePlayTrend,
} from "@/lib/project-play-history";
import { useSession } from "@/lib/session";
import {
  canEditSubmission,
  canWithdrawSubmission,
  formatWaitingDuration,
  slaHintKey,
  stagesForStatus,
  waitingMs,
} from "@/lib/submission-timeline";
import { useSubmissions } from "@/lib/submissions";
import { isCatalogDemoId, isOwnedSubmission } from "@/lib/ownership";

type LiveSort = "newest" | "plays" | "reactions" | "title";
type LiveFilter = "all" | "published" | "draft" | "rejected";

function parseLiveFilter(raw: string | null): LiveFilter {
  if (raw === "published" || raw === "draft" || raw === "rejected" || raw === "all") {
    return raw;
  }
  return "all";
}

function CreatorTips({
  needsChanges,
  hasDraft,
  empty,
}: {
  needsChanges: number;
  hasDraft: boolean;
  empty: boolean;
}) {
  const t = useT();
  if (empty) {
    return (
      <div className="mt-8 rounded-xl bg-lilac/50 p-6 shadow-[var(--shadow-1)]">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-strong">
          {t("projects.tip")}
        </p>
        <p className="mt-2 text-xl font-extrabold">{t("projects.startTiny")}</p>
        <p className="mt-1 text-ink-muted">{t("projects.startTinyBody")}</p>
        <Button href="/create" className="mt-4">
          {t("projects.addProject")}
        </Button>
      </div>
    );
  }

  if (needsChanges > 0) {
    return (
      <div className="mt-8 rounded-xl bg-warning/20 p-6 shadow-[var(--shadow-1)]">
        <p className="text-sm font-bold uppercase tracking-wide text-ink">
          {t("projects.needsFix")}
        </p>
        <p className="mt-2 text-xl font-extrabold">
          {needsChanges === 1
            ? t("projects.oneWaiting")
            : t("projects.nWaiting", { count: needsChanges })}
        </p>
        <p className="mt-1 text-ink-muted">{t("projects.needsFixBody")}</p>
      </div>
    );
  }

  if (hasDraft) {
    return (
      <div className="mt-8 rounded-xl bg-mint/50 p-6 shadow-[var(--shadow-1)]">
        <p className="text-sm font-bold uppercase tracking-wide text-secondary-strong">
          {t("projects.keepGoing")}
        </p>
        <p className="mt-2 text-xl font-extrabold">{t("projects.draftWaiting")}</p>
        <p className="mt-1 text-ink-muted">{t("projects.draftWaitingBody")}</p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-xl bg-canvas p-6">
      <p className="text-ink-muted">
        {t("projects.wantNew")}{" "}
        <Link href="/create" className="font-bold text-brand-strong underline">
          {t("projects.startTinyLink")}
        </Link>
        .
      </p>
    </div>
  );
}

function activityBadge(
  p: ProjectSubmission,
  t: ReturnType<typeof useT>,
): { label: string; tone: string } | null {
  const ageMs = waitingMs(p.updatedAt);
  if (p.plays === 0 && ageMs < 3 * 24 * 60 * 60 * 1000) {
    return { label: t("projects.badgeNew"), tone: "bg-mint/50 text-secondary-strong" };
  }
  if (p.plays > 0 && p.plays < 10) {
    return {
      label: t("projects.badgeLowActivity"),
      tone: "bg-warning/25 text-ink",
    };
  }
  if (p.plays === 0) {
    return {
      label: t("projects.badgeShareHint"),
      tone: "bg-lilac/60 text-brand-strong",
    };
  }
  return null;
}

function MyProjectsPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items: allItems, ready, upsert, saveAll } = useSubmissions();
  const { session, ready: sessionReady } = useSession();
  const [aiUsage, setAiUsage] = useState<AiUsageSummary | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [liveSort, setLiveSort] = useState<LiveSort>("newest");
  const [liveFilter, setLiveFilter] = useState<LiveFilter>(() =>
    parseLiveFilter(searchParams.get("filter")),
  );
  const [deleteTarget, setDeleteTarget] = useState<ProjectSubmission | null>(
    null,
  );
  const [now, setNow] = useState(() => Date.now());

  const items = useMemo(() => {
    if (session.userId) {
      return allItems.filter((p) => isOwnedSubmission(p, session.userId));
    }
    return allItems.filter(
      (p) => !isCatalogDemoId(p.id) && (!p.ownerId || p.ownerId === "local"),
    );
  }, [allItems, session.userId]);

  useEffect(() => {
    const next = parseLiveFilter(searchParams.get("filter"));
    setLiveFilter(next);
  }, [searchParams]);

  function setFilterAndUrl(next: LiveFilter) {
    setLiveFilter(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("filter");
    else params.set("filter", next);
    const qs = params.toString();
    router.replace(qs ? `/projects?${qs}` : "/projects", { scroll: false });
  }

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    for (const p of items) {
      if (p.status === "published" || p.plays > 0) {
        recordPlaySnapshot(p.id, p.plays);
      }
    }
  }, [items]);

  const published = useMemo(
    () => items.filter((p) => p.status === "published"),
    [items],
  );
  const pipeline = useMemo(
    () => items.filter((p) => p.status !== "published"),
    [items],
  );
  const topThree = useMemo(
    () =>
      [...published]
        .sort((a, b) => b.plays + b.reactions - (a.plays + a.reactions))
        .slice(0, 3),
    [published],
  );
  const needsChanges = items.filter((p) => p.status === "needs_changes").length;
  const hasDraft = items.some((p) => p.status === "draft");
  const empty = useMemo(
    () => ready && items.length === 0,
    [ready, items.length],
  );
  const ownedIds = useMemo(() => items.map((p) => p.id), [items]);
  const { items: feedbackItems } = useCreatorFeedback(ownedIds);
  const titleById = useMemo(
    () => new Map(items.map((p) => [p.id, p.title])),
    [items],
  );
  const priorityReview =
    session.plan === "pro" || session.plan === "studio";

  useEffect(() => {
    if (!sessionReady) return;
    const localSummary = summarizeLocalAiUsage(
      session.plan,
      items.filter((item) => item.ownerId === session.userId || !session.userId),
    );
    setAiUsage(localSummary);

    if (!session.userId && !session.email) return;
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

  async function archiveAiSlot(project: ProjectSubmission) {
    setBusyId(project.id);
    try {
      const res = await fetch("/api/projects/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, id: project.id }),
      });
      const data = (await res.json()) as {
        project?: ProjectSubmission;
        error?: string;
      };
      if (!res.ok || !data.project) return;
      upsert(data.project);
      setAiUsage((prev) =>
        prev
          ? {
              ...prev,
              activeAiCount: Math.max(0, prev.activeAiCount - 1),
            }
          : prev,
      );
    } finally {
      setBusyId(null);
    }
  }

  async function withdraw(project: ProjectSubmission) {
    setBusyId(project.id);
    try {
      const res = await fetch("/api/projects/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, id: project.id }),
      });
      const data = (await res.json()) as {
        project?: ProjectSubmission;
        error?: string;
      };
      if (!res.ok || !data.project) return;
      upsert(data.project);
    } finally {
      setBusyId(null);
    }
  }

  function duplicate(project: ProjectSubmission) {
    const copy: ProjectSubmission = {
      ...project,
      id: newDraftId(),
      title: `${project.title || t("create.untitledDraft")} (copy)`,
      status: "draft",
      visibility: "private",
      plays: 0,
      reactions: 0,
      changeRequest: null,
      codeCheckedAt: null,
      playCheckedAt: null,
      playUrl: null,
      previewUrl: null,
      storagePath: null,
      aiSlotActive: false,
      sharedWith: [],
      updatedAt: new Date().toISOString(),
      ownerId: session.userId || project.ownerId,
    };
    upsert(copy);
    window.location.assign(`/create?edit=${encodeURIComponent(copy.id)}`);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setBusyId(id);
    try {
      const res = await fetch("/api/projects/owner-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok && res.status !== 404) {
        // still remove locally in mock / missing remote
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (data?.error && res.status !== 401) {
          /* keep going for mock */
        }
      }
      saveAll(items.filter((p) => p.id !== id));
      setDeleteTarget(null);
    } finally {
      setBusyId(null);
    }
  }

  function archiveOrWithdraw(project: ProjectSubmission) {
    if (project.sourceType === "ai_build" && project.aiSlotActive !== false) {
      void archiveAiSlot(project);
      return;
    }
    if (canWithdrawSubmission(project)) {
      void withdraw(project);
    }
  }

  const liveList = useMemo(() => {
    const list = items.filter((p) => {
      if (liveFilter === "published") return p.status === "published";
      if (liveFilter === "draft") return p.status === "draft";
      if (liveFilter === "rejected") return p.status === "rejected";
      // "all" keeps the classic live list (published) without duplicating drafts from pipeline
      return p.status === "published";
    });
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (liveSort === "plays") return b.plays - a.plays;
      if (liveSort === "reactions") return b.reactions - a.reactions;
      if (liveSort === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    });
    return sorted;
  }, [items, liveFilter, liveSort]);

  return (
    <>
      <SiteHeader showJoin={false} />
      <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold">{t("projects.title")}</h1>
            <p className="mt-2 text-lg text-ink-muted">{t("projects.sub")}</p>
          </div>
          <Button href="/create" size="l">
            {t("projects.addProject")}
          </Button>
          <Button href="/projects/analytics" size="l" variant="secondary">
            {t("analytics.open")}
          </Button>
        </div>

        <CreatorTips
          needsChanges={needsChanges}
          hasDraft={hasDraft}
          empty={empty}
        />

        {aiUsage && (
          <section className="mt-8 rounded-xl border-2 border-border bg-surface p-5 shadow-[var(--shadow-1)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-4 text-sm font-semibold text-ink-muted">
                <span>
                  {t("projects.aiProjectsSummary", {
                    active: aiUsage.activeAiCount,
                    limit:
                      aiUsage.activeAiLimit === Number.POSITIVE_INFINITY
                        ? "∞"
                        : aiUsage.activeAiLimit,
                  })}
                </span>
                <span>
                  {t("projects.aiGenerationsSummary", {
                    used: aiUsage.generationsUsed,
                    limit: aiUsage.generationsLimit,
                  })}
                </span>
              </div>
              {aiUsage.plan === "free" && (
                <Link
                  href="/pricing"
                  className="font-bold text-brand-strong underline"
                >
                  {t("projects.seePlans")}
                </Link>
              )}
            </div>
          </section>
        )}

        {topThree.length > 0 && (
          <section className="mt-8 rounded-xl bg-mint/50 p-6 shadow-[var(--shadow-1)]">
            <p className="text-sm font-bold uppercase tracking-wide text-secondary-strong">
              {t("projects.doingBest")}
            </p>
            <ul className="mt-4 space-y-4">
              {topThree.map((p, i) => {
                const trend = summarizePlayTrend(
                  getPlayHistory(p.id),
                  p.plays,
                );
                return (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface/80 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink-muted">
                        #{i + 1}
                      </p>
                      <p className="truncate text-xl font-extrabold">
                        {p.title}
                      </p>
                      <p className="text-sm text-ink-muted">
                        {t("projects.playsBack", {
                          plays: formatCount(p.plays),
                        })}
                        {trend.changePct !== null && (
                          <>
                            {" · "}
                            {t("projects.trendChange", {
                              pct: `${trend.changePct > 0 ? "+" : ""}${trend.changePct}`,
                            })}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-secondary-strong">
                      <MiniSparkline points={trend.points} />
                      <Button href={`/project/${p.id}`} size="m">
                        {t("projects.shareFriends")}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {feedbackItems.length > 0 && (
          <section className="mt-10 rounded-xl bg-lilac/40 p-6 shadow-[var(--shadow-1)]">
            <h2 className="text-2xl font-extrabold">
              {t("projects.notesForYou")}
            </h2>
            <p className="mt-1 text-ink-muted">{t("projects.notesSub")}</p>
            <ul className="mt-5 space-y-4">
              {feedbackItems.map((item) => (
                <li key={item.projectId}>
                  <p className="font-extrabold">
                    {titleById.get(item.projectId) ?? t("projects.yourProject")}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {item.notes.slice(-5).map((note, i) => (
                      <li
                        key={`${item.projectId}-${i}`}
                        className="rounded-lg bg-surface px-4 py-3 text-ink-muted shadow-[var(--shadow-1)]"
                      >
                        “{note}”
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/project/${item.projectId}`}
                    className="mt-2 inline-block text-sm font-bold text-brand-strong underline"
                  >
                    {t("projects.openProject")}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-12">
          <h2 className="text-2xl font-extrabold">
            {t("projects.submissionStatus")}
          </h2>
          <p className="mt-1 text-ink-muted">{t("projects.submissionSub")}</p>
          {!ready && (
            <p className="mt-6 text-ink-muted">{t("projects.loading")}</p>
          )}
          <ul className="mt-6 space-y-4">
            {pipeline.map((p) => {
              const open = expandedId === p.id;
              const stages = stagesForStatus(p.status);
              const wait = formatWaitingDuration(waitingMs(p.updatedAt, now));
              const sla = slaHintKey(p.status, priorityReview);
              return (
                <li
                  key={p.id}
                  className="rounded-xl bg-surface p-5 shadow-[var(--shadow-1)]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <ProjectThumb
                      src={p.thumbnail}
                      alt={p.title}
                      updatedAt={p.updatedAt}
                      className="h-20 w-full sm:w-28"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xl font-extrabold">
                          {p.title || t("create.untitledDraft")}
                        </p>
                        {p.sourceType === "ai_build" && (
                          <span className="rounded-pill bg-brand/10 px-3 py-1 text-xs font-extrabold text-brand-strong">
                            AI
                          </span>
                        )}
                        <StatusBadge status={p.status} />
                      </div>
                      <div className="mt-1">
                        <StatusMessage status={p.status} />
                      </div>
                      <p className="mt-2 text-sm font-semibold text-ink-muted">
                        {t("projects.submittedAt", {
                          when: formatDateTime(p.updatedAt),
                        })}
                        {" · "}
                        {t("projects.waitingFor", { duration: wait })}
                      </p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {t(`projects.sla.${sla}`)}
                      </p>
                      {p.changeRequest && (
                        <p className="mt-2 rounded-lg bg-warning/15 px-3 py-2 text-sm font-semibold">
                          {p.changeRequest}
                        </p>
                      )}
                      <button
                        type="button"
                        className="mt-3 text-sm font-bold text-brand-strong underline"
                        onClick={() =>
                          setExpandedId(open ? null : p.id)
                        }
                      >
                        {open
                          ? t("projects.hideTimeline")
                          : t("projects.showTimeline")}
                      </button>
                      {open && (
                        <ol className="mt-3 space-y-2">
                          {stages.map((stage, i) => (
                            <li
                              key={`${stage.name}-${i}`}
                              className={cn(
                                "rounded-lg border-2 px-3 py-2",
                                stage.ok
                                  ? "border-border bg-canvas/60"
                                  : "border-warning bg-warning/10",
                              )}
                            >
                              <p className="text-sm font-extrabold">
                                {stage.ok ? "✓" : "!"}{" "}
                                {t(`stage.${stage.name}`)}
                              </p>
                              <p className="text-xs text-ink-muted">
                                {stage.detail}
                              </p>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                    <div className="flex flex-wrap items-start gap-2">
                      {canEditSubmission(p) && (
                        <Button
                          href={`/create?edit=${encodeURIComponent(p.id)}`}
                          variant="secondary"
                        >
                          {t("projects.editSubmission")}
                        </Button>
                      )}
                      {canWithdrawSubmission(p) && (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busyId === p.id}
                          onClick={() => void withdraw(p)}
                        >
                          {t("projects.withdraw")}
                        </Button>
                      )}
                      {p.status !== "draft" &&
                        p.status !== "needs_changes" && (
                          <>
                            <Button href={`/play/${p.id}`}>
                              {t("projects.playPrivate")}
                            </Button>
                            <Button
                              href={`/project/${p.id}`}
                              variant="secondary"
                            >
                              {t("common.open")}
                            </Button>
                          </>
                        )}
                      <ProjectCardMenu
                        busy={busyId === p.id}
                        archiveLabel={
                          p.sourceType === "ai_build"
                            ? t("projects.archiveAi")
                            : t("projects.menuArchive")
                        }
                        onEdit={() => {
                          window.location.assign(
                            `/create?edit=${encodeURIComponent(p.id)}`,
                          );
                        }}
                        onDuplicate={() => duplicate(p)}
                        onArchive={() => archiveOrWithdraw(p)}
                        onDelete={() => setDeleteTarget(p)}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
            {ready && pipeline.length === 0 && !empty && (
              <li className="rounded-xl bg-lilac/40 px-5 py-8 text-center text-ink-muted">
                {t("projects.noInProgress")}{" "}
                <Link
                  href="/create"
                  className="font-bold text-brand-strong underline"
                >
                  {t("projects.addProject")}
                </Link>
                .
              </li>
            )}
          </ul>
        </section>

        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold">
                {t("projects.liveProjects")}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
                <span className="sr-only">{t("projects.sortBy")}</span>
                <select
                  className="rounded-xl border-2 border-border bg-surface px-3 py-2 font-bold text-ink"
                  value={liveSort}
                  onChange={(e) => setLiveSort(e.target.value as LiveSort)}
                >
                  <option value="newest">{t("projects.sortNewest")}</option>
                  <option value="plays">{t("projects.sortPlays")}</option>
                  <option value="reactions">
                    {t("projects.sortReactions")}
                  </option>
                  <option value="title">{t("projects.sortTitle")}</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
                <span className="sr-only">{t("projects.filterStatus")}</span>
                <select
                  className="rounded-xl border-2 border-border bg-surface px-3 py-2 font-bold text-ink"
                  value={liveFilter}
                  onChange={(e) =>
                    setFilterAndUrl(e.target.value as LiveFilter)
                  }
                >
                  <option value="all">{t("projects.filterAll")}</option>
                  <option value="published">
                    {t("projects.filterPublished")}
                  </option>
                  <option value="draft">{t("projects.filterDraft")}</option>
                  <option value="rejected">
                    {t("projects.filterRejected")}
                  </option>
                </select>
              </label>
            </div>
          </div>
          <ul className="mt-6 space-y-4">
            {liveList.map((p) => {
              const badge = activityBadge(p, t);
              const boostShare = p.plays < 10;
              return (
                <li
                  key={p.id}
                  className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-1)] sm:flex-row sm:items-center"
                >
                  <ProjectThumb
                    src={p.thumbnail}
                    alt={p.title}
                    updatedAt={p.updatedAt}
                    className="h-20 w-full sm:w-28"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xl font-extrabold">{p.title}</p>
                      {p.sourceType === "ai_build" && (
                        <span className="rounded-pill bg-brand/10 px-3 py-1 text-xs font-extrabold text-brand-strong">
                          AI
                        </span>
                      )}
                      <StatusBadge status={p.status} />
                      {badge && (
                        <span
                          className={cn(
                            "rounded-pill px-3 py-1 text-xs font-extrabold",
                            badge.tone,
                          )}
                        >
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <p className="text-ink-muted">
                      {t("projects.playsReactions", {
                        plays: formatCount(p.plays),
                        reactions: p.reactions,
                      })}
                    </p>
                    {boostShare && (
                      <p className="mt-1 text-sm font-semibold text-brand-strong">
                        {t("projects.shareHint")}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      href={`/project/${p.id}`}
                      className={cn(boostShare && "animate-share-pulse")}
                    >
                      {t("projects.sharePlay")}
                    </Button>
                    <Button href={`/project/${p.id}`} variant="secondary">
                      {t("common.open")}
                    </Button>
                    <ProjectCardMenu
                      busy={busyId === p.id}
                      archiveLabel={
                        p.sourceType === "ai_build"
                          ? t("projects.archiveAi")
                          : t("projects.menuArchive")
                      }
                      onEdit={() => {
                        window.location.assign(
                          `/create?edit=${encodeURIComponent(p.id)}`,
                        );
                      }}
                      onDuplicate={() => duplicate(p)}
                      onArchive={() => archiveOrWithdraw(p)}
                      onDelete={() => setDeleteTarget(p)}
                    />
                  </div>
                </li>
              );
            })}
            {ready && liveList.length === 0 && (
              <li className="rounded-xl bg-canvas px-5 py-6 text-ink-muted">
                {t("projects.nothingLive")}
              </li>
            )}
          </ul>
        </section>
      </main>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t("projects.deleteTitle")}
        body={t("projects.deleteBody", {
          title: deleteTarget?.title || t("create.untitledDraft"),
        })}
        confirmLabel={t("projects.menuDelete")}
        tone="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}

export default function MyProjectsPageEntry() {
  return (
    <Suspense
      fallback={
        <>
          <SiteHeader />
          <main className="mx-auto max-w-6xl px-5 py-16 text-ink-muted">
            …
          </main>
        </>
      }
    >
      <MyProjectsPage />
    </Suspense>
  );
}
