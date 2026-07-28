import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { rankProjects } from "@/lib/ranking";
import { formatCount } from "@/lib/format";
import { thumbBackgroundStyle } from "@/lib/thumb-style";
import type { Project } from "@/lib/types";

export function WeeklyRanking({ projects }: { projects: Project[] }) {
  const ranked = rankProjects(projects, 5);
  if (ranked.length === 0) return null;

  return (
    <section className="animate-rise mb-10 rounded-xl bg-mint/40 p-5 shadow-[var(--shadow-1)] md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-secondary-strong">
            This week
          </p>
          <h2 className="mt-1 text-2xl font-extrabold text-ink">
            Rising favorites
          </h2>
        </div>
        <Button href="/this-week" variant="ghost" size="m">
          Full ranking
        </Button>
      </div>
      <ol className="mt-5 space-y-3">
        {ranked.map(({ rank, project }) => (
          <li key={project.id}>
            <Link
              href={`/project/${project.id}`}
              className="flex items-center gap-4 rounded-xl bg-surface px-4 py-3 shadow-[var(--shadow-1)] transition-transform hover:-translate-y-0.5"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-extrabold text-on-brand">
                {rank}
              </span>
              <div
                className="size-12 shrink-0 rounded-lg bg-cover bg-center"
                style={thumbBackgroundStyle(project.thumbnail)}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold text-ink">
                  {project.title}
                </p>
                <p className="truncate text-sm text-ink-muted">
                  {formatCount(project.plays)} plays · by {project.creator}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
