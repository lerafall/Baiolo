import { cn } from "@/lib/cn";
import { statusCopy, statusTone, type ProjectStatus } from "@/lib/moderation";

export function StatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const copy = statusCopy[status];
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-pill px-3 text-sm font-bold",
        statusTone[status],
        className,
      )}
    >
      {copy.label}
    </span>
  );
}

export function StatusMessage({ status }: { status: ProjectStatus }) {
  return (
    <p className="text-sm text-ink-muted">{statusCopy[status].message}</p>
  );
}
