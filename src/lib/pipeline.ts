import type { ProjectSubmission, ProjectVisibility } from "@/lib/moderation";
import { sourceTypeFromUploadType } from "@/lib/ai-usage";
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
> & {
  tags?: string[];
  /** private = play yourself only; public = enter admin review for Explore */
  shareIntent?: "private" | "public";
};

export type PipelineResult = {
  submission: ProjectSubmission;
  stages: Array<{ name: string; ok: boolean; detail: string }>;
};

export async function runSubmitPipeline(
  input: PipelineSubmitInput,
): Promise<PipelineResult> {
  const stages: PipelineResult["stages"] = [];
  const shareIntent = input.shareIntent === "public" ? "public" : "private";

  stages.push({
    name: "private_storage",
    ok: true,
    detail: `Stored privately as ${input.sourceLabel || input.id}`,
  });

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

  let status: ProjectSubmission["status"];
  let visibility: ProjectVisibility;
  let adminDetail: string;

  if (shareIntent === "private") {
    // Creator can play immediately; Explore waits for explicit public request.
    status = "approved";
    visibility = "private";
    adminDetail = "Saved as private play — request public share when ready.";
    stages.push({
      name: "admin_queue",
      ok: true,
      detail: adminDetail,
    });
  } else {
    status =
      ai.risk === "high" || ai.risk === "medium" ? "in_review" : "checking";
    visibility = "pending_public";
    adminDetail =
      status === "checking"
        ? "Queued for standard public review."
        : "Flagged for special public review.";
    stages.push({
      name: "admin_queue",
      ok: true,
      detail: adminDetail,
    });
  }

  const { shareIntent: _omit, ...rest } = input;
  const submission: ProjectSubmission = {
    ...rest,
    tags: input.tags ?? [],
    status,
    sourceType: sourceTypeFromUploadType(input.uploadType),
    aiSlotActive: input.uploadType === "ai",
    visibility,
    sharedWith: input.sharedWith ?? [],
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

/** Move a private build into the public review queue. */
export function requestPublicShare(
  current: ProjectSubmission,
): ProjectSubmission {
  if (current.status === "published" || current.visibility === "public") {
    return current;
  }
  return {
    ...current,
    visibility: "pending_public",
    status:
      current.risk === "high" || current.risk === "medium"
        ? "in_review"
        : "checking",
    updatedAt: new Date().toISOString(),
  };
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
  if (project.status === "published") return true;
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
        visibility: "public",
        changeRequest: null,
        updatedAt,
      };
    }
    case "reject":
      return {
        ...current,
        status: "rejected",
        visibility: "private",
        changeRequest:
          note?.trim() || "We can’t publish this project right now.",
        codeCheckedAt: null,
        playCheckedAt: null,
        previewUrl: current.previewUrl,
        updatedAt,
      };
    case "ask_for_changes":
      return {
        ...current,
        status: "needs_changes",
        visibility: "private",
        changeRequest:
          note?.trim() ||
          "Your project needs a small fix before it can go live.",
        codeCheckedAt: null,
        playCheckedAt: null,
        previewUrl: current.previewUrl,
        updatedAt,
      };
    case "escalate":
      return {
        ...current,
        status: "in_review",
        visibility: "pending_public",
        changeRequest: note?.trim() || current.changeRequest,
        updatedAt,
      };
  }
}
