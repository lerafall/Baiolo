import type { ProjectSubmission } from "@/lib/moderation";

const CHECKING_MS = 8_000;

/** Advance mock "checking" items into "in_review" after a short wait. */
export function progressCheckingSubmissions(
  items: ProjectSubmission[],
  now = Date.now(),
): ProjectSubmission[] {
  let changed = false;
  const next = items.map((item) => {
    if (item.status !== "checking") return item;
    const updated = Date.parse(item.updatedAt);
    if (Number.isNaN(updated) || now - updated < CHECKING_MS) return item;
    changed = true;
    return {
      ...item,
      status: "in_review" as const,
      updatedAt: new Date(now).toISOString(),
    };
  });
  return changed ? next : items;
}

export const PIPELINE_STAGES_KEY = "baiolo.last-pipeline-stages";

export type PipelineStageView = {
  name: string;
  ok: boolean;
  detail: string;
};

export function friendlyStageLabel(name: string) {
  switch (name) {
    case "private_storage":
      return "Private storage";
    case "technical_validation":
      return "Package check";
    case "ai_moderation":
      return "Friendly safety check";
    case "admin_queue":
      return "Human review queue";
    case "live_checking":
      return "Still checking";
    case "human_review":
      return "Human review";
    case "needs_changes":
      return "Needs a small fix";
    case "published":
      return "Ready to share";
    case "rejected":
      return "Not published";
    default:
      return name;
  }
}
