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

/** Play URL for the creator (private preview) or the public (after publish). */
export function resolvePlayableUrl(s: ProjectSubmission): string | null {
  if (s.status === "published" && s.playUrl) return s.playUrl;
  if (s.previewUrl) return s.previewUrl;
  if (s.uploadType === "link" && /^https?:\/\//i.test(s.sourceLabel)) {
    return s.sourceLabel;
  }
  if (s.playUrl) return s.playUrl;
  return null;
}

function toProjectModel(
  s: ProjectSubmission,
  creator: string,
  playUrl: string,
): Project {
  const category = s.category || "experiment";
  const isLink =
    s.uploadType === "link" || /^https?:\/\//i.test(s.sourceLabel);
  const fromCatalog = catalog.find((p) => p.id === s.id);
  return {
    id: s.id,
    title: s.title,
    tagline: s.description.slice(0, 80) || "A new Baiolo project",
    description: s.description,
    category,
    tags:
      s.tags?.length > 0 ? s.tags : defaultTagsForCategory[category],
    creator: fromCatalog?.creator ?? creator,
    thumbnail: preferVisual(s.thumbnail, fromCatalog?.thumbnail),
    cover: preferVisual(
      fromCatalog?.cover ?? "",
      preferVisual(s.thumbnail, fromCatalog?.thumbnail),
    ),
    playUrl:
      playUrl ||
      (isLink ? s.sourceLabel : (fromCatalog?.playUrl ?? "#play")),
    plays: s.plays,
    reactions: {
      fun: Math.max(1, Math.round(s.reactions * 0.4)),
      interesting: Math.max(1, Math.round(s.reactions * 0.3)),
      "would-use-again": Math.max(1, Math.round(s.reactions * 0.3)),
    },
    featured: fromCatalog?.featured,
    ownerId: s.ownerId ?? fromCatalog?.ownerId ?? "local",
  };
}

/** Explore / public card — only after admin publish. */
export function submissionToProject(
  s: ProjectSubmission,
  creator = "You",
): Project | null {
  if (s.status !== "published" || !s.category) return null;
  const playUrl = resolvePlayableUrl(s);
  if (!playUrl) return null;
  return toProjectModel(s, creator, playUrl);
}

/**
 * Creator’s own view — playable as soon as a private preview (or link) exists.
 * Not listed in Explore until published.
 */
export function submissionToOwnerProject(
  s: ProjectSubmission,
  creator = "You",
): Project | null {
  if (s.status === "draft") return null;
  const playUrl = resolvePlayableUrl(s) || "#play";
  return toProjectModel(s, creator, playUrl);
}
