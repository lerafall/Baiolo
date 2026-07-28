"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { safeNextPath } from "@/lib/next-path";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useSession } from "@/lib/session";

function AuthBody() {
  const router = useRouter();
  const search = useSearchParams();
  const next = safeNextPath(search.get("next"), "/explore");
  const onboardingNext = `/onboarding?next=${encodeURIComponent(next)}`;
  const linkError = search.get("error") === "link";
  const { signIn, session } = useSession();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");
  const cloud = isSupabaseConfigured();
  const profileReady =
    Boolean(session.email) &&
    session.interests.length >= 2 &&
    session.role !== "guest";

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-5 py-12 md:px-8">
      <h1 className="text-4xl font-extrabold">Join Baiolo</h1>
      <p className="mt-3 text-lg text-ink-muted">
        {cloud
          ? "We’ll email a magic link. No password to remember."
          : "We will send a magic link. No password to remember."}
      </p>
      {linkError && (
        <p className="mt-4 rounded-lg bg-warning/20 px-4 py-3 text-sm font-semibold">
          That magic link didn’t work. Try sending a new one.
        </p>
      )}

      {sent ? (
        <div className="mt-8 rounded-xl bg-mint/50 p-6 shadow-[var(--shadow-1)]">
          <p className="text-xl font-extrabold">
            {cloud ? "Check your inbox" : "You’re in"}
          </p>
          <p className="mt-2 text-ink-muted">
            {cloud ? (
              <>
                We sent a link to <strong>{email}</strong>. Open it on this
                device to finish signing in.
              </>
            ) : (
              <>
                Demo mode for <strong>{email}</strong>. Continue to Baiolo.
              </>
            )}
          </p>
          {hint && (
            <p className="mt-3 text-sm font-semibold text-ink">{hint}</p>
          )}
          <Button
            className="mt-6"
            size="l"
            onClick={() =>
              router.push(profileReady ? next : onboardingNext)
            }
          >
            Continue
          </Button>
        </div>
      ) : (
        <form
          className="mt-8"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.includes("@")) return;
            setBusy(true);
            void signIn(email).then((message) => {
              setHint(message ?? "");
              setSent(true);
              setBusy(false);
            });
          }}
        >
          <label className="block">
            <span className="font-bold">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 min-h-14 w-full rounded-pill border-2 border-border px-5 text-lg focus:border-brand focus:outline-none"
            />
          </label>
          <Button
            type="submit"
            className="mt-6 w-full"
            size="l"
            disabled={busy}
          >
            {busy
              ? "Sending…"
              : cloud
                ? "Send magic link"
                : "Continue (demo)"}
          </Button>
        </form>
      )}
    </main>
  );
}

export default function AuthPage() {
  return (
    <>
      <SiteHeader showJoin={false} />
      <Suspense
        fallback={
          <main className="mx-auto max-w-md px-5 py-16 text-ink-muted">
            Loading…
          </main>
        }
      >
        <AuthBody />
      </Suspense>
    </>
  );
}
