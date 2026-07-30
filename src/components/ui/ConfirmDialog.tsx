"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/LocaleProvider";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  /** When true, the confirm action cannot be submitted. */
  confirmDisabled?: boolean;
  children?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = "primary",
  confirmDisabled = false,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const t = useT();
  const resolvedConfirm = confirmLabel ?? t("confirm.yes");
  const resolvedCancel = cancelLabel ?? t("confirm.cancel");
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => {
      if (confirmDisabled) {
        cancelRef.current?.focus();
      } else {
        confirmRef.current?.focus();
      }
    }, 0);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onCancel, confirmDisabled]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1e1b4b]/40 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="w-full max-w-md rounded-xl bg-surface p-6 shadow-[var(--shadow-3)]"
      >
        <h2 id={titleId} className="text-2xl font-extrabold text-ink">
          {title}
        </h2>
        <p id={bodyId} className="mt-3 text-ink-muted">
          {body}
        </p>
        {children ? <div className="mt-4">{children}</div> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            ref={confirmRef}
            variant={tone === "danger" ? "destructive" : "primary"}
            disabled={confirmDisabled}
            onClick={() => {
              if (confirmDisabled) return;
              onConfirm();
            }}
          >
            {resolvedConfirm}
          </Button>
          <Button ref={cancelRef} variant="ghost" onClick={onCancel}>
            {resolvedCancel}
          </Button>
        </div>
      </div>
    </div>
  );
}
