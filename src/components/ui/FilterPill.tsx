"use client";

import { cn } from "@/lib/cn";

type FilterPillProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
};

export function FilterPill({ label, active, onClick }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-11 rounded-pill border-2 px-5 text-base font-bold transition-all duration-200",
        active
          ? "border-brand bg-brand text-on-brand shadow-[var(--shadow-1)]"
          : "border-border bg-surface text-ink-muted hover:border-border-strong hover:bg-lilac/50 hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}
