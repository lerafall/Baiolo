"use client";

import Link from "next/link";
import { useMemo } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge, StatusMessage } from "@/components/ui/StatusBadge";
import { useCreatorFeedback } from "@/lib/engagement";
import { formatCount } from "@/lib/format";
import { useSubmissions } from "@/lib/submissions";
import { thumbBackgroundStyle } from "@/lib/thumb-style";

function CreatorTips({
  needsChanges,
  hasDraft,
  empty,
}: {
  needsChanges: number;
  hasDraft: boolean;
  empty: boolean;
}) {
  if (empty) {
    return (
      <div className="mt-8 rounded-xl bg-lilac/50 p-6 shadow-[var(--shadow-1)]">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-strong">
          Tip
        </p>
        <p className="mt-2 text-xl font-extrabold">Start tiny.</p>
        <p className="mt-1 text-ink-muted">
          Add a ZIP, a link, or a starter template. You can save a draft and come
          back later.
        </p>
        <Button href="/create" className="mt-4">
          Add your project
        </Button>
      </div>
    );
  }

  if (needsChanges > 0) {
    return (
      <div className="mt-8 rounded-xl bg-warning/20 p-6 shadow-[var(--shadow-1)]">
        <p className="text-sm font-bold uppercase tracking-wide text-ink">
          Needs a small fix
        </p>
        <p className="mt-2 text-xl font-extrabold">
          {needsChanges === 1
            ? "One project is waiting on you."
            : `${needsChanges} projects need a small fix.`}
        </p>
        <p className="mt-1 text-ink-muted">
          Open it, make the change, and submit for checking again.
        </p>
      </div>
    );
  }

  if (hasDraft) {
    return (
      <div className="mt-8 rounded-xl bg-mint/50 p-6 shadow-[var(--shadow-1)]">
        <p className="text-sm font-bold uppercase tracking-wide text-secondary-strong">
          Keep going
        </p>
        <p className="mt-2 text-xl font-extrabold">You have a draft waiting.</p>
        <p className="mt-1 text-ink-muted">
          Finish it when you&apos;re ready — drafts save automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-xl bg-canvas p-6">
      <p className="text-ink-muted">
        Want to show something new?{" "}
        <Link href="/create" className="font-bold text-brand-strong underline">
          Start a tiny idea
        </Link>
        .
      </p>
    </div>
  );
}

export default function MyProjectsPage() {
  const { items, ready } = useSubmissions();

  const published = items.filter((p) => p.status === "published");
  const best = [...published].sort(
    (a, b) => b.plays + b.reactions - (a.plays + a.reactions),
  )[0];
  const pipeline = items.filter((p) => p.status !== "published");
  const needsChanges = items.filter((p) => p.status === "needs_changes").length;
  const hasDraft = items.some((p) => p.status === "draft");
  const empty = useMemo(
    () => ready && items.length === 0,
    [ready, items.length],
  );
  const ownedIds = useMemo(() => items.map((p) => p.id), [items]);
  const { items: feedbackItems } = useCreatorFeedback(ownedIds);
  const titleById = useMemo(
    () => new Map(items.map((p) => [p.id, p.title])),
    [items],
  );

  return (
    <>
      <SiteHeader showJoin={false} />
      <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold">My Projects</h1>
            <p className="mt-2 text-lg text-ink-muted">
              Soft signals — and clear submission status.
            </p>
          </div>
          <Button href="/create" size="l">
            Add your project
          </Button>
        </div>

        <CreatorTips
          needsChanges={needsChanges}
          hasDraft={hasDraft}
          empty={empty}
        />

        {best && (
          <div className="mt-8 rounded-xl bg-mint/50 p-6 shadow-[var(--shadow-1)]">
            <p className="text-sm font-bold uppercase tracking-wide text-secondary-strong">
              What&apos;s doing best
            </p>
            <p className="mt-2 text-2xl font-extrabold">{best.title}</p>
            <p className="mt-1 text-ink-muted">
              {formatCount(best.plays)} plays · people keep coming back.
            </p>
            <Button href={`/project/${best.id}`} className="mt-4">
              Share it with friends
            </Button>
          </div>
        )}

        {feedbackItems.length > 0 && (
          <section className="mt-10 rounded-xl bg-lilac/40 p-6 shadow-[var(--shadow-1)]">
            <h2 className="text-2xl font-extrabold">Notes for you</h2>
            <p className="mt-1 text-ink-muted">
              Soft feedback people left on your projects.
            </p>
            <ul className="mt-5 space-y-4">
              {feedbackItems.map((item) => (
                <li key={item.projectId}>
                  <p className="font-extrabold">
                    {titleById.get(item.projectId) ?? "Your project"}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {item.notes.slice(-5).map((note, i) => (
                      <li
                        key={`${item.projectId}-${i}`}
                        className="rounded-lg bg-surface px-4 py-3 text-ink-muted shadow-[var(--shadow-1)]"
                      >
                        “{note}”
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/project/${item.projectId}`}
                    className="mt-2 inline-block text-sm font-bold text-brand-strong underline"
                  >
                    Open project
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-12">
          <h2 className="text-2xl font-extrabold">Submission status</h2>
          <p className="mt-1 text-ink-muted">
            Drafts, checking, and reviews live here until a project is public.
          </p>
          {!ready && (
            <p className="mt-6 text-ink-muted">Loading your projects…</p>
          )}
          <ul className="mt-6 space-y-4">
            {pipeline.map((p) => (
              <li
                key={p.id}
                className="rounded-xl bg-surface p-5 shadow-[var(--shadow-1)]"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div
                    className="h-20 w-full shrink-0 rounded-lg bg-cover bg-center sm:w-28"
                    style={thumbBackgroundStyle(p.thumbnail)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xl font-extrabold">
                        {p.title || "Untitled draft"}
                      </p>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="mt-1">
                      <StatusMessage status={p.status} />
                    </div>
                    {p.changeRequest && (
                      <p className="mt-2 rounded-lg bg-warning/15 px-3 py-2 text-sm font-semibold">
                        {p.changeRequest}
                      </p>
                    )}
                  </div>
                  {p.status === "draft" || p.status === "needs_changes" ? (
                    <Button
                      href={`/create?edit=${encodeURIComponent(p.id)}`}
                      variant="secondary"
                    >
                      Keep editing
                    </Button>
                  ) : p.status === "published" || p.status === "approved" ? (
                    <Button href={`/project/${p.id}`} variant="secondary">
                      Open
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
            {ready && pipeline.length === 0 && !empty && (
              <li className="rounded-xl bg-lilac/40 px-5 py-8 text-center text-ink-muted">
                No submissions in progress.{" "}
                <Link
                  href="/create"
                  className="font-bold text-brand-strong underline"
                >
                  Add your project
                </Link>
                .
              </li>
            )}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-extrabold">Live projects</h2>
          <ul className="mt-6 space-y-4">
            {published.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-1)] sm:flex-row sm:items-center"
              >
                <div
                  className="h-20 w-full shrink-0 rounded-lg bg-cover bg-center sm:w-28"
                  style={thumbBackgroundStyle(p.thumbnail)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xl font-extrabold">{p.title}</p>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="text-ink-muted">
                    {formatCount(p.plays)} plays · {p.reactions} reactions
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button href={`/project/${p.id}`}>Share & play</Button>
                  <Button href={`/project/${p.id}`} variant="secondary">
                    Open
                  </Button>
                </div>
              </li>
            ))}
            {ready && published.length === 0 && (
              <li className="rounded-xl bg-canvas px-5 py-6 text-ink-muted">
                Nothing live yet — approved projects will show up here.
              </li>
            )}
          </ul>
        </section>
      </main>
    </>
  );
}
