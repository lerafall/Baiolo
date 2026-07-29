import type { ProjectStatus, ProjectSubmission } from "@/lib/moderation";
import type { PipelineStageView } from "@/lib/status-progress";

export function stagesForStatus(
  status: ProjectStatus | undefined,
  snapshot: PipelineStageView[] = [],
): PipelineStageView[] {
  const base =
    snapshot.length > 0
      ? snapshot
      : [
          {
            name: "private_storage",
            ok: true,
            detail: "Stored privately for checking.",
          },
          {
            name: "technical_validation",
            ok: true,
            detail: "Package looks complete enough to check.",
          },
          {
            name: "ai_moderation",
            ok: true,
            detail: "Friendly safety check finished.",
          },
          {
            name: "admin_queue",
            ok: true,
            detail: "Queued for human review.",
          },
        ];

  if (!status || status === "draft") {
    return [
      {
        name: "draft",
        ok: true,
        detail: "Still a draft — submit when you’re ready.",
      },
    ];
  }

  if (status === "checking" || status === "submitted") {
    return [
      ...base,
      {
        name: "live_checking",
        ok: true,
        detail: "Still checking — this usually takes a moment.",
      },
    ];
  }

  if (status === "in_review") {
    return [
      ...base.filter((s) => s.name !== "live_checking"),
      {
        name: "human_review",
        ok: true,
        detail: "A Baiolo teammate is reviewing it now.",
      },
    ];
  }

  if (status === "needs_changes") {
    return [
      ...base,
      {
        name: "needs_changes",
        ok: false,
        detail: "A small fix is needed before it can go live.",
      },
    ];
  }

  if (status === "published" || status === "approved") {
    return [
      ...base,
      {
        name: "published",
        ok: true,
        detail: "Approved — it’s ready for people to try.",
      },
    ];
  }

  if (status === "rejected") {
    return [
      ...base,
      {
        name: "rejected",
        ok: false,
        detail: "This project can’t go public right now.",
      },
    ];
  }

  return base;
}

/** Rough SLA copy key suffix based on status + plan priority. */
export function slaHintKey(
  status: ProjectStatus,
  priority: boolean,
): "draft" | "checking" | "review" | "reviewFast" | "changes" | "done" | "rejected" {
  if (status === "draft") return "draft";
  if (status === "checking" || status === "submitted") return "checking";
  if (status === "needs_changes") return "changes";
  if (status === "published" || status === "approved") return "done";
  if (status === "rejected") return "rejected";
  return priority ? "reviewFast" : "review";
}

export function waitingMs(iso: string, now = Date.now()) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, now - t);
}

export function formatWaitingDuration(ms: number) {
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "<1m";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) {
    const rem = mins % 60;
    return rem ? `${hours}h ${rem}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function canWithdrawSubmission(p: ProjectSubmission) {
  return (
    p.status === "submitted" ||
    p.status === "checking" ||
    p.status === "in_review" ||
    p.visibility === "pending_public"
  );
}

export function canEditSubmission(p: ProjectSubmission) {
  return (
    p.status === "draft" ||
    p.status === "needs_changes" ||
    p.status === "rejected" ||
    canWithdrawSubmission(p)
  );
}
