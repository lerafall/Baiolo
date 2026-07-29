"use client";

import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/LocaleProvider";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-5 text-center">
      <h1 className="text-3xl font-extrabold">{t("errors.title")}</h1>
      <p className="mt-3 text-lg text-ink-muted">{t("errors.body")}</p>
      <Button className="mt-8" size="l" onClick={reset}>
        {t("errors.tryAgain")}
      </Button>
    </main>
  );
}
