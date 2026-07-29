"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/LocaleProvider";

export function SiteFooter() {
  const t = useT();
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
          <p className="text-sm text-ink-muted">{t("footer.tagline")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-ink-muted">
          <Link href="/explore" className="hover:text-ink">
            {t("nav.explore")}
          </Link>
          <Link href="/make" className="hover:text-ink">
            {t("nav.make")}
          </Link>
          <Link href="/create" className="hover:text-ink">
            {t("nav.create")}
          </Link>
          <Link href="/this-week" className="hover:text-ink">
            {t("nav.thisWeek")}
          </Link>
          <Link href="/safety" className="hover:text-ink">
            {t("nav.safety")}
          </Link>
          <Link href="/admin" className="hover:text-ink">
            {t("nav.admin")}
          </Link>
          <span className="rounded-pill bg-lilac/70 px-3 py-1 text-xs uppercase tracking-wide text-brand-strong">
            {t("common.mode", { mode })}
          </span>
        </div>
      </div>
    </footer>
  );
}
