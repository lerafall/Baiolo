"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { WeeklyRanking } from "@/components/ui/WeeklyRanking";
import { projects as catalog } from "@/lib/data/projects";
import { submissionToProject } from "@/lib/project-map";
import { useSubmissions } from "@/lib/submissions";

export function HomeLiveStrip() {
  const { items, ready, mode } = useSubmissions();

  const feed = useMemo(() => {
    const fromSubs = items
      .map((s) => submissionToProject(s))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    const byId = new Map(catalog.map((p) => [p.id, p]));
    for (const p of fromSubs) byId.set(p.id, p);
    return Array.from(byId.values());
  }, [items]);

  const samples = feed.slice(0, 3);
  const label =
    mode === "supabase" && items.some((i) => i.status === "published")
      ? "Live now"
      : "Sample projects";

  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold">{label}</h2>
            <p className="mt-2 text-lg text-ink-muted">
              {ready
                ? "Try a few ideas people are testing right now."
                : "Loading soft picks…"}
            </p>
          </div>
          <Button href="/explore" variant="secondary">
            See all
          </Button>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {samples.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
        <div className="mt-12">
          <WeeklyRanking projects={feed} />
        </div>
      </div>
    </section>
  );
}
