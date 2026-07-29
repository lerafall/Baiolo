"use client";

import { cn } from "@/lib/cn";
import { statusTone, type ProjectStatus } from "@/lib/moderation";
import { useT } from "@/lib/i18n/LocaleProvider";

export function StatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const t = useT();
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-pill px-3 text-sm font-bold",
        statusTone[status],
        className,
      )}
    >
      {t(`status.${status}`)}
    </span>
  );
}

export function StatusMessage({ status }: { status: ProjectStatus }) {
  const t = useT();
  return (
    <p className="text-sm text-ink-muted">{t(`statusMsg.${status}`)}</p>
  );
}
