"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useShareLinks } from "@/lib/auth-gate";
import { cn } from "@/lib/cn";

type ShareProjectPanelProps = {
  projectId: string;
  title: string;
  tagline: string;
  /** Larger hero treatment for creators after submit / on project page */
  emphasis?: "hero" | "compact";
  className?: string;
};

export function ShareProjectPanel({
  projectId,
  title,
  tagline,
  emphasis = "hero",
  className,
}: ShareProjectPanelProps) {
  const links = useShareLinks(projectId, title, tagline);
  const { push } = useToast();
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(links.url);
      setCopied(true);
      push("Link copied — send it to friends!");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      push("Couldn’t copy the link.", "warn");
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
        push("Shared!");
        return;
      }
    } catch {
      /* cancelled or unsupported */
    }
    await copyLink();
  }

  const hero = emphasis === "hero";

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
        Share with friends
      </p>
      <h2
        className={cn(
          "mt-2 font-extrabold text-ink",
          hero ? "text-2xl md:text-3xl" : "text-xl",
        )}
      >
        {hero
          ? "Send this to people you know"
          : "Invite friends to try it"}
      </h2>
      <p className="mt-2 max-w-xl text-ink-muted">
        The more friends open it, the more reactions you get — and Baiolo grows
        with every share.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="button" size="l" onClick={() => void nativeShare()}>
          Share now
        </Button>
        <Button
          type="button"
          size="l"
          variant="secondary"
          onClick={() => void copyLink()}
        >
          {copied ? "Copied!" : "Copy link"}
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
