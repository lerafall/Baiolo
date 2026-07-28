"use client";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { submissionToProject } from "@/lib/project-map";
import { useSession } from "@/lib/session";
import { useSubmissions } from "@/lib/submissions";

const roleLabel: Record<string, string> = {
  guest: "Guest",
  explorer: "Explorer",
  creator: "Creator",
  admin: "Admin",
};

export default function ProfilePage() {
  const { session, ready, signOut } = useSession();
  const { items } = useSubmissions();

  const mine = items
    .map((s) => submissionToProject(s, session.name))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const signedIn = Boolean(session.email);
  const isGuest = !signedIn || session.role === "guest";

  return (
    <>
      <SiteHeader showJoin={false} />
      <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8">
        <div className="flex flex-col items-start gap-6 rounded-xl bg-surface p-8 shadow-[var(--shadow-1)] sm:flex-row sm:items-center">
          <div className="flex size-24 items-center justify-center rounded-full bg-lilac text-5xl shadow-[var(--shadow-1)]">
            {session.avatar}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-4xl font-extrabold">{session.name}</h1>
              {ready && (
                <span className="rounded-pill bg-lilac/70 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-strong">
                  {roleLabel[session.role] ?? session.role}
                </span>
              )}
            </div>
            <p className="mt-2 max-w-xl text-lg text-ink-muted">
              {session.interests.length > 0
                ? `Into ${session.interests.join(", ")}.`
                : isGuest
                  ? "Join to save your profile and projects."
                  : "Tell us what you like — tap Edit profile."}
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
                Join Baiolo
              </Button>
            ) : (
              <Button href="/onboarding?edit=1" variant="secondary">
                Edit profile
              </Button>
            )}
            <Button href="/favorites" variant="secondary">
              Favorites
            </Button>
            <Button href="/create" variant="secondary">
              New project
            </Button>
            {signedIn && (
              <Button variant="ghost" onClick={() => void signOut()}>
                Sign out
              </Button>
            )}
          </div>
        </div>

        <h2 className="mt-12 text-2xl font-extrabold">Your projects</h2>
        {mine.length === 0 ? (
          <div className="mt-6 rounded-xl bg-lilac/40 p-10 text-center">
            <p className="text-xl font-extrabold">Nothing published yet</p>
            <p className="mt-2 text-ink-muted">
              When a project goes live, it will show up here.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button href="/create">Add your project</Button>
              <Button href="/projects" variant="secondary">
                See drafts
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
