"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthGateCard } from "@/components/auth/AuthGateCard";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ShareProjectPanel } from "@/components/share/ShareProjectPanel";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { ReactionChip } from "@/components/ui/ReactionChip";
import {
  getProject,
  getSimilarProjects,
  projects as catalog,
} from "@/lib/data/projects";
import { useRequireAuth } from "@/lib/auth-gate";
import { useT } from "@/lib/i18n/LocaleProvider";
import { useSyncedEngagement } from "@/lib/synced-engagement";
import { reportReasons, type ReportReason } from "@/lib/report-reasons";
import { addContentReport } from "@/lib/reports";
import { useFavorites } from "@/lib/favorites";
import { useToast } from "@/components/ui/Toast";
import { DictationField } from "@/components/ui/DictationField";
import { submissionToOwnerProject, submissionToProject } from "@/lib/project-map";
import { useSubmissions } from "@/lib/submissions";
import { useSession } from "@/lib/session";
import { OwnerShareControls } from "@/components/project/OwnerShareControls";
import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";
import { thumbBackgroundStyle } from "@/lib/thumb-style";
import type { Project, ReactionKind } from "@/lib/types";
import type { ProjectSubmission } from "@/lib/moderation";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { items, ready, upsert } = useSubmissions();
  const { session } = useSession();
  const engagement = useSyncedEngagement(id);
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const { requireAuth, signedIn } = useRequireAuth(`/project/${id}`);
  const { push } = useToast();
  const t = useT();
  const [feedback, setFeedback] = useState("");
  const [playing, setPlaying] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("unsafe");

  const ownedSubmission = useMemo(
    () => items.find((s) => s.id === id) ?? null,
    [id, items],
  );

  const isOwner = Boolean(
    ownedSubmission &&
      (ownedSubmission.ownerId
        ? ownedSubmission.ownerId === session.userId ||
          ownedSubmission.ownerId === "local" ||
          ownedSubmission.ownerId === "anon"
        : true),
  );

  const project = useMemo(() => {
    const fromCatalog = getProject(id);
    if (fromCatalog) return { project: fromCatalog, privateOwner: false as const };
    const published = items.find((s) => s.id === id && s.status === "published");
    if (published) {
      const mapped = submissionToProject(published, session.name || "You");
      if (mapped) return { project: mapped, privateOwner: false as const };
    }
    if (isOwner && ownedSubmission) {
      const mapped = submissionToOwnerProject(
        ownedSubmission,
        session.name || "You",
      );
      if (mapped) return { project: mapped, privateOwner: true as const };
    }
    return null;
  }, [id, items, isOwner, ownedSubmission, session.name]);

  const pendingOther = useMemo(() => {
    if (project) return null;
    return items.find((s) => s.id === id && s.status !== "published") ?? null;
  }, [id, items, project]);

  const feed = useMemo(() => {
    const fromSubs = items
      .map((s) => submissionToProject(s))
      .filter((p): p is Project => Boolean(p));
    const byId = new Map(catalog.map((p) => [p.id, p]));
    for (const p of fromSubs) byId.set(p.id, p);
    return Array.from(byId.values());
  }, [items]);

  const similar = useMemo(() => {
    if (!project) return [];
    return getSimilarProjects(project.project, feed);
  }, [project, feed]);

  if (ready && !project && !pendingOther) notFound();
  if (!ready || (!project && !pendingOther)) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-5 py-16 text-ink-muted">
          Loading project…
        </main>
      </>
    );
  }

  if (pendingOther && !project) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-5 py-16 text-center">
          <h1 className="text-3xl font-extrabold">{pendingOther.title}</h1>
          <p className="mt-3 text-lg text-ink-muted">
            {t("project.notPublic")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button href="/explore" size="l">
              {t("nav.explore")}
            </Button>
          </div>
        </main>
      </>
    );
  }

  if (!project) notFound();

  const live = project.project;
  const isPrivateOwnerView = project.privateOwner;
  const isPublic = !isPrivateOwnerView;

  const playUrl = live.playUrl;
  const external =
    playUrl.startsWith("http://") || playUrl.startsWith("https://");

  const counts = { ...live.reactions };

  function toggle(kind: ReactionKind) {
    requireAuth(() => {
      const next = engagement.reaction === kind ? null : kind;
      engagement.setReaction(next);
      if (next) push(t("project.reactionSaved"));
    });
  }

  function startPlay() {
    requireAuth(() => {
      window.location.href = `/play/${live.id}`;
    });
  }

  // Canonical counters live on the submission / catalog project (synced-engagement bumps them).
  // Do not add localPlays again — that double-counted plays vs /projects and /explore.
  const totalPlays = live.plays;
  const totalReactionCount =
    counts.fun + counts.interesting + counts["would-use-again"];

  const coverStyle = thumbBackgroundStyle(live.cover);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8">
        <p className="text-sm font-bold uppercase tracking-wide text-ink-muted">
          {t("projectMeta.byCreator", {
            category: t(`explore.${live.category}`),
            creator: live.creator,
          })}
        </p>
        <h1 className="mt-2 text-4xl font-extrabold text-ink md:text-5xl">
          {live.title}
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-muted">{live.tagline}</p>
        {isPrivateOwnerView && (
          <p className="mt-3 max-w-2xl rounded-xl border-2 border-brand/25 bg-lilac/40 px-4 py-3 text-sm font-semibold text-ink">
            {t("project.privateOwnerNote")}
          </p>
        )}
        {live.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {live.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-pill bg-lilac/60 px-3 py-1 text-sm font-bold text-brand-strong"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button size="m" onClick={startPlay}>
            {signedIn ? t("project.tapToPlay") : t("project.joinToPlay")}
          </Button>
          {isOwner && (
            <Button
              href={`/create?edit=${encodeURIComponent(live.id)}`}
              size="m"
              variant="secondary"
            >
              {t("project.editAgain")}
            </Button>
          )}
          <Button
            size="m"
            variant="ghost"
            aria-pressed={isFavorite(live.id)}
            className={cn(
              isFavorite(live.id) && "text-accent-coral",
            )}
            onClick={() => {
              requireAuth(() => {
                const on = toggleFavorite(live.id);
                push(on ? t("card.savedToast") : t("card.removedToast"));
              });
            }}
          >
            {isFavorite(live.id) ? t("project.saved") : t("project.save")}
          </Button>
        </div>

        <ShareProjectPanel
          className="mt-8"
          projectId={live.id}
          title={live.title}
          tagline={live.tagline}
          emphasis="hero"
          publicShare={isPublic}
        />

        {isPrivateOwnerView && ownedSubmission && (
          <OwnerShareControls
            project={ownedSubmission}
            onUpdated={(next: ProjectSubmission) => upsert(next)}
          />
        )}

        <div
          className="relative mt-8 overflow-hidden rounded-xl shadow-[var(--shadow-2)]"
          style={coverStyle}
        >
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 p-8 md:min-h-[380px]">
            {playing && !external ? (
              <div className="rounded-xl bg-surface/90 px-8 py-10 text-center shadow-[var(--shadow-1)]">
                <p className="text-2xl font-extrabold">You are playing!</p>
                <p className="mt-2 text-ink-muted">
                  This is a local demo stage for packaged projects.
                </p>
                <Button
                  className="mt-6"
                  variant="secondary"
                  onClick={() => setPlaying(false)}
                >
                  Close play
                </Button>
              </div>
            ) : (
              <Button size="l" onClick={startPlay}>
                {signedIn ? t("project.tapToPlay") : t("project.joinFreePlay")}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <section>
            <h2 className="text-2xl font-extrabold">{t("project.about")}</h2>
            <p className="mt-3 text-lg leading-relaxed text-ink-muted">
              {live.description}
            </p>

            <h2 className="mt-10 text-2xl font-extrabold">{t("project.howFeel")}</h2>
            <p className="mt-2 text-ink-muted">
              {t("project.howFeelSub")}
            </p>
            {!signedIn ? (
              <div className="mt-4">
                <AuthGateCard
                  title={t("gate.joinToReact")}
                  body={t("gate.joinToReactBody")}
                  nextPath={`/project/${live.id}`}
                  actionLabel={t("gate.joinReaction")}
                />
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-3">
                {(Object.keys(counts) as ReactionKind[]).map((kind) => (
                  <ReactionChip
                    key={kind}
                    kind={kind}
                    count={counts[kind]}
                    selected={engagement.reaction === kind}
                    onToggle={toggle}
                  />
                ))}
              </div>
            )}

            <form
              className="mt-8"
              onSubmit={(e) => {
                e.preventDefault();
                if (!feedback.trim()) return;
                requireAuth(() => {
                  engagement.addFeedback(feedback);
                  setFeedback("");
                  push(t("project.noteThanks"));
                });
              }}
            >
              <label htmlFor="feedback" className="text-lg font-bold">
                {t("project.feedbackLabel")}
              </label>
              <DictationField
                className="mt-3"
                value={feedback}
                onChange={setFeedback}
                disabled={!signedIn}
              >
                <textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  maxLength={280}
                  placeholder={
                    signedIn
                      ? t("project.feedbackPh")
                      : t("project.feedbackPhGuest")
                  }
                  disabled={!signedIn}
                  className="w-full rounded-lg border-2 border-border bg-surface p-4 text-base text-ink placeholder:text-placeholder focus:border-brand focus:outline-none disabled:opacity-60"
                />
              </DictationField>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button type="submit">
                  {signedIn ? t("project.sendNote") : t("project.joinSendNote")}
                </Button>
              </div>
            </form>
          </section>

          <aside className="space-y-6">
            <div className="rounded-xl bg-surface p-6 shadow-[var(--shadow-1)]">
              <p className="text-sm font-bold uppercase tracking-wide text-ink-muted">
                {t("project.results")}
              </p>
              <p className="mt-3 text-3xl font-extrabold">
                {formatCount(totalPlays)}
              </p>
              <p className="text-ink-muted">{t("project.plays")}</p>
              <p className="mt-4 text-3xl font-extrabold">
                {formatCount(totalReactionCount)}
              </p>
              <p className="text-ink-muted">{t("project.reactions")}</p>
            </div>

            <div className="rounded-xl border-2 border-border bg-canvas p-6">
              <p className="font-bold text-ink">{t("project.unsafe")}</p>
              <p className="mt-1 text-sm text-ink-muted">
                {t("project.unsafeBody")}
              </p>
              <Button
                className="mt-4"
                variant="destructive"
                size="m"
                onClick={() => {
                  requireAuth(() => setReportOpen(true));
                }}
                disabled={engagement.reported}
              >
                {engagement.reported ? t("project.reported") : t("project.report")}
              </Button>
            </div>
          </aside>
        </div>

        <ConfirmDialog
          open={reportOpen}
          title={t("project.reportTitle")}
          body={t("project.reportBody")}
          confirmLabel={t("project.reportConfirm")}
          tone="danger"
          onCancel={() => setReportOpen(false)}
          onConfirm={() => {
            engagement.report();
            addContentReport(live.id, live.title, reportReason);
            setReportOpen(false);
            push(t("project.reportedToast"), "warn");
          }}
        >
          <div className="flex flex-wrap gap-2">
            {reportReasons.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setReportReason(r.id)}
                className={cn(
                  "min-h-10 rounded-pill border-2 px-4 text-sm font-bold",
                  reportReason === r.id
                    ? "border-brand bg-brand text-on-brand"
                    : "border-border bg-canvas text-ink-muted",
                )}
              >
                {t(`report.${r.id}`)}
              </button>
            ))}
          </div>
        </ConfirmDialog>

        <section className="mt-16">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-extrabold">{t("project.moreLike")}</h2>
            <Link
              href="/explore"
              className="font-bold text-brand-strong underline"
            >
              {t("project.exploreMore")}
            </Link>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
