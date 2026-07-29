"use client";

import { useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { billingContactEmail } from "@/lib/billing/provider";
import { authHref } from "@/lib/next-path";
import { useT } from "@/lib/i18n/LocaleProvider";
import type { SessionPlan } from "@/lib/session";
import { useSession } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const plans = [
  {
    id: "free" as const,
    vibe: "from-lilac/50 to-canvas",
  },
  {
    id: "pro" as const,
    vibe: "from-brand/15 to-mint/20",
  },
  {
    id: "studio" as const,
    vibe: "from-brand/20 to-warning/15",
  },
];

function upgradeMailto(plan: "pro" | "studio", email: string | null) {
  const to = billingContactEmail();
  const subject = encodeURIComponent(`Baiolo ${plan} upgrade`);
  const body = encodeURIComponent(
    `Hi Baiolo team,\n\nI'd like to upgrade to ${plan}.\nAccount: ${email || "(signed in)"}\n`,
  );
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

export default function PricingPage() {
  const t = useT();
  const { session, ready, setPlan } = useSession();
  const [busyId, setBusyId] = useState<SessionPlan | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const signedIn = Boolean(session.userId || session.email);

  async function chooseFree() {
    setError("");
    setMessage("");
    if (!signedIn) {
      window.location.assign(authHref("/pricing", { mode: "join" }));
      return;
    }

    setBusyId("free");
    try {
      if (isSupabaseConfigured()) {
        const res = await fetch("/api/account/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "free" }),
        });
        const data = (await res.json()) as { error?: string; plan?: string };
        if (!res.ok) {
          setError(data.error || t("pricing.saveFail"));
          return;
        }
      }
      setPlan("free");
      setMessage(t("pricing.saveOk", { plan: t("pricing.free.title") }));
    } catch {
      setError(t("pricing.saveFail"));
    } finally {
      setBusyId(null);
    }
  }

  function requestPaid(plan: "pro" | "studio") {
    setError("");
    setMessage("");
    if (!signedIn) {
      window.location.assign(authHref("/pricing", { mode: "join" }));
      return;
    }
    window.location.assign(upgradeMailto(plan, session.email));
    setMessage(t("pricing.requestSent"));
  }

  return (
    <>
      <SiteHeader showJoin={false} />
      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-strong">
          {t("pricing.eyebrow")}
        </p>
        <h1 className="mt-2 text-4xl font-extrabold">{t("pricing.title")}</h1>
        <p className="mt-2 max-w-3xl text-lg text-ink-muted">
          {t("pricing.sub")}
        </p>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">
          {t("pricing.upgradeNote")}
        </p>
        {ready && signedIn && (
          <p className="mt-3 text-sm font-semibold text-ink-muted">
            {t("pricing.current", { plan: t(`pricing.${session.plan}.title`) })}
          </p>
        )}
        {message && (
          <p className="mt-4 font-semibold text-secondary-strong">{message}</p>
        )}
        {error && <p className="mt-4 font-semibold text-danger">{error}</p>}

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const active = session.plan === plan.id;
            return (
              <section
                key={plan.id}
                className={`rounded-3xl border-2 bg-gradient-to-b ${plan.vibe} p-6 shadow-[var(--shadow-1)] ${
                  active ? "border-brand" : "border-border"
                }`}
              >
                <p className="text-sm font-bold uppercase tracking-wide text-brand-strong">
                  {t(`pricing.${plan.id}.eyebrow`)}
                </p>
                <h2 className="mt-2 text-3xl font-extrabold">
                  {t(`pricing.${plan.id}.title`)}
                </h2>
                <p className="mt-2 text-ink-muted">
                  {t(`pricing.${plan.id}.body`)}
                </p>

                <ul className="mt-6 space-y-3">
                  <li className="rounded-2xl bg-surface/80 px-4 py-3">
                    <p className="text-sm font-bold text-ink-muted">
                      {t("pricing.aiProjects")}
                    </p>
                    <p className="mt-1 text-xl font-extrabold">
                      {t(`pricing.${plan.id}.aiProjects`)}
                    </p>
                  </li>
                  <li className="rounded-2xl bg-surface/80 px-4 py-3">
                    <p className="text-sm font-bold text-ink-muted">
                      {t("pricing.aiGenerations")}
                    </p>
                    <p className="mt-1 text-xl font-extrabold">
                      {t(`pricing.${plan.id}.aiGenerations`)}
                    </p>
                  </li>
                  <li className="rounded-2xl bg-surface/80 px-4 py-3">
                    <p className="text-sm font-bold text-ink-muted">
                      {t("pricing.externalProjects")}
                    </p>
                    <p className="mt-1 text-xl font-extrabold">
                      {t("pricing.unlimited")}
                    </p>
                  </li>
                  <li className="rounded-2xl bg-surface/80 px-4 py-3">
                    <p className="text-sm font-bold text-ink-muted">
                      {t("pricing.analytics")}
                    </p>
                    <p className="mt-1 text-xl font-extrabold">
                      {t(`pricing.${plan.id}.analytics`)}
                    </p>
                  </li>
                  <li className="rounded-2xl bg-surface/80 px-4 py-3">
                    <p className="text-sm font-bold text-ink-muted">
                      {t("pricing.reviewQueue")}
                    </p>
                    <p className="mt-1 text-xl font-extrabold">
                      {t(`pricing.${plan.id}.reviewQueue`)}
                    </p>
                  </li>
                </ul>

                <Button
                  type="button"
                  className="mt-6 w-full"
                  size="l"
                  disabled={busyId !== null || active}
                  variant={active ? "secondary" : undefined}
                  onClick={() => {
                    if (plan.id === "free") void chooseFree();
                    else requestPaid(plan.id);
                  }}
                >
                  {active
                    ? t("pricing.currentPlan")
                    : busyId === plan.id
                      ? t("pricing.saving")
                      : t(`pricing.${plan.id}.cta`)}
                </Button>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
