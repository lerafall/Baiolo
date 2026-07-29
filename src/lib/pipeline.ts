import type { ProjectSubmission } from "@/lib/moderation";
import { mockAiPrecheck } from "@/lib/ai-precheck";

/**
 * Moderation pipeline facade.
 * Today: local/mock. Tomorrow: Supabase storage + edge jobs.
 */
export type PipelineSubmitInput = Omit<
  ProjectSubmission,
  | "status"
  | "risk"
  | "aiFlags"
  | "changeRequest"
  | "updatedAt"
  | "plays"
  | "reactions"
  | "tags"
> & { tags?: string[] };

export type PipelineResult = {
  submission: ProjectSubmission;
  stages: Array<{ name: string; ok: boolean; detail: string }>;
};

export async function runSubmitPipeline(
  input: PipelineSubmitInput,
): Promise<PipelineResult> {
  const stages: PipelineResult["stages"] = [];

  // 1. Private temporary storage (mock)
  stages.push({
    name: "private_storage",
    ok: true,
    detail: `Stored privately as ${input.sourceLabel || input.id}`,
  });

  // 2. Technical validation (mock)
  const hasTitle = Boolean(input.title.trim());
  const hasSource = Boolean(input.sourceLabel.trim());
  stages.push({
    name: "technical_validation",
    ok: hasTitle && hasSource,
    detail:
      hasTitle && hasSource
        ? "Package looks complete enough to check."
        : "Add a title and a file or link.",
  });

  // 3. AI moderation (mock heuristics)
  const ai = mockAiPrecheck({
    title: input.title,
    description: input.description,
    sourceLabel: input.sourceLabel,
  });
  stages.push({
    name: "ai_moderation",
    ok: ai.risk !== "high",
    detail:
      ai.flags.length > 0
        ? ai.flags.join("; ")
        : `Risk ${ai.risk} — no flags`,
  });

  // 4. Route to admin queue
  const status =
    ai.risk === "high" || ai.risk === "medium" ? "in_review" : "checking";
  stages.push({
    name: "admin_queue",
    ok: true,
    detail:
      status === "checking"
        ? "Queued for standard review."
        : "Flagged for special review.",
  });

  const submission: ProjectSubmission = {
    ...input,
    tags: input.tags ?? [],
    status,
    risk: ai.risk,
    aiFlags: ai.flags,
    changeRequest: null,
    updatedAt: new Date().toISOString(),
    plays: 0,
    reactions: 0,
    codeCheckedAt: null,
    playCheckedAt: null,
    reviewNotes: null,
    previewUrl: null,
  };

  return { submission, stages };
}

export const adminActions = [
  "prepare_preview",
  "confirm_play",
  "publish",
  "reject",
  "ask_for_changes",
  "escalate",
] as const;

export type AdminAction = (typeof adminActions)[number];

export function canPublish(project: ProjectSubmission): boolean {
  if (project.status === "published") return true; // refresh play unpack
  return Boolean(project.codeCheckedAt && project.playCheckedAt);
}

export function applyAdminAction(
  current: ProjectSubmission,
  action: AdminAction,
  note?: string,
): ProjectSubmission {
  const updatedAt = new Date().toISOString();
  switch (action) {
    case "prepare_preview":
      return {
        ...current,
        updatedAt,
      };
    case "confirm_play":
      return {
        ...current,
        playCheckedAt: updatedAt,
        status:
          current.codeCheckedAt && current.status !== "published"
            ? "approved"
            : current.status,
        updatedAt,
      };
    case "publish": {
      if (!canPublish(current) && current.status !== "published") {
        return current;
      }
      return {
        ...current,
        status: "published",
        changeRequest: null,
        updatedAt,
      };
    }
    case "reject":
      return {
        ...current,
        status: "rejected",
        changeRequest:
          note?.trim() || "We can’t publish this project right now.",
        codeCheckedAt: null,
        playCheckedAt: null,
        previewUrl: null,
        updatedAt,
      };
    case "ask_for_changes":
      return {
        ...current,
        status: "needs_changes",
        changeRequest:
          note?.trim() ||
          "Your project needs a small fix before it can go live.",
        codeCheckedAt: null,
        playCheckedAt: null,
        previewUrl: null,
        updatedAt,
      };
    case "escalate":
      return {
        ...current,
        status: "in_review",
        changeRequest: note?.trim() || current.changeRequest,
        updatedAt,
      };
  }
}
