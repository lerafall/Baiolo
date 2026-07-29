"use client";

import { useT } from "@/lib/i18n/LocaleProvider";

export default function Loading() {
  const t = useT();
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-6xl items-center justify-center px-5">
      <div className="text-center">
        <div className="animate-floaty mx-auto size-14 rounded-full bg-lilac shadow-[var(--shadow-1)]" />
        <p className="mt-6 text-lg font-bold text-ink-muted">
          {t("errors.loadingBaiolo")}
        </p>
      </div>
    </main>
  );
}
