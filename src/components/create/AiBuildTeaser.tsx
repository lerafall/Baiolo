"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { authHref } from "@/lib/next-path";
import { useT } from "@/lib/i18n/LocaleProvider";

type AiBuildTeaserProps = {
  signedIn: boolean;
};

/** v1 stub — full OpenAI path (A) comes next; external module (B) later. */
export function AiBuildTeaser({ signedIn }: AiBuildTeaserProps) {
  const t = useT();

  if (!signedIn) {
    return (
      <div className="rounded-xl border-2 border-brand/30 bg-lilac/40 p-6 text-center">
        <p className="text-xl font-extrabold">{t("workshop.aiTitle")}</p>
        <p className="mt-2 text-ink-muted">{t("workshop.aiNeedAccount")}</p>
        <Button href={authHref("/create", { mode: "join" })} className="mt-5" size="l">
          {t("workshop.aiJoin")}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-border bg-mint/30 p-6">
      <p className="text-xl font-extrabold">{t("workshop.aiTitle")}</p>
      <p className="mt-2 text-ink-muted">{t("workshop.aiComing")}</p>
      <p className="mt-4 text-sm text-ink-muted">{t("workshop.aiMeanwhile")}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button href="/make" variant="secondary">
          {t("nav.make")}
        </Button>
        <Link href="/create" className="text-sm font-bold text-brand-strong underline self-center">
          {t("workshop.aiUseHtml")}
        </Link>
      </div>
    </div>
  );
}
