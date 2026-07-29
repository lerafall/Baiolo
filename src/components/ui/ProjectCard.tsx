"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useRequireAuth } from "@/lib/auth-gate";
import { useFavorites } from "@/lib/favorites";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";
import { useT } from "@/lib/i18n/LocaleProvider";
import { thumbBackgroundStyle } from "@/lib/thumb-style";
import type { Project } from "@/lib/types";

type ProjectCardProps = {
  project: Project;
};

export function ProjectCard({ project }: ProjectCardProps) {
  const t = useT();
  const { isFavorite, toggle } = useFavorites();
  const { requireAuth, signedIn } = useRequireAuth(`/project/${project.id}`);
  const { push } = useToast();
  const liked = isFavorite(project.id);

  const totalReactions =
    project.reactions.fun +
    project.reactions.interesting +
    project.reactions["would-use-again"];

  return (
    <article className="group relative flex flex-col overflow-visible rounded-xl bg-surface shadow-[var(--shadow-1)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-hover)]">
      <button
        type="button"
        aria-pressed={liked}
        aria-label={
          signedIn
            ? liked
              ? t("card.unsave")
              : t("card.save")
            : t("card.joinSave")
        }
        className={cn(
          "absolute right-3 top-3 z-10 flex size-11 items-center justify-center rounded-full border-2 bg-surface/95 text-lg font-bold shadow-[var(--shadow-1)] transition-transform hover:scale-105",
          liked
            ? "border-accent-coral text-accent-coral"
            : "border-border text-ink-muted",
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          requireAuth(() => {
            const on = toggle(project.id);
            push(on ? t("card.savedToast") : t("card.removedToast"));
          });
        }}
      >
        {liked ? "♥" : "♡"}
      </button>

      <Link
        href={`/project/${project.id}`}
        className="block overflow-hidden rounded-t-xl focus-visible:outline-none"
      >
        <div
          className="aspect-[4/3] w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.02]"
          style={thumbBackgroundStyle(project.thumbnail)}
          role="img"
          aria-label={t("landing.previewAria", { title: project.title })}
        />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">
            {t(`explore.${project.category}`)}
          </p>
          <h3 className="mt-1 text-xl font-extrabold leading-tight text-ink">
            <Link href={`/project/${project.id}`}>{project.title}</Link>
          </h3>
          <p className="mt-1 text-sm text-ink-muted">{project.tagline}</p>
          {project.tags.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-1.5">
              {project.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-pill bg-lilac/60 px-2.5 py-0.5 text-xs font-bold text-brand-strong"
                >
                  {tag}
                </span>
              ))}
            </p>
          )}
        </div>
        <p className="text-sm text-ink-muted">
          {t("card.by")}{" "}
          <span className="font-bold text-ink">{project.creator}</span>
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <p className="text-xs font-semibold text-ink-muted">
            {t("card.playsReactions", {
              plays: formatCount(project.plays),
              reactions: totalReactions,
            })}
          </p>
          <Button href={`/project/${project.id}`} size="m">
            {signedIn ? t("card.play") : t("card.joinToPlay")}
          </Button>
        </div>
      </div>
    </article>
  );
}
