"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export function ModeBadge({ className }: { className?: string }) {
  const [mode, setMode] = useState<"mock" | "supabase" | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/health")
      .then((r) => r.json() as Promise<{ mode?: string }>)
      .then((data) => {
        if (cancelled) return;
        setMode(data.mode === "supabase" ? "supabase" : "mock");
      })
      .catch(() => {
        if (!cancelled) setMode("mock");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!mode) return null;

  return (
    <span
      className={cn(
        "hidden rounded-pill px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide sm:inline-flex",
        mode === "supabase"
          ? "bg-mint/70 text-secondary-strong"
          : "bg-lilac/70 text-brand-strong",
        className,
      )}
      title={
        mode === "supabase"
          ? "Connected to Supabase"
          : "Running on local mock store"
      }
    >
      {mode === "supabase" ? "Cloud" : "Local"}
    </span>
  );
}
