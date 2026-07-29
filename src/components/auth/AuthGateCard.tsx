"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { authHref } from "@/lib/next-path";
import { useT } from "@/lib/i18n/LocaleProvider";

type AuthGateCardProps = {
  title?: string;
  body?: string;
  nextPath: string;
  /** Show a softer “join to play” vs “join to react” */
  actionLabel?: string;
};

export function AuthGateCard({
  title,
  body,
  nextPath,
  actionLabel,
}: AuthGateCardProps) {
  const t = useT();

  return (
    <div className="rounded-xl border-2 border-brand/30 bg-lilac/45 p-8 text-center shadow-[var(--shadow-1)]">
      <p className="text-2xl font-extrabold text-ink">
        {title ?? t("gate.title")}
      </p>
      <p className="mx-auto mt-3 max-w-md text-ink-muted">
        {body ?? t("gate.body")}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button href={authHref(nextPath)} size="l">
          {actionLabel ?? t("gate.action")}
        </Button>
        <Button
          href={authHref(nextPath, { mode: "signin" })}
          variant="secondary"
          size="l"
        >
          {t("gate.signIn")}
        </Button>
      </div>
      <p className="mt-4 text-sm text-ink-muted">
        {t("gate.browseFirst")}{" "}
        <Link href="/explore" className="font-bold text-brand-strong underline">
          {t("gate.exploreWithout")}
        </Link>
      </p>
    </div>
  );
}
