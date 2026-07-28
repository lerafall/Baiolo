"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

const KEY = "baiolo.install-hint.dismissed";

export function InstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "1") return;
    } catch {
      return;
    }
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean(
        (window.navigator as Navigator & { standalone?: boolean }).standalone,
      );
    if (standalone) return;
    setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-[4.5rem] z-30 mx-auto w-[min(100%-1.5rem,28rem)] rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-2)] md:bottom-6">
      <p className="font-extrabold text-ink">Install Baiolo?</p>
      <p className="mt-1 text-sm text-ink-muted">
        Add it to your home screen for a quicker, app-like feel. Use your
        browser’s Share / Install menu.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="m"
          variant="secondary"
          onClick={() => {
            try {
              localStorage.setItem(KEY, "1");
            } catch {
              /* ignore */
            }
            setShow(false);
          }}
        >
          Got it
        </Button>
      </div>
    </div>
  );
}
