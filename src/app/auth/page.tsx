"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { safeNextPath } from "@/lib/next-path";
import { SOCIAL_PROVIDERS } from "@/lib/social-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useSession } from "@/lib/session";

function AuthBody() {
  const router = useRouter();
  const search = useSearchParams();
  const next = safeNextPath(search.get("next"), "/explore");
  const onboardingNext = `/onboarding?next=${encodeURIComponent(next)}`;
  const linkError = search.get("error") === "link";
  const oauthError = search.get("error") === "oauth";
  const {
    signIn,
    signInWithOAuth,
    signInWithWhatsApp,
    verifyWhatsAppOtp,
    session,
  } = useSession();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [waCode, setWaCode] = useState("");
  const [waStep, setWaStep] = useState<"phone" | "code" | "done">("phone");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [socialHint, setSocialHint] = useState("");
  const [waHint, setWaHint] = useState("");
  const cloud = isSupabaseConfigured();
  const profileReady =
    Boolean(session.userId || session.email) &&
    session.interests.length >= 2 &&
    session.role !== "guest";

  async function startSocial(id: (typeof SOCIAL_PROVIDERS)[number]["id"]) {
    setSocialHint("");
    setOauthBusy(id);
    const message = await signInWithOAuth(id);
    if (message) {
      setSocialHint(message);
      setOauthBusy(null);
    }
  }

  async function sendWhatsAppCode() {
    setWaHint("");
    setBusy(true);
    const message = await signInWithWhatsApp(phone);
    setBusy(false);
    if (message) {
      setWaHint(message);
      return;
    }
    if (!cloud) {
      setWaStep("done");
      return;
    }
    setWaStep("code");
  }

  async function confirmWhatsAppCode() {
    setWaHint("");
    setBusy(true);
    const message = await verifyWhatsAppOtp(phone, waCode);
    setBusy(false);
    if (message) {
      setWaHint(message);
      return;
    }
    setWaStep("done");
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-5 py-12 md:px-8">
      <h1 className="text-4xl font-extrabold">Join Baiolo</h1>
      <p className="mt-3 text-lg text-ink-muted">
        Free account to play projects, leave reactions, and save favorites.
        WhatsApp, Google, Apple, and more — or a magic email link.
      </p>
      {(linkError || oauthError) && (
        <p className="mt-4 rounded-lg bg-warning/20 px-4 py-3 text-sm font-semibold">
          {oauthError
            ? "That social sign-in didn’t finish. Try again."
            : "That magic link didn’t work. Try sending a new one."}
        </p>
      )}

      {!sent && waStep !== "done" && (
        <div className="mt-8 rounded-xl bg-mint/40 p-5 shadow-[var(--shadow-1)]">
          <p className="text-lg font-extrabold">Continue with WhatsApp</p>
          <p className="mt-1 text-sm text-ink-muted">
            We’ll send a one-time code to your WhatsApp.
          </p>
          {waStep === "phone" ? (
            <form
              className="mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                void sendWhatsAppCode();
              }}
            >
              <label className="block">
                <span className="font-bold">Phone</span>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+48 500 000 000"
                  className="mt-2 min-h-14 w-full rounded-pill border-2 border-border bg-surface px-5 text-lg focus:border-brand focus:outline-none"
                />
              </label>
              <Button
                type="submit"
                className="mt-4 w-full"
                size="l"
                disabled={busy}
              >
                {busy ? "Sending…" : "Send WhatsApp code"}
              </Button>
            </form>
          ) : (
            <form
              className="mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                void confirmWhatsAppCode();
              }}
            >
              <label className="block">
                <span className="font-bold">Code from WhatsApp</span>
                <input
                  inputMode="numeric"
                  required
                  value={waCode}
                  onChange={(e) => setWaCode(e.target.value)}
                  placeholder="123456"
                  className="mt-2 min-h-14 w-full rounded-pill border-2 border-border bg-surface px-5 text-lg tracking-widest focus:border-brand focus:outline-none"
                />
              </label>
              <Button
                type="submit"
                className="mt-4 w-full"
                size="l"
                disabled={busy}
              >
                {busy ? "Checking…" : "Verify & join"}
              </Button>
              <button
                type="button"
                className="mt-3 w-full text-sm font-bold text-brand-strong underline"
                onClick={() => {
                  setWaStep("phone");
                  setWaCode("");
                  setWaHint("");
                }}
              >
                Use a different number
              </button>
            </form>
          )}
          {waHint && (
            <p className="mt-3 text-sm font-semibold text-ink">{waHint}</p>
          )}
          {!cloud && (
            <p className="mt-2 text-xs text-ink-muted">
              Demo mode: any number works without a real WhatsApp message.
            </p>
          )}
        </div>
      )}

      {waStep === "done" && (
        <div className="mt-8 rounded-xl bg-mint/50 p-6 shadow-[var(--shadow-1)]">
          <p className="text-xl font-extrabold">You’re in</p>
          <p className="mt-2 text-ink-muted">
            WhatsApp sign-in worked for <strong>{session.email || phone}</strong>
            .
          </p>
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
      )}

      {!sent && waStep !== "done" && (
        <div className="mt-8 space-y-3">
          <div className="mb-1 flex items-center gap-3 text-sm font-bold text-ink-muted">
            <span className="h-px flex-1 bg-border" />
            or continue with
            <span className="h-px flex-1 bg-border" />
          </div>
          {SOCIAL_PROVIDERS.map((p) => (
            <Button
              key={p.id}
              type="button"
              variant="secondary"
              size="l"
              className="w-full"
              disabled={Boolean(oauthBusy)}
              onClick={() => void startSocial(p.id)}
            >
              {oauthBusy === p.id ? "Opening…" : p.hint}
            </Button>
          ))}
          {socialHint && (
            <p className="text-sm font-semibold text-ink">{socialHint}</p>
          )}
        </div>
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
      ) : waStep !== "done" ? (
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
          <div className="mb-5 flex items-center gap-3 text-sm font-bold text-ink-muted">
            <span className="h-px flex-1 bg-border" />
            or email
            <span className="h-px flex-1 bg-border" />
          </div>
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
      ) : null}
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
