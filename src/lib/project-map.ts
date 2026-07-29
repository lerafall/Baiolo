import type { ProjectSubmission } from "@/lib/moderation";
import {
  defaultTagsForCategory,
  projects as catalog,
} from "@/lib/data/projects";
import { isImageThumb } from "@/lib/thumb-style";
import type { Project } from "@/lib/types";

/** Prefer a real image URL over a CSS gradient placeholder. */
function preferVisual(primary: string, fallback?: string) {
  if (primary && isImageThumb(primary)) return primary;
  if (fallback && isImageThumb(fallback)) return fallback;
  return primary || fallback || "";
}

/** Turn an approved submission into an Explore card model. */
export function submissionToProject(
  s: ProjectSubmission,
  creator = "You",
): Project | null {
  if (s.status !== "published" || !s.category) return null;
  const isLink =
    s.uploadType === "link" || /^https?:\/\//i.test(s.sourceLabel);
  const fromCatalog = catalog.find((p) => p.id === s.id);
  return {
    id: s.id,
    title: s.title,
    tagline: s.description.slice(0, 80) || "A new Baiolo project",
    description: s.description,
    category: s.category,
    tags:
      s.tags?.length > 0 ? s.tags : defaultTagsForCategory[s.category],
    creator: fromCatalog?.creator ?? creator,
    thumbnail: preferVisual(s.thumbnail, fromCatalog?.thumbnail),
    cover: preferVisual(
      fromCatalog?.cover ?? "",
      preferVisual(s.thumbnail, fromCatalog?.thumbnail),
    ),
    playUrl:
      s.playUrl ||
      (isLink ? s.sourceLabel : (fromCatalog?.playUrl ?? "#play")),
    plays: s.plays,
    reactions: {
      fun: Math.max(1, Math.round(s.reactions * 0.4)),
      interesting: Math.max(1, Math.round(s.reactions * 0.3)),
      "would-use-again": Math.max(1, Math.round(s.reactions * 0.3)),
    },
    featured: fromCatalog?.featured,
    ownerId: fromCatalog?.ownerId ?? "local",
  };
}
