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
import { submissionToProject } from "@/lib/project-map";
import { useSubmissions } from "@/lib/submissions";
import { useSyncedEngagement } from "@/lib/synced-engagement";
import { useT } from "@/lib/i18n/LocaleProvider";

export default function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { items, ready } = useSubmissions();
  const { signedIn, ready: authReady } = useSignedIn();
  const engagement = useSyncedEngagement(id);
  const playCounted = useRef(false);
  const t = useT();

  const project = useMemo(() => {
    const fromCatalog = getProject(id);
    if (fromCatalog) return fromCatalog;
    const published = items.find((s) => s.id === id && s.status === "published");
    if (published) return submissionToProject(published);
    return null;
  }, [id, items]);

  useEffect(() => {
    if (!signedIn || !project || !engagement.ready || playCounted.current) return;
    playCounted.current = true;
    engagement.recordPlay();
  }, [signedIn, project, engagement]);

  if (ready && !project) notFound();
  if (!ready || !project || !authReady) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-5 py-16 text-ink-muted">
          {t("play.opening")}
        </main>
      </>
    );
  }

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
  const external = /^https?:\/\//i.test(url);
  const sameOrigin = url.startsWith("/") && !url.startsWith("//");
  const isZip = url.toLowerCase().includes(".zip") || url.includes("package.zip");
  const embeddable = (external || sameOrigin) && !isZip && url !== "#play";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-5 py-10 md:px-8">
        <p className="text-sm font-bold uppercase tracking-wide text-ink-muted">
          {t("play.playing")}
        </p>
        <h1 className="mt-2 text-4xl font-extrabold">{project.title}</h1>
        <p className="mt-2 text-ink-muted">{project.tagline}</p>

        {embeddable ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                href={url}
                size="m"
                variant="secondary"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("play.fullscreen")}
              </Button>
              <p className="text-sm text-ink-muted">
                {t("play.tip")}
              </p>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border-2 border-border bg-surface shadow-[var(--shadow-2)]">
              <iframe
                title={project.title}
                src={url}
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
              {isZip ? t("play.zipHint") : t("play.openTab")}
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
        />
      </main>
    </>
  );
}
