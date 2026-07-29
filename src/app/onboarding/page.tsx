"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { BAILO_AVATARS, DEFAULT_AVATAR, isBaioloAvatar } from "@/lib/avatars";
import { useT } from "@/lib/i18n/LocaleProvider";
import { useSession } from "@/lib/session";
import { safeNextPath } from "@/lib/next-path";

const ROLE_IDS = ["create", "explore", "both"] as const;
const INTEREST_IDS = [
  "Games",
  "Tools",
  "Stories",
  "Art",
  "Learning",
  "Experiments",
] as const;

const interestKey: Record<(typeof INTEREST_IDS)[number], string> = {
  Games: "onboarding.interestGames",
  Tools: "onboarding.interestTools",
  Stories: "onboarding.interestStories",
  Art: "onboarding.interestArt",
  Learning: "onboarding.interestLearning",
  Experiments: "onboarding.interestExperiments",
};

function roleFromSession(
  role: string,
): (typeof ROLE_IDS)[number] {
  if (role === "creator") return "create";
  if (role === "explorer") return "explore";
  return "both";
}

function OnboardingBody() {
  const t = useT();
  const router = useRouter();
  const search = useSearchParams();
  const editing = search.get("edit") === "1";
  const afterOnboarding = safeNextPath(search.get("next"), "/explore");
  const { session, ready, completeOnboarding } = useSession();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<(typeof ROLE_IDS)[number] | null>(null);
  const [avatar, setAvatar] = useState<string>(DEFAULT_AVATAR);
  const [picked, setPicked] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const roles = [
    {
      id: "create" as const,
      title: t("onboarding.roleCreateTitle"),
      body: t("onboarding.roleCreateBody"),
    },
    {
      id: "explore" as const,
      title: t("onboarding.roleExploreTitle"),
      body: t("onboarding.roleExploreBody"),
    },
    {
      id: "both" as const,
      title: t("onboarding.roleBothTitle"),
      body: t("onboarding.roleBothBody"),
    },
  ];

  useEffect(() => {
    if (!ready || hydrated) return;
    if (editing && (session.userId || session.email)) {
      setRole(roleFromSession(session.role));
      setAvatar(isBaioloAvatar(session.avatar) ? session.avatar : DEFAULT_AVATAR);
      setPicked(session.interests.slice(0, 3));
    }
    setHydrated(true);
  }, [ready, editing, session, hydrated]);

  useEffect(() => {
    if (!ready || editing) return;
    if (
      (session.userId || session.email) &&
      session.interests.length >= 2 &&
      session.role !== "guest"
    ) {
      router.replace(afterOnboarding);
    }
  }, [ready, editing, session, afterOnboarding, router]);

  function toggleInterest(item: string) {
    setPicked((prev) =>
      prev.includes(item)
        ? prev.filter((i) => i !== item)
        : prev.length < 3
          ? [...prev, item]
          : prev,
    );
  }

  function continueFlow() {
    if (step === 0 && !role) return;
    if (step === 2 && picked.length < 2) return;
    if (step >= 2) {
      if (role) {
        void completeOnboarding({ role, avatar, interests: picked }).then(() => {
          router.push(editing ? "/profile" : afterOnboarding);
        });
      }
      return;
    }
    setStep((s) => s + 1);
  }

  return (
    <>
      <SiteHeader showJoin={false} />
      <main className="mx-auto w-full max-w-xl px-5 py-12 md:px-8">
        <p className="text-sm font-bold uppercase tracking-wide text-ink-muted">
          {editing ? t("onboarding.edit") : t("onboarding.welcomeShort")} ·{" "}
          {t("onboarding.stepOf", { step: step + 1 })}
        </p>
        <h1 className="mt-2 text-4xl font-extrabold">
          {step === 0 && t("onboarding.whatBrings")}
          {step === 1 && t("onboarding.pickAvatar")}
          {step === 2 && t("onboarding.whatLike")}
        </h1>

        <div className="mt-8 space-y-3">
          {step === 0 &&
            roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={cn(
                  "w-full rounded-xl border-2 bg-surface p-5 text-left shadow-[var(--shadow-1)] transition-all",
                  role === r.id
                    ? "border-brand bg-lilac/50"
                    : "border-border hover:border-border-strong",
                )}
              >
                <p className="text-xl font-extrabold">{r.title}</p>
                <p className="mt-1 text-ink-muted">{r.body}</p>
              </button>
            ))}

          {step === 1 && (
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
              {BAILO_AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-xl border-4 bg-surface text-3xl shadow-[var(--shadow-1)] sm:text-4xl",
                    avatar === a
                      ? "border-brand ring-2 ring-brand/30"
                      : "border-transparent hover:border-border",
                  )}
                  aria-label={t("onboarding.avatarAria", { avatar: a })}
                  aria-pressed={avatar === a}
                >
                  <span className="leading-none" aria-hidden>
                    {a}
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-wrap gap-2">
              {INTEREST_IDS.map((item) => {
                const on = picked.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleInterest(item)}
                    className={cn(
                      "min-h-11 rounded-pill border-2 px-5 font-bold",
                      on
                        ? "border-brand bg-brand text-on-brand"
                        : "border-border bg-surface text-ink-muted",
                    )}
                  >
                    {t(interestKey[item])}
                  </button>
                );
              })}
              <p className="mt-3 w-full text-sm text-ink-muted">
                {t("onboarding.pickFavorites")}
              </p>
            </div>
          )}
        </div>

        <Button
          className="mt-10"
          size="l"
          onClick={continueFlow}
          disabled={
            (step === 0 && !role) || (step === 2 && picked.length < 2)
          }
        >
          {step === 2
            ? editing
              ? t("onboarding.save")
              : t("onboarding.enter")
            : t("onboarding.continue")}
        </Button>
      </main>
    </>
  );
}

export default function OnboardingPage() {
  const t = useT();
  return (
    <Suspense
      fallback={
        <>
          <SiteHeader showJoin={false} />
          <main className="mx-auto max-w-xl px-5 py-16 text-ink-muted">
            {t("common.loading")}
          </main>
        </>
      }
    >
      <OnboardingBody />
    </Suspense>
  );
}
