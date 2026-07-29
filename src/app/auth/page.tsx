"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  authHref,
  authModeFromSearch,
  safeNextPath,
  type AuthMode,
} from "@/lib/next-path";
import {
  VISIBLE_SOCIAL_PROVIDERS,
  type SocialProviderId,
} from "@/lib/social-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useT } from "@/lib/i18n/LocaleProvider";
import { DictationField } from "@/components/ui/DictationField";
import { useSession } from "@/lib/session";

function AuthBody() {
  const t = useT();
  const router = useRouter();
  const search = useSearchParams();
  const next = safeNextPath(search.get("next"), "/explore");
  const mode = authModeFromSearch(search.get("mode"));
  const signingIn = mode === "signin";
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

  function modeHref(nextMode: AuthMode) {
    return authHref(next, { mode: nextMode === "signin" ? "signin" : "join" });
  }

  async function startSocial(id: SocialProviderId) {
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
      <div className="flex rounded-pill border-2 border-border bg-surface p-1">
        <Link
          href={modeHref("join")}
          className={cn(
            "flex-1 rounded-pill py-2.5 text-center text-sm font-extrabold transition-colors",
            !signingIn
              ? "bg-brand text-on-brand"
              : "text-ink-muted hover:text-ink",
          )}
        >
          {t("auth.joinTab")}
        </Link>
        <Link
          href={modeHref("signin")}
          className={cn(
            "flex-1 rounded-pill py-2.5 text-center text-sm font-extrabold transition-colors",
            signingIn
              ? "bg-brand text-on-brand"
              : "text-ink-muted hover:text-ink",
          )}
        >
          {t("auth.signInTab")}
        </Link>
      </div>

      <h1 className="mt-8 text-4xl font-extrabold">
        {signingIn ? t("auth.signInTitle") : t("auth.joinTitle")}
      </h1>
      <p className="mt-3 text-lg text-ink-muted">
        {signingIn ? t("auth.signInSub") : t("auth.joinSub")}
      </p>
      {(linkError || oauthError) && (
        <p className="mt-4 rounded-lg bg-warning/20 px-4 py-3 text-sm font-semibold">
          {oauthError
            ? t("auth.oauthFail")
            : t("auth.linkFail")}
        </p>
      )}

      {!sent && waStep !== "done" && (
        <div className="mt-8 rounded-xl bg-mint/40 p-5 shadow-[var(--shadow-1)]">
          <p className="text-lg font-extrabold">
            {signingIn ? t("auth.waSignInTitle") : t("auth.waJoinTitle")}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {t("auth.waHint")}
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
                <span className="font-bold">{t("auth.phone")}</span>
                <DictationField
                  className="mt-2"
                  value={phone}
                  onChange={setPhone}
                  append={false}
                >
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+48 500 000 000"
                    className="min-h-14 w-full rounded-pill border-2 border-border bg-surface px-5 text-lg focus:border-brand focus:outline-none"
                  />
                </DictationField>
              </label>
              <Button
                type="submit"
                className="mt-4 w-full"
                size="l"
                disabled={busy}
              >
                {busy ? t("auth.sending") : t("auth.sendCode")}
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
                <span className="font-bold">{t("auth.codeLabel")}</span>
                <DictationField
                  className="mt-2"
                  value={waCode}
                  onChange={setWaCode}
                  append={false}
                >
                  <input
                    inputMode="numeric"
                    required
                    value={waCode}
                    onChange={(e) => setWaCode(e.target.value)}
                    placeholder="123456"
                    className="min-h-14 w-full rounded-pill border-2 border-border bg-surface px-5 text-lg tracking-widest focus:border-brand focus:outline-none"
                  />
                </DictationField>
              </label>
              <Button
                type="submit"
                className="mt-4 w-full"
                size="l"
                disabled={busy}
              >
                {busy ? t("auth.checking") : signingIn ? t("auth.verifySignIn") : t("auth.verifyJoin")}
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
                {t("auth.differentNumber")}
              </button>
            </form>
          )}
          {waHint && (
            <p className="mt-3 text-sm font-semibold text-ink">{waHint}</p>
          )}
          {!cloud && (
            <p className="mt-2 text-xs text-ink-muted">
              {t("auth.waDemo")}
            </p>
          )}
        </div>
      )}

      {waStep === "done" && (
        <div className="mt-8 rounded-xl bg-mint/50 p-6 shadow-[var(--shadow-1)]">
          <p className="text-xl font-extrabold">{t("auth.youreIn")}</p>
          <p className="mt-2 text-ink-muted">
            {t("auth.waWorked")} <strong>{session.email || phone}</strong>
            .
          </p>
          <Button
            className="mt-6"
            size="l"
            onClick={() =>
              router.push(profileReady ? next : onboardingNext)
            }
          >
            {t("common.continue")}
          </Button>
        </div>
      )}

      {!sent && waStep !== "done" && (
        <div className="mt-8 space-y-3">
          <div className="mb-1 flex items-center gap-3 text-sm font-bold text-ink-muted">
            <span className="h-px flex-1 bg-border" />
            {t("auth.orContinue")}
            <span className="h-px flex-1 bg-border" />
          </div>
          {VISIBLE_SOCIAL_PROVIDERS.map((p) => (
            <Button
              key={p.id}
              type="button"
              variant="secondary"
              size="l"
              className="w-full"
              disabled={Boolean(oauthBusy)}
              onClick={() => void startSocial(p.id)}
            >
              {oauthBusy === p.id
                ? t("auth.opening")
                : signingIn ? t("auth.signInWith", { label: p.label }) : t("auth.continueWith", { label: p.label })}
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
            {cloud ? t("auth.checkInbox") : t("auth.youreIn")}
          </p>
          <p className="mt-2 text-ink-muted">
            {cloud ? (
              <>
                {t("auth.sentLink")} <strong>{email}</strong>.{" "}
                {t("auth.openOnDevice")}
              </>
            ) : (
              <>
                {t("auth.demoFor")} <strong>{email}</strong>. {t("auth.continueBaiolo")}
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
            {t("common.continue")}
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
            {t("auth.orEmail")}
            <span className="h-px flex-1 bg-border" />
          </div>
          <label className="block">
            <span className="font-bold">{t("auth.email")}</span>
            <DictationField
              className="mt-2"
              value={email}
              onChange={setEmail}
              append={false}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="min-h-14 w-full rounded-pill border-2 border-border px-5 text-lg focus:border-brand focus:outline-none"
              />
            </DictationField>
          </label>
          <Button
            type="submit"
            className="mt-6 w-full"
            size="l"
            disabled={busy}
          >
            {busy ? t("auth.sending") : cloud ? (signingIn ? t("auth.emailSignIn") : t("auth.sendMagic")) : t("auth.continueDemo")}
          </Button>
        </form>
      ) : null}

      {!sent && waStep !== "done" && (
        <p className="mt-8 text-center text-sm text-ink-muted">
          {signingIn ? (
            <>
              {t("auth.newHere")}{" "}
              <Link
                href={modeHref("join")}
                className="font-bold text-brand-strong underline"
              >
                {t("auth.createFree")}
              </Link>
            </>
          ) : (
            <>
              {t("auth.alreadyHave")}{" "}
              <Link
                href={modeHref("signin")}
                className="font-bold text-brand-strong underline"
              >
                {t("auth.signInTab")}
              </Link>
            </>
          )}
        </p>
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
