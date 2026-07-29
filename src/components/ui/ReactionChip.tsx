"use client";

import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/LocaleProvider";
import type { ReactionKind } from "@/lib/types";

const labelKeys: Record<ReactionKind, string> = {
  fun: "reaction.fun",
  interesting: "reaction.interesting",
  "would-use-again": "reaction.wouldUseAgain",
};

const accents: Record<ReactionKind, string> = {
  fun: "hover:border-accent-sun data-[on=true]:border-accent-sun data-[on=true]:bg-sun/40",
  interesting:
    "hover:border-secondary data-[on=true]:border-secondary data-[on=true]:bg-mint/50",
  "would-use-again":
    "hover:border-brand data-[on=true]:border-brand data-[on=true]:bg-lilac/70",
};

type ReactionChipProps = {
  kind: ReactionKind;
  count?: number;
  selected?: boolean;
  onToggle?: (kind: ReactionKind) => void;
};

export function ReactionChip({
  kind,
  count,
  selected,
  onToggle,
}: ReactionChipProps) {
  const t = useT();
  return (
    <button
      type="button"
      data-on={selected}
      onClick={() => onToggle?.(kind)}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-pill border-2 border-border bg-surface px-4 text-sm font-bold text-ink transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-[var(--shadow-1)]",
        accents[kind],
        selected && "animate-spark shadow-[var(--shadow-1)]",
      )}
    >
      <span>{t(labelKeys[kind])}</span>
      {typeof count === "number" && (
        <span className="rounded-pill bg-lilac/70 px-2 py-0.5 text-xs text-ink-muted">
          {count}
        </span>
      )}
    </button>
  );
}
