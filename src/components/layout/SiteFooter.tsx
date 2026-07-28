"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function SiteFooter() {
  const [mode, setMode] = useState<"mock" | "supabase" | "…">("…");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data: { mode?: "mock" | "supabase" }) => {
        setMode(data.mode === "supabase" ? "supabase" : "mock");
      })
      .catch(() => setMode("mock"));
  }, []);

  return (
    <footer className="mt-auto border-t border-border/70 bg-canvas px-5 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-extrabold text-brand-strong">Baiolo</p>
          <p className="text-sm text-ink-muted">
            Share little ideas. See which ones grow.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-ink-muted">
          <Link href="/explore" className="hover:text-ink">
            Explore
          </Link>
          <Link href="/create" className="hover:text-ink">
            Create
          </Link>
          <Link href="/this-week" className="hover:text-ink">
            This week
          </Link>
          <Link href="/safety" className="hover:text-ink">
            Stay safe
          </Link>
          <Link href="/admin" className="hover:text-ink">
            Admin
          </Link>
          <span className="rounded-pill bg-lilac/70 px-3 py-1 text-xs uppercase tracking-wide text-brand-strong">
            {mode} mode
          </span>
        </div>
      </div>
    </footer>
  );
}
