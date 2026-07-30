"use client";

import Link from "next/link";
import { useMemo } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { useT } from "@/lib/i18n/LocaleProvider";
import { submissionToProject } from "@/lib/project-map";
import { useSession, type SessionPlan } from "@/lib/session";
import { useSubmissions } from "@/lib/submissions";
import { isOwnedSubmission } from "@/lib/ownership";
import { normalizeUserPlan } from "@/lib/plans.config";

function planLabelKey(plan: SessionPlan) {
  if (plan === "pro") return "profile.planPro" as const;
  if (plan === "studio") return "profile.planStudio" as const;
  return "profile.planFree" as const;
}

export default function ProfilePage() {
  const t = useT();
  const { session, ready: sessionReady, signOut } = useSession();
  const { items, ready: submissionsReady } = useSubmissions();

  const mine = useMemo(() => {
    if (!sessionReady) return [];
    return items
      .filter((s) => isOwnedSubmission(s, session.userId))
      .map((s) => submissionToProject(s, session.name || "Creator"))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
  }, [items, session.name, session.userId, sessionReady]);

  const ready = sessionReady && submissionsReady;
  const signedIn = Boolean(session.userId || session.email);
  const isGuest = !signedIn || session.role === "guest";
  const plan = normalizeUserPlan(session.plan);
  const planName = t(planLabelKey(plan));

  const roleKey =
    session.role === "guest"
      ? "profile.roleGuest"
      : session.role === "explorer"
        ? "profile.roleExplorer"
        : session.role === "creator"
          ? "profile.roleCreator"
          : session.role === "admin"
            ? "profile.roleAdmin"
            : null;

  return (
    <>
      <SiteHeader showJoin={false} />
      <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8">
        <div className="flex flex-col items-start gap-6 rounded-xl bg-surface p-8 shadow-[var(--shadow-1)] sm:flex-row sm:items-center">
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-24 items-center justify-center rounded-full bg-lilac text-5xl shadow-[var(--shadow-1)]">
              {session.avatar}
            </div>
            {sessionReady && (
              <Link
                href="/pricing"
                className="rounded-pill bg-mint/60 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-secondary-strong transition-colors hover:bg-mint"
                title={t("profile.planBadge", { plan: planName })}
              >
                {t("profile.planBadge", { plan: planName })}
              </Link>
            )}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-4xl font-extrabold">{session.name}</h1>
              {sessionReady && (
                <span className="rounded-pill bg-lilac/70 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-strong">
                  {roleKey ? t(roleKey) : session.role}
                </span>
              )}
            </div>
            <p className="mt-2 max-w-xl text-lg text-ink-muted">
              {session.interests.length > 0
                ? t("profile.into", { interests: session.interests.join(", ") })
                : isGuest
                  ? t("profile.joinSave")
                  : t("profile.tellUs")}
            </p>
            {session.email && (
              <p className="mt-1 text-sm text-ink-muted">{session.email}</p>
            )}
            {session.interests.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {session.interests.map((interest) => (
                  <span
                    key={interest}
                    className="rounded-pill bg-mint/50 px-3 py-1 text-sm font-bold text-secondary-strong"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {isGuest ? (
              <Button href="/auth?next=%2Fprofile" size="l">
                {t("landing.joinBaiolo")}
              </Button>
            ) : (
              <Button href="/onboarding?edit=1" variant="secondary">
                {t("profile.editProfile")}
              </Button>
            )}
            <Button href="/favorites" variant="secondary">
              {t("profile.favorites")}
            </Button>
            <Button href="/create" variant="secondary">
              {t("profile.newProject")}
            </Button>
            {signedIn && (
              <Button
                variant="ghost"
                onClick={() => {
                  void signOut().then(() => {
                    window.location.href = "/";
                  });
                }}
              >
                {t("profile.signOut")}
              </Button>
            )}
          </div>
        </div>

        <h2 className="mt-12 text-2xl font-extrabold">{t("profile.yourProjects")}</h2>
        {!ready ? (
          <p className="mt-6 text-ink-muted">{t("profile.loadingProjects")}</p>
        ) : mine.length === 0 ? (
          <div className="mt-6 rounded-xl bg-lilac/40 p-10 text-center">
            <p className="text-xl font-extrabold">{t("profile.nothingPublished")}</p>
            <p className="mt-2 text-ink-muted">
              {t("profile.nothingPublishedBody")}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button href="/create">{t("projects.addProject")}</Button>
              <Button href="/projects?filter=draft" variant="secondary">
                {t("profile.seeDrafts")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {mine.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
