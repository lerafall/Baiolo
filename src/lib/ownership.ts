import type { ProjectSubmission } from "@/lib/moderation";

/** Curated demo catalog ids — not “owned” by end users. */
export const CATALOG_DEMO_IDS = new Set([
  "star-catch",
  "cloud-hopper",
  "tiny-timer",
  "story-portal",
  "color-splash",
  "petal-puzzle",
  "idea-jar",
  "starfall-garden",
  "moonlight-bakery",
  "fairy-blocks",
  "lantern-munch",
  "spark-nest",
  "sunny-speedway",
  "foxfire-hollow",
]);

export function isCatalogDemoId(id: string) {
  return CATALOG_DEMO_IDS.has(id);
}

/**
 * True when this submission belongs to the signed-in user.
 * Catalog demos are never treated as owned, even if they appear in the local store.
 */
export function isOwnedSubmission(
  s: ProjectSubmission,
  userId: string | null | undefined,
) {
  if (isCatalogDemoId(s.id)) return false;
  if (!userId) return false;
  return s.ownerId === userId;
}
