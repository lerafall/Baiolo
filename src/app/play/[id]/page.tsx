"use client";

import { use, useMemo } from "react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { getProject } from "@/lib/data/projects";
import { toEmbedPlayUrl } from "@/lib/play-url";
import { submissionToProject } from "@/lib/project-map";
import { useSubmissions } from "@/lib/submissions";

export default function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { items, ready } = useSubmissions();

  const project = useMemo(() => {
    const fromCatalog = getProject(id);
    if (fromCatalog) return fromCatalog;
    const published = items.find((s) => s.id === id && s.status === "published");
    if (published) return submissionToProject(published);
    return null;
  }, [id, items]);

  if (ready && !project) notFound();
  if (!ready || !project) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-5 py-16 text-ink-muted">
          Opening play…
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
          Playing
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
                Open fullscreen
              </Button>
              <p className="text-sm text-ink-muted">
                Tip: tap <span className="font-bold">Play</span>, then drag
                anywhere near the blue wisp (pull back like a slingshot).
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
              {isZip ? "Package ready" : "Open this project"}
            </p>
            <p className="mt-2 text-ink-muted">
              {isZip
                ? "This ZIP isn’t unpacked for in-browser play yet. Ask admin to Approve again (Baiolo will extract index.html), or submit with Paste link next time."
                : "We’ll open the project in a new tab."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {external && (
                <Button href={url} size="l">
                  {isZip ? "Download package" : "Open project"}
                </Button>
              )}
              <Button href={`/project/${project.id}`} variant="secondary" size="l">
                Back to project
              </Button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
