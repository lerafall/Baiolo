"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { authHref } from "@/lib/next-path";

type AuthGateCardProps = {
  title?: string;
  body?: string;
  nextPath: string;
  /** Show a softer “join to play” vs “join to react” */
  actionLabel?: string;
};

export function AuthGateCard({
  title = "Join to continue",
  body = "Create a free Baiolo account to play, react, and save favorites. It only takes a moment.",
  nextPath,
  actionLabel = "Join / sign in",
}: AuthGateCardProps) {
  return (
    <div className="rounded-xl border-2 border-brand/30 bg-lilac/45 p-8 text-center shadow-[var(--shadow-1)]">
      <p className="text-2xl font-extrabold text-ink">{title}</p>
      <p className="mx-auto mt-3 max-w-md text-ink-muted">{body}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button href={authHref(nextPath)} size="l">
          {actionLabel}
        </Button>
        <Button href="/explore" variant="secondary" size="l">
          Browse without playing
        </Button>
      </div>
      <p className="mt-4 text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href={authHref(nextPath)} className="font-bold text-brand-strong underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
