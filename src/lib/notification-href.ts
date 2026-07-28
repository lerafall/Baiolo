import type { ProjectStatus } from "@/lib/moderation";

export function notificationHref(status: ProjectStatus, projectId: string) {
  if (status === "published" || status === "approved") {
    return `/project/${projectId}`;
  }
  if (status === "needs_changes" || status === "draft") {
    return `/create?edit=${encodeURIComponent(projectId)}`;
  }
  return "/projects";
}
