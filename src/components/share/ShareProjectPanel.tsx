"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useShareLinks } from "@/lib/auth-gate";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/LocaleProvider";

type ShareProjectPanelProps = {
  projectId: string;
  title: string;
  tagline: string;
  /** Larger hero treatment for creators after submit / on project page */
  emphasis?: "hero" | "compact";
  /** Public social share only after admin publish. */
  publicShare?: boolean;
  className?: string;
};

export function ShareProjectPanel({
  projectId,
  title,
  tagline,
  emphasis = "hero",
  publicShare = true,
  className,
}: ShareProjectPanelProps) {
  const t = useT();
  const links = useShareLinks(projectId, title, tagline);
  const { push } = useToast();
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(links.url);
      setCopied(true);
      push(t("share.linkCopied"));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      push(t("share.copyFail"), "warn");
    }
  }

  async function nativeShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: links.text,
          url: links.url,
        });
        push(t("share.shared"));
        return;
      }
    } catch {
      /* cancelled or unsupported */
    }
    await copyLink();
  }

  const hero = emphasis === "hero";

  if (!publicShare) {
    return (
      <section
        className={cn(
          "rounded-xl border-2 border-brand/30 bg-lilac/40 p-5 shadow-[var(--shadow-1)] md:p-6",
          className,
        )}
      >
        <p className="text-sm font-bold uppercase tracking-wide text-brand-strong">
          {t("share.privateEyebrow")}
        </p>
        <h2 className="mt-2 text-xl font-extrabold text-ink md:text-2xl">
          {t("share.privateTitle")}
        </h2>
        <p className="mt-2 max-w-xl text-ink-muted">{t("share.privateBody")}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button href={`/play/${projectId}`} size="l">
            {t("share.playPrivately")}
          </Button>
          <Button href="/projects" size="l" variant="secondary">
            {t("share.seeStatus")}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "rounded-xl shadow-[var(--shadow-1)]",
        hero
          ? "border-2 border-brand/40 bg-gradient-to-br from-lilac/70 via-mint/40 to-sun/30 p-6 md:p-8"
          : "border border-border bg-surface p-5",
        className,
      )}
    >
      <p className="text-sm font-bold uppercase tracking-wide text-brand-strong">
        {t("share.eyebrow")}
      </p>
      <h2
        className={cn(
          "mt-2 font-extrabold text-ink",
          hero ? "text-2xl md:text-3xl" : "text-xl",
        )}
      >
        {hero ? t("share.heroTitle") : t("share.compactTitle")}
      </h2>
      <p className="mt-2 max-w-xl text-ink-muted">{t("share.body")}</p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="button" size="l" onClick={() => void nativeShare()}>
          {t("share.shareNow")}
        </Button>
        <Button
          type="button"
          size="l"
          variant="secondary"
          onClick={() => void copyLink()}
        >
          {copied ? t("share.copied") : t("share.copyLink")}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { href: links.whatsapp, label: "WhatsApp" },
          { href: links.facebook, label: "Facebook" },
          { href: links.twitter, label: "X / Twitter" },
          { href: links.telegram, label: "Telegram" },
        ].map((item) => (
          <a
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-pill border-2 border-border bg-surface px-4 text-sm font-bold text-ink transition-colors hover:border-brand hover:bg-lilac/40"
          >
            {item.label}
          </a>
        ))}
      </div>

      <p className="mt-4 break-all rounded-lg bg-surface/80 px-3 py-2 font-mono text-xs text-ink-muted">
        {links.url}
      </p>
    </section>
  );
}
