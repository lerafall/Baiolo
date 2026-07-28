"use client";

import { useMemo } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { projects as catalog } from "@/lib/data/projects";
import { useFavorites } from "@/lib/favorites";
import { submissionToProject } from "@/lib/project-map";
import { useSubmissions } from "@/lib/submissions";

export default function FavoritesPage() {
  const { ids, ready } = useFavorites();
  const { items } = useSubmissions();

  const feed = useMemo(() => {
    const fromSubs = items
      .map((s) => submissionToProject(s))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    const byId = new Map(catalog.map((p) => [p.id, p]));
    for (const p of fromSubs) byId.set(p.id, p);
    return Array.from(byId.values());
  }, [items]);

  const liked = feed.filter((p) => ids.includes(p.id));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8">
        <h1 className="text-4xl font-extrabold">Favorites</h1>
        <p className="mt-2 text-lg text-ink-muted">
          {ready && liked.length > 0
            ? `${liked.length} saved · tap the heart on a card to change.`
            : "Projects you saved for later. Just tap the heart on a card."}
        </p>

        {!ready && (
          <p className="mt-10 text-ink-muted">Loading your favorites…</p>
        )}

        {ready && liked.length === 0 && (
          <div className="mt-12 rounded-xl bg-lilac/40 p-10 text-center">
            <p className="text-xl font-extrabold">No favorites yet</p>
            <p className="mt-2 text-ink-muted">
              Explore something fun and tap ♡ to save it.
            </p>
            <Button href="/explore" className="mt-6">
              Explore
            </Button>
          </div>
        )}

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {liked.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </main>
    </>
  );
}
