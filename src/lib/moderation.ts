import type { ProjectCategory } from "@/lib/types";

export type ProjectStatus =
  | "draft"
  | "submitted"
  | "checking"
  | "needs_changes"
  | "in_review"
  | "approved"
  | "published"
  | "rejected";

export type RiskLevel = "low" | "medium" | "high";

export type UploadType = "zip" | "link" | "template";

export type ProjectSubmission = {
  id: string;
  uploadType: UploadType | null;
  sourceLabel: string;
  title: string;
  description: string;
  category: ProjectCategory | null;
  tags: string[];
  thumbnail: string;
  status: ProjectStatus;
  risk: RiskLevel | null;
  aiFlags: string[];
  changeRequest: string | null;
  updatedAt: string;
  plays: number;
  reactions: number;
  ownerId?: string | null;
  storagePath?: string | null;
  playUrl?: string | null;
  /** Admin-only play URL while reviewing (not public Explore). */
  previewUrl?: string | null;
  codeCheckedAt?: string | null;
  playCheckedAt?: string | null;
  reviewNotes?: string | null;
};

export const statusCopy: Record<
  ProjectStatus,
  { label: string; message: string }
> = {
  draft: {
    label: "Draft",
    message: "Saved for later. You can keep building anytime.",
  },
  submitted: {
    label: "Submitted",
    message: "We got your project. Checking starts soon.",
  },
  checking: {
    label: "Checking",
    message: "We’re checking your project now.",
  },
  needs_changes: {
    label: "Needs changes",
    message: "Your project needs a small fix before it can go live.",
  },
  in_review: {
    label: "In review",
    message: "A Baiolo team member is reviewing it.",
  },
  approved: {
    label: "Approved",
    message: "Checked and play-tested — waiting to go live.",
  },
  published: {
    label: "Published",
    message: "Your project is live for everyone to try.",
  },
  rejected: {
    label: "Rejected",
    message: "We can’t publish this project right now.",
  },
};

export const statusTone: Record<ProjectStatus, string> = {
  draft: "bg-muted/60 text-ink",
  submitted: "bg-lilac/70 text-brand-strong",
  checking: "bg-lilac text-brand-strong",
  needs_changes: "bg-warning/20 text-ink",
  in_review: "bg-mint/60 text-secondary-strong",
  approved: "bg-success/20 text-ink",
  published: "bg-success/25 text-ink",
  rejected: "bg-danger/15 text-danger",
};
