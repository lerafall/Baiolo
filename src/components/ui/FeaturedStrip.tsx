import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { thumbBackgroundStyle } from "@/lib/thumb-style";
import type { Project } from "@/lib/types";

export function FeaturedStrip({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return null;

  return (
    <section className="animate-rise mb-10 overflow-hidden rounded-xl bg-lilac/45 p-5 shadow-[var(--shadow-1)] md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-brand-strong">
            Featured
          </p>
          <h2 className="mt-1 text-2xl font-extrabold text-ink">
            Try these first
          </h2>
        </div>
        <Button href="/explore" variant="ghost" size="m">
          See all
        </Button>
      </div>
      <ul className="mt-5 flex gap-4 overflow-x-auto pb-2">
        {projects.map((p, i) => (
          <li
            key={p.id}
            className="w-64 shrink-0 rounded-xl bg-surface p-3 shadow-[var(--shadow-1)] transition-transform hover:-translate-y-1"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <Link href={`/project/${p.id}`} className="block">
              <div
                className="aspect-[4/3] rounded-lg bg-cover bg-center"
                style={thumbBackgroundStyle(p.thumbnail)}
                role="img"
                aria-label={`${p.title} preview`}
              />
              <p className="mt-3 font-extrabold text-ink">{p.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                {p.tagline}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
