import type { ProjectSubmission } from "@/lib/moderation";
import {
  defaultTagsForCategory,
  projects as catalog,
} from "@/lib/data/projects";
import { isImageThumb } from "@/lib/thumb-style";
import type { Project, ReactionKind } from "@/lib/types";

/** Prefer a real image URL over a CSS gradient placeholder. */
function preferVisual(primary: string, fallback?: string) {
  if (primary && isImageThumb(primary)) return primary;
  if (fallback && isImageThumb(fallback)) return fallback;
  return primary || fallback || "";
}

/** Split a scalar reaction total into UI buckets without inventing extras. */
export function splitReactionTotal(
  total: number,
): Record<ReactionKind, number> {
  const n = Math.max(0, Math.floor(total));
  if (n === 0) {
    return { fun: 0, interesting: 0, "would-use-again": 0 };
  }
  const fun = Math.floor(n * 0.4);
  const interesting = Math.floor(n * 0.3);
  return {
    fun,
    interesting,
    "would-use-again": n - fun - interesting,
  };
}

export function totalReactions(
  reactions: Record<ReactionKind, number> | number | null | undefined,
) {
  if (typeof reactions === "number") return Math.max(0, reactions);
  if (!reactions) return 0;
  return (
    (reactions.fun || 0) +
    (reactions.interesting || 0) +
    (reactions["would-use-again"] || 0)
  );
}

/** Play URL for the creator (private preview) or the public (after publish). */
export function resolvePlayableUrl(s: ProjectSubmission): string | null {
  const isMock = (url: string | null | undefined) =>
    Boolean(url && url.startsWith("#mock-play/"));
  const isOwnerOnly = (url: string | null | undefined) =>
    Boolean(url && url.includes("/api/owner-play-site/"));

  if (s.status === "published") {
    if (s.playUrl && !isMock(s.playUrl) && !isOwnerOnly(s.playUrl)) {
      return s.playUrl;
    }
    if (s.uploadType === "link" && /^https?:\/\//i.test(s.sourceLabel)) {
      return s.sourceLabel;
    }
    // Public Explore must not use local mock or owner-only preview URLs.
    return null;
  }

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
  // Prefer catalog breakdown when totals match; otherwise split the scalar exactly.
  const catalogTotal = fromCatalog ? totalReactions(fromCatalog.reactions) : -1;
  const reactions =
    fromCatalog && catalogTotal === s.reactions
      ? fromCatalog.reactions
      : splitReactionTotal(s.reactions);

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
    reactions,
    featured: fromCatalog?.featured,
    ownerId: s.ownerId ?? fromCatalog?.ownerId ?? "local",
  };
}

/** Prefer the richer stats when merging catalog + cloud for the same id. */
export function mergeProjectStats(base: Project, overlay: Project): Project {
  const baseR = totalReactions(base.reactions);
  const overlayR = totalReactions(overlay.reactions);
  return {
    ...overlay,
    plays: Math.max(base.plays, overlay.plays),
    reactions: overlayR >= baseR ? overlay.reactions : base.reactions,
    featured: overlay.featured ?? base.featured,
  };
}

/** Explore / public card — only after admin publish. */
export function submissionToProject(
  s: ProjectSubmission,
  creator = "You",
): Project | null {
  if (s.status !== "published" || !s.category) return null;
  let playUrl = resolvePlayableUrl(s);
  // Published rows sometimes still point at owner-only preview URLs — use catalog demo if known.
  if (!playUrl) {
    const fromCatalog = catalog.find((p) => p.id === s.id);
    if (fromCatalog?.playUrl && !fromCatalog.playUrl.startsWith("#")) {
      playUrl = fromCatalog.playUrl;
    }
  }
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
