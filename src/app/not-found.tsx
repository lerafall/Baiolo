"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/LocaleProvider";

export default function NotFound() {
  const t = useT();
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-5 text-center">
      <h1 className="text-4xl font-extrabold">{t("errors.notFound")}</h1>
      <p className="mt-3 text-lg text-ink-muted">{t("errors.notFoundBody")}</p>
      <Button href="/explore" className="mt-8" size="l">
        {t("errors.backExplore")}
      </Button>
      <Link href="/" className="mt-4 font-bold text-brand-strong underline">
        {t("errors.goHome")}
      </Link>
    </main>
  );
}
