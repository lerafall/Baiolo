"use client";

import { useMemo } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { projects as catalog, categoryLabels } from "@/lib/data/projects";
import { submissionToProject } from "@/lib/project-map";
import { rankProjects } from "@/lib/ranking";
import { formatCount } from "@/lib/format";
import { useSubmissions } from "@/lib/submissions";

export default function ThisWeekPage() {
  const { items, ready } = useSubmissions();

  const feed = useMemo(() => {
    const fromSubs = items
      .map((s) => submissionToProject(s))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    const byId = new Map(catalog.map((p) => [p.id, p]));
    for (const p of fromSubs) byId.set(p.id, p);
    return Array.from(byId.values());
  }, [items]);

  const ranked = rankProjects(feed, 12);
  const totalReactions = (p: (typeof feed)[number]) =>
    p.reactions.fun + p.reactions.interesting + p.reactions["would-use-again"];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-5 py-10 md:px-8">
        <p className="text-sm font-bold uppercase tracking-wide text-secondary-strong">
          This week
        </p>
        <h1 className="mt-2 text-4xl font-extrabold">Rising favorites</h1>
        <p className="mt-2 text-lg text-ink-muted">
          Soft vibes from plays and reactions — not a heavy leaderboard.
        </p>

        {!ready && (
          <p className="mt-10 text-ink-muted">Gathering this week’s favorites…</p>
        )}

        {ready && ranked.length === 0 && (
          <div className="mt-12 rounded-xl bg-lilac/40 p-10 text-center">
            <p className="text-xl font-extrabold">It’s quiet this week</p>
            <p className="mt-2 text-ink-muted">
              Try something new on Explore, or share your own tiny idea.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button href="/explore">Explore</Button>
              <Button href="/create" variant="secondary">
                Add your project
              </Button>
            </div>
          </div>
        )}

        <ol className="mt-10 space-y-4">
          {ranked.map(({ rank, project }) => (
            <li key={project.id}>
              <Link
                href={`/project/${project.id}`}
                className="flex items-center gap-4 rounded-xl bg-surface p-4 shadow-[var(--shadow-1)] transition-transform hover:-translate-y-0.5"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand text-xl font-extrabold text-on-brand">
                  {rank}
                </span>
                <div
                  className="size-16 shrink-0 rounded-lg bg-cover bg-center"
                  style={
                    project.thumbnail.startsWith("data:") ||
                    project.thumbnail.startsWith("http")
                      ? {
                          backgroundImage: `url(${project.thumbnail})`,
                          backgroundColor: "#e0cfff",
                        }
                      : { background: project.thumbnail }
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-extrabold">{project.title}</p>
                  <p className="text-sm text-ink-muted">
                    {categoryLabels[project.category]} · by {project.creator}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-ink-muted">
                    {formatCount(project.plays)} plays ·{" "}
                    {totalReactions(project)} reactions
                  </p>
                  {project.tags.length > 0 && (
                    <p className="mt-1 truncate text-xs font-bold text-brand-strong">
                      {project.tags.slice(0, 3).join(" · ")}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ol>

        <div className="mt-10 text-center">
          <Button href="/explore" variant="secondary">
            Back to Explore
          </Button>
        </div>
      </main>
    </>
  );
}
