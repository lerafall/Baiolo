"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { FeaturedStrip } from "@/components/ui/FeaturedStrip";
import { FilterPill } from "@/components/ui/FilterPill";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { WeeklyRanking } from "@/components/ui/WeeklyRanking";
import { allTags, projects as catalog } from "@/lib/data/projects";
import { submissionToProject } from "@/lib/project-map";
import { useSubmissions } from "@/lib/submissions";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useT } from "@/lib/i18n/LocaleProvider";
import { DictationField } from "@/components/ui/DictationField";
import type { ProjectCategory } from "@/lib/types";

function ExploreBody() {
  const t = useT();
  const router = useRouter();
  const search = useSearchParams();
  const initialQ = search.get("q") ?? "";
  const initialFilter = (search.get("type") as "all" | ProjectCategory) || "all";
  const initialTag = search.get("tag") ?? "";

  const filters: Array<{ id: "all" | ProjectCategory; label: string }> = [
    { id: "all", label: t("explore.all") },
    { id: "game", label: t("explore.game") },
    { id: "tool", label: t("explore.tool") },
    { id: "experiment", label: t("explore.experiment") },
    { id: "demo", label: t("explore.demo") },
  ];

  const [query, setQuery] = useState(initialQ);
  const debouncedQuery = useDebouncedValue(query, 250);
  const [filter, setFilter] = useState<"all" | ProjectCategory>(
    filters.some((f) => f.id === initialFilter) ? initialFilter : "all",
  );
  const [tag, setTag] = useState(initialTag);
  const { items, mode } = useSubmissions();

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
    if (filter !== "all") params.set("type", filter);
    if (tag) params.set("tag", tag);
    const qs = params.toString();
    router.replace(qs ? `/explore?${qs}` : "/explore", { scroll: false });
  }, [debouncedQuery, filter, tag, router]);

  const feed = useMemo(() => {
    const fromSubs = items
      .map((s) => submissionToProject(s))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));

    const byId = new Map<string, (typeof catalog)[number]>();
    const useCatalogFallback =
      mode !== "supabase" || fromSubs.length === 0;
    if (useCatalogFallback) {
      for (const p of catalog) byId.set(p.id, p);
    }
    for (const p of fromSubs) byId.set(p.id, p);
    return Array.from(byId.values());
  }, [items, mode]);

  const tags = useMemo(() => allTags(feed), [feed]);

  const featured = useMemo(
    () => feed.filter((p) => p.featured).slice(0, 4),
    [feed],
  );

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return feed.filter((p) => {
      const matchFilter = filter === "all" || p.category === filter;
      const matchTag = !tag || p.tags.includes(tag);
      const matchQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.creator.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      return matchFilter && matchTag && matchQuery;
    });
  }, [feed, filter, tag, debouncedQuery]);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8">
      <div className="animate-rise">
        <h1 className="text-4xl font-extrabold text-ink">{t("explore.title")}</h1>
        <p className="mt-2 text-lg text-ink-muted">
          {mode === "supabase"
            ? t("exploreExtra.cloudSub")
            : t("exploreExtra.mockSub")}
        </p>
      </div>

      <label className="mt-8 block animate-rise-delay-1">
        <span className="sr-only">{t("exploreExtra.searchSr")}</span>
        <DictationField
          value={query}
          onChange={setQuery}
          append={false}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("exploreExtra.search")}
            className="min-h-14 w-full rounded-pill border-2 border-border bg-surface px-6 text-lg text-ink shadow-[var(--shadow-1)] placeholder:text-placeholder focus:border-brand focus:outline-none"
          />
        </DictationField>
      </label>

      <div className="-mx-5 mt-5 animate-rise-delay-2 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:overflow-visible md:px-0">
        <div className="flex w-max min-w-full gap-2 md:flex-wrap md:w-auto">
          {filters.map((f) => (
            <FilterPill
              key={f.id}
              label={f.label}
              active={filter === f.id}
              onClick={() => setFilter(f.id)}
            />
          ))}
        </div>
      </div>

      <div className="-mx-5 mt-3 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:overflow-visible md:px-0">
        <div className="flex w-max min-w-full gap-2 md:flex-wrap md:w-auto">
          <FilterPill
            label={t("exploreExtra.anyTag")}
            active={!tag}
            onClick={() => setTag("")}
          />
          {tags.map((tagName) => (
            <FilterPill
              key={tagName}
              label={tagName}
              active={tag === tagName}
              onClick={() => setTag(tagName === tag ? "" : tagName)}
            />
          ))}
        </div>
      </div>

      {!debouncedQuery && filter === "all" && !tag && (
        <div className="mt-10 space-y-10">
          <FeaturedStrip projects={featured} />
          <WeeklyRanking projects={feed} />
        </div>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((project, i) => (
          <div
            key={project.id}
            className="animate-rise"
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <ProjectCard project={project} />
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-16 rounded-xl bg-lilac/40 p-10 text-center">
          <p className="text-xl font-extrabold">{t("exploreExtra.emptyTitle")}</p>
          <p className="mt-2 text-ink-muted">
            {debouncedQuery || filter !== "all" || tag
              ? t("exploreExtra.empty")
              : mode === "supabase"
                ? t("exploreExtra.emptyCloud")
                : t("exploreExtra.emptyMock")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button href="/create">{t("exploreExtra.addProject")}</Button>
            {mode === "supabase" && (
              <Button href="/admin" variant="secondary">
                {t("exploreExtra.openAdmin")}
              </Button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function ExploreFallback() {
  const t = useT();
  return (
    <main className="mx-auto max-w-6xl px-5 py-16 text-ink-muted">
      {t("exploreExtra.loading")}
    </main>
  );
}

export default function ExplorePage() {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<ExploreFallback />}>
        <ExploreBody />
      </Suspense>
    </>
  );
}
