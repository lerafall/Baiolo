"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge, StatusMessage } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import {
  friendlyStageLabel,
  type PipelineStageView,
} from "@/lib/status-progress";
import { useSubmissions } from "@/lib/submissions";

function liveStages(
  snapshot: PipelineStageView[],
  status: string | undefined,
): PipelineStageView[] {
  const base =
    snapshot.length > 0
      ? snapshot
      : [
          {
            name: "private_storage",
            ok: true,
            detail: "Stored privately for checking.",
          },
          {
            name: "technical_validation",
            ok: true,
            detail: "Package looks complete enough to check.",
          },
          {
            name: "ai_moderation",
            ok: true,
            detail: "Friendly safety check finished.",
          },
          {
            name: "admin_queue",
            ok: true,
            detail: "Queued for human review.",
          },
        ];

  if (!status || status === "checking" || status === "submitted") {
    return [
      ...base,
      {
        name: "live_checking",
        ok: true,
        detail: "Still checking — this usually takes a moment.",
      },
    ];
  }

  if (status === "in_review") {
    return [
      ...base.filter((s) => s.name !== "live_checking"),
      {
        name: "human_review",
        ok: true,
        detail: "A Baiolo teammate is reviewing it now.",
      },
    ];
  }

  if (status === "needs_changes") {
    return [
      ...base,
      {
        name: "needs_changes",
        ok: false,
        detail: "A small fix is needed before it can go live.",
      },
    ];
  }

  if (status === "published" || status === "approved") {
    return [
      ...base,
      {
        name: "published",
        ok: true,
        detail: "Approved — it’s ready for people to try.",
      },
    ];
  }

  if (status === "rejected") {
    return [
      ...base,
      {
        name: "rejected",
        ok: false,
        detail: "This project can’t go public right now.",
      },
    ];
  }

  return base;
}

function SubmittedBody() {
  const params = useSearchParams();
  const id = params.get("id");
  const { items, ready } = useSubmissions();
  const [stages, setStages] = useState<PipelineStageView[]>([]);

  const submission = items.find((s) => s.id === id);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("baiolo.last-pipeline-stages");
      if (raw) setStages(JSON.parse(raw) as PipelineStageView[]);
    } catch {
      /* ignore */
    }
  }, []);

  const displayStages = useMemo(
    () => liveStages(stages, submission?.status),
    [stages, submission?.status],
  );

  const headline =
    submission?.status === "published" || submission?.status === "approved"
      ? "You’re live!"
      : submission?.status === "needs_changes"
        ? "A small fix is needed."
        : submission?.status === "rejected"
          ? "This one can’t go public yet."
          : submission?.status === "in_review"
            ? "A teammate is reviewing it."
            : "We’re checking your project now.";

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center px-5 py-16 md:px-8">
      <div className="animate-floaty size-20 rounded-full bg-lilac shadow-[var(--shadow-1)]" />
      <h1 className="mt-8 text-center text-4xl font-extrabold text-ink">
        {headline}
      </h1>
      <p className="mt-4 text-center text-lg text-ink-muted">
        It stays private until a Baiolo teammate approves it.
      </p>

      {ready && submission && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <StatusBadge status={submission.status} />
          <StatusMessage status={submission.status} />
        </div>
      )}

      {displayStages.length > 0 && (
        <ol className="mt-8 w-full space-y-3 text-left">
          {displayStages.map((stage, i) => (
            <li
              key={`${stage.name}-${i}`}
              className={cn(
                "animate-rise rounded-xl border-2 bg-surface px-4 py-3 shadow-[var(--shadow-1)]",
                stage.ok ? "border-border" : "border-warning",
              )}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <p className="font-extrabold text-ink">
                {stage.ok ? "✓" : "!"} {friendlyStageLabel(stage.name)}
              </p>
              <p className="mt-1 text-sm text-ink-muted">{stage.detail}</p>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button href="/projects" size="l">
          See submission status
        </Button>
        <Button href="/explore" variant="secondary" size="l">
          Explore meanwhile
        </Button>
      </div>
    </main>
  );
}

export default function CreateSubmittedPage() {
  return (
    <>
      <SiteHeader showJoin={false} />
      <Suspense
        fallback={
          <main className="mx-auto max-w-xl px-5 py-16 text-ink-muted">
            Loading…
          </main>
        }
      >
        <SubmittedBody />
      </Suspense>
    </>
  );
}
