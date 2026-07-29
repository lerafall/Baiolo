"use client";

import { useT } from "@/lib/i18n/LocaleProvider";

export function SkipToContent() {
  const t = useT();
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-pill focus:bg-brand focus:px-4 focus:py-2 focus:font-bold focus:text-on-brand"
    >
      {t("common.skipToContent")}
    </a>
  );
}
