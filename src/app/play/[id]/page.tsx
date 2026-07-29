"use client";

import { use, useEffect, useMemo, useRef } from "react";
import { notFound } from "next/navigation";
import { AuthGateCard } from "@/components/auth/AuthGateCard";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ShareProjectPanel } from "@/components/share/ShareProjectPanel";
import { Button } from "@/components/ui/Button";
import { useSignedIn } from "@/lib/auth-gate";
import { getProject } from "@/lib/data/projects";
import { toEmbedPlayUrl } from "@/lib/play-url";
import { isMockPlayUrl, mockPlayIdFromUrl, mockPlaySrcDoc } from "@/lib/mock-play";
import { submissionToOwnerProject, submissionToProject } from "@/lib/project-map";
import { useSession } from "@/lib/session";
import { useSubmissions } from "@/lib/submissions";
import { useSyncedEngagement } from "@/lib/synced-engagement";
import { useT } from "@/lib/i18n/LocaleProvider";
import { referrerLabel } from "@/lib/creator-analytics";

export default function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { items, ready } = useSubmissions();
  const { session } = useSession();
  const { signedIn, ready: authReady } = useSignedIn();
  const engagement = useSyncedEngagement(id);
  const playCounted = useRef(false);
  const t = useT();
  const fromLabelRef = useRef("direct");

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      fromLabelRef.current = referrerLabel(q.get("from") || q.get("ref"));
    } catch {
      fromLabelRef.current = "direct";
    }
  }, []);

  const ownedSubmission = useMemo(
    () => items.find((s) => s.id === id) ?? null,
    [id, items],
  );

  const sharedAccess = useMemo(() => {
    if (!ownedSubmission) {
      // Still allow if any submission lists this user in sharedWith (synced list).
      const hit = items.find((s) => s.id === id);
      if (!hit) return false;
      const email = (session.email || "").toLowerCase();
      return Boolean(
        email &&
          (hit.sharedWith || []).some((x) => x.toLowerCase() === email),
      );
    }
    const email = (session.email || "").toLowerCase();
    return Boolean(
      email &&
        (ownedSubmission.sharedWith || []).some(
          (x) => x.toLowerCase() === email,
        ),
    );
  }, [items, id, ownedSubmission, session.email]);

  const isOwner = Boolean(ownedSubmission);
  const canPrivatePlay = isOwner || sharedAccess;

  const resolved = useMemo(() => {
    const fromCatalog = getProject(id);
    if (fromCatalog) {
      return { project: fromCatalog, privateOwner: false as const };
    }
    const published = items.find((s) => s.id === id && s.status === "published");
    if (published) {
      const mapped = submissionToProject(published, session.name || "You");
      if (mapped) return { project: mapped, privateOwner: false as const };
    }
    if (canPrivatePlay && ownedSubmission) {
      const mapped = submissionToOwnerProject(
        ownedSubmission,
        session.name || "You",
      );
      if (mapped) return { project: mapped, privateOwner: true as const };
    }
    // Shared-with users may not own the submission row locally — still try map.
    if (canPrivatePlay) {
      const hit = items.find((s) => s.id === id);
      if (hit) {
        const mapped = submissionToOwnerProject(hit, session.name || "You");
        if (mapped) return { project: mapped, privateOwner: true as const };
      }
    }
    return null;
  }, [id, items, canPrivatePlay, ownedSubmission, session.name]);

  useEffect(() => {
    if (
      !signedIn ||
      !resolved?.project ||
      !engagement.ready ||
      playCounted.current
    ) {
      return;
    }
    playCounted.current = true;
    engagement.recordPlay();
    try {
      const key = "baiolo.play-refs.v1";
      const raw = localStorage.getItem(key);
      const map = raw ? (JSON.parse(raw) as Record<string, Record<string, number>>) : {};
      const per = map[id] || {};
      per[fromLabelRef.current] = (per[fromLabelRef.current] || 0) + 1;
      map[id] = per;
      localStorage.setItem(key, JSON.stringify(map));
    } catch {
      /* ignore */
    }
  }, [signedIn, resolved, engagement, id]);

  if (ready && !resolved) notFound();
  if (!ready || !resolved || !authReady) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-5 py-16 text-ink-muted">
          {t("play.opening")}
        </main>
      </>
    );
  }

  const { project, privateOwner } = resolved;

  if (!signedIn) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-xl px-5 py-16 md:px-8">
          <p className="text-center text-sm font-bold uppercase tracking-wide text-ink-muted">
            {t("gate.membersOnly")}
          </p>
          <h1 className="mt-2 text-center text-3xl font-extrabold">{project.title}</h1>
          <p className="mt-2 text-center text-ink-muted">{project.tagline}</p>
          <div className="mt-8">
            <AuthGateCard
              title={t("gate.joinToPlay")}
              body={t("gate.joinToPlayBody")}
              nextPath={`/play/${project.id}`}
              actionLabel={t("gate.joinFreePlay")}
            />
          </div>
        </main>
      </>
    );
  }

  const url = toEmbedPlayUrl(project.playUrl, project.id);
  const mockId = isMockPlayUrl(url) ? mockPlayIdFromUrl(url) : null;
  const mockDoc = mockId ? mockPlaySrcDoc(mockId) : null;
  const external = /^https?:\/\//i.test(url);
  const sameOrigin = url.startsWith("/") && !url.startsWith("//");
  const isZip = url.toLowerCase().includes(".zip") || url.includes("package.zip");
  const embeddable =
    Boolean(mockDoc) ||
    ((external || sameOrigin) && !isZip && url !== "#play");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-5 py-10 md:px-8">
        <p className="text-sm font-bold uppercase tracking-wide text-ink-muted">
          {privateOwner ? t("play.playingPrivate") : t("play.playing")}
        </p>
        <h1 className="mt-2 text-4xl font-extrabold">{project.title}</h1>
        <p className="mt-2 text-ink-muted">{project.tagline}</p>
        {privateOwner && (
          <p className="mt-3 rounded-xl border-2 border-brand/25 bg-lilac/40 px-4 py-3 text-sm font-semibold">
            {t("play.privateOwnerNote")}
          </p>
        )}
        {isOwner && (
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              href={`/create?edit=${encodeURIComponent(project.id)}`}
              size="m"
            >
              {t("play.editAgain")}
            </Button>
            <Button
              href={`/project/${project.id}`}
              size="m"
              variant="secondary"
            >
              {t("play.back")}
            </Button>
          </div>
        )}

        {embeddable ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {!mockDoc && (
                <Button
                  href={url}
                  size="m"
                  variant="secondary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("play.fullscreen")}
                </Button>
              )}
              <p className="text-sm text-ink-muted">
                {t("play.tip")}
              </p>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border-2 border-border bg-surface shadow-[var(--shadow-2)]">
              <iframe
                title={project.title}
                src={mockDoc ? undefined : url}
                srcDoc={mockDoc || undefined}
                className="h-[70vh] w-full touch-none bg-canvas"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                allow="autoplay"
              />
            </div>
          </>
        ) : (
          <div className="mt-8 rounded-xl bg-lilac/40 p-8 text-center shadow-[var(--shadow-1)]">
            <p className="text-xl font-extrabold">
              {isZip ? t("play.packageReady") : t("play.openProject")}
            </p>
            <p className="mt-2 text-ink-muted">
              {url === "#play"
                ? t("play.privatePreparing")
                : isZip
                  ? t("play.zipHint")
                  : t("play.openTab")}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {external && (
                <Button href={url} size="l">
                  {isZip ? t("play.download") : t("play.open")}
                </Button>
              )}
              <Button href={`/project/${project.id}`} variant="secondary" size="l">
                {t("play.back")}
              </Button>
            </div>
          </div>
        )}

        <ShareProjectPanel
          className="mt-10"
          projectId={project.id}
          title={project.title}
          tagline={project.tagline}
          emphasis="compact"
          publicShare={!privateOwner}
        />
      </main>
    </>
  );
}
