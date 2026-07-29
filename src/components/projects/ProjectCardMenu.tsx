"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/LocaleProvider";

type ProjectCardMenuProps = {
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  archiveLabel?: string;
  busy?: boolean;
};

export function ProjectCardMenu({
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  archiveLabel,
  busy,
}: ProjectCardMenuProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-border bg-surface text-xl font-extrabold text-ink hover:border-brand disabled:opacity-50"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sr-only">{t("projects.moreActions")}</span>
        ⋯
      </button>
      {open && (
        <ul
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-2 min-w-[11rem] overflow-hidden rounded-xl border-2 border-border bg-surface py-1 shadow-[var(--shadow-2)]"
        >
          {(
            [
              { label: t("projects.menuEdit"), action: onEdit },
              { label: t("projects.menuDuplicate"), action: onDuplicate },
              {
                label: archiveLabel || t("projects.menuArchive"),
                action: onArchive,
              },
              { label: t("projects.menuDelete"), action: onDelete, danger: true },
            ] as Array<{ label: string; action: () => void; danger?: boolean }>
          ).map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                className={cn(
                  "block w-full px-4 py-2.5 text-left text-sm font-bold hover:bg-lilac/40",
                  item.danger && "text-danger",
                )}
                onClick={() => {
                  setOpen(false);
                  item.action();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
