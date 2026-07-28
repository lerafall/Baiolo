"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useNotifications } from "@/lib/notifications";
import { notificationHref } from "@/lib/notification-href";
import { useSubmissions } from "@/lib/submissions";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function NotificationBell() {
  const { items } = useSubmissions();
  const watch = useMemo(
    () =>
      items
        .filter((p) => p.status !== "draft")
        .map((p) => ({ id: p.id, title: p.title, status: p.status })),
    [items],
  );
  const { notes, unread, markRead } = useNotifications(watch);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label={unread ? `${unread} new updates` : "Notifications"}
        aria-expanded={open}
        className="relative flex size-11 items-center justify-center rounded-full border-2 border-border bg-surface text-lg font-bold text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
        onClick={() => setOpen((v) => !v)}
      >
        ✶
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-accent-coral text-[10px] font-extrabold text-on-brand">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-border bg-surface p-3 shadow-[var(--shadow-2)]">
          <p className="px-2 text-sm font-extrabold text-ink">Updates</p>
          <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto">
            {notes.length === 0 && (
              <li className="px-2 py-4 text-sm text-ink-muted">
                No updates yet. Status changes will show up here.
              </li>
            )}
            {notes.slice(0, 12).map((n) => (
              <li key={n.id}>
                <Link
                  href={notificationHref(n.status, n.projectId)}
                  className={cn(
                    "block rounded-lg px-2 py-2 hover:bg-lilac/40",
                    !n.read && "bg-lilac/30",
                  )}
                  onClick={() => {
                    markRead(n.id);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <p className="truncate font-bold text-ink">{n.title}</p>
                    <StatusBadge status={n.status} />
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">{n.message}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
