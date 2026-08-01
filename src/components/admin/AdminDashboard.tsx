"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import type { RiskLevel } from "@/lib/moderation";
import type { ProjectSubmission } from "@/lib/moderation";
import { canPublish } from "@/lib/pipeline";
import { useContentReports } from "@/lib/reports";
import { formatDateTime } from "@/lib/format";
import { useSubmissions } from "@/lib/submissions";
import { thumbBackgroundStyle } from "@/lib/thumb-style";
import { AdminAccountsPanel } from "@/components/admin/AdminAccountsPanel";
import { DictationField } from "@/components/ui/DictationField";
import { useT } from "@/lib/i18n/LocaleProvider";
import type { AdminAccount } from "@/lib/admin-accounts";
import { PLAN_LIMITS, normalizeUserPlan, reviewQueueRank } from "@/lib/plans.config";

function previewSrc(url: string | null | undefined) {
  if (!url) return "";
  // Owner private play URL → admin preview proxy (cookie session authorizes).
  return url.replace(
    "/api/owner-play-site/",
    "/api/admin/preview-site/",
  );
}

export function AdminDashboard() {
  const t = useT();
  const { items, ready, upsert, refresh, saveAll } = useSubmissions();
  const { open: openReports, resolve: resolveReport } = useContentReports();
  const [risk, setRisk] = useState<"all" | RiskLevel>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [gateError, setGateError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [seedFlash, setSeedFlash] = useState("");
  const [reviewFlash, setReviewFlash] = useState("");
  const [ownerPlans, setOwnerPlans] = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/accounts");
        if (!res.ok) return;
        const data = (await res.json()) as { items?: AdminAccount[] };
        const map: Record<string, string> = {};
        for (const a of data.items ?? []) {
          map[a.id] = a.plan || "free";
        }
        setOwnerPlans(map);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const queue = useMemo(() => {
    return items.filter((p) => {
      if (p.visibility === "pending_public") return true;
      if (
        ["submitted", "checking", "in_review", "needs_changes"].includes(
          p.status,
        )
      ) {
        return true;
      }
      return false;
    });
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return queue
      .filter((p) => {
        const matchRisk = risk === "all" || p.risk === risk;
        const matchQuery =
          !q ||
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.aiFlags ?? []).some((f) => f.toLowerCase().includes(q));
        return matchRisk && matchQuery;
      })
      .sort((a, b) => {
        const aPublic = a.visibility === "pending_public" ? 0 : 1;
        const bPublic = b.visibility === "pending_public" ? 0 : 1;
        if (aPublic !== bPublic) return aPublic - bPublic;
        const aRank = reviewQueueRank(
          a.ownerId ? ownerPlans[a.ownerId] : "free",
        );
        const bRank = reviewQueueRank(
          b.ownerId ? ownerPlans[b.ownerId] : "free",
        );
        if (aRank !== bRank) return bRank - aRank;
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
  }, [queue, risk, query, ownerPlans]);

  const selected =
    filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? null;

  async function moderate(
    project: ProjectSubmission,
    action:
      | "prepare_preview"
      | "confirm_play"
      | "publish"
      | "reject"
      | "ask_for_changes"
      | "escalate",
  ) {
    setBusy(true);
    setGateError("");
    setReviewFlash("");
    try {
      const res = await fetch("/api/projects/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // the id is what matters; `project` stays for mock mode only
          projectId: project.id,
          project,
          action,
          note,
        }),
      });
      const data = (await res.json()) as {
        project?: ProjectSubmission;
        error?: string;
      };
      if (!res.ok || !data.project) {
        setGateError(data.error || t("admin.actionFailed"));
        return;
      }
      upsert(data.project);
      void refresh();
    } finally {
      setBusy(false);
    }
  }

  async function runCodeReview(project: ProjectSubmission) {
    setBusy(true);
    setGateError("");
    setReviewFlash("");
    try {
      const res = await fetch("/api/projects/code-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, project }),
      });
      const data = (await res.json()) as {
        project?: ProjectSubmission;
        review?: { summary?: string; ok?: boolean; source?: string };
        error?: string;
      };
      if (!res.ok || !data.project) {
        setGateError(data.error || t("admin.codeCheckFailed"));
        return;
      }
      upsert(data.project);
      void refresh();
      setReviewFlash(
        data.review?.ok
          ? `${data.review.summary ?? t("admin.codeCheckPassed")} (${data.review.source ?? "static"})`
          : data.review?.summary || t("admin.codeCheckBlocked"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function seedDemos() {
    setBusy(true);
    setSeedFlash("");
    try {
      const res = await fetch("/api/projects/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await res.json()) as {
        items?: ProjectSubmission[];
        seeded?: number;
        error?: string;
      };
      if (!res.ok) {
        setGateError(data.error || t("admin.seedFailed"));
        return;
      }
      if (data.items?.length) {
        const byId = new Map(items.map((i) => [i.id, i]));
        for (const s of data.items) byId.set(s.id, s);
        saveAll(Array.from(byId.values()));
      }
      await refresh();
      setSeedFlash(
        data.seeded
          ? t("admin.seedCloud", { count: data.seeded })
          : t("admin.seedLocal"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeSelected() {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch("/api/projects/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setGateError(data.error || t("admin.removeFailed"));
        return;
      }
      saveAll(items.filter((i) => i.id !== selected.id));
      setSelectedId(null);
      await refresh();
    } finally {
      setBusy(false);
      setDeleteOpen(false);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (rejectOpen || busy) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (!filtered.length) return;

      const idx = Math.max(
        0,
        filtered.findIndex((p) => p.id === selected?.id),
      );

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = filtered[Math.min(filtered.length - 1, idx + 1)];
        if (next) {
          setSelectedId(next.id);
          setNote(next.changeRequest ?? "");
        }
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        const prev = filtered[Math.max(0, idx - 1)];
        if (prev) {
          setSelectedId(prev.id);
          setNote(prev.changeRequest ?? "");
        }
      }
      if ((e.key === "r" || e.key === "R") && selected) {
        e.preventDefault();
        setRejectOpen(true);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const publishReady = selected ? canPublish(selected) : false;

  const riskFilters: Array<{ id: "all" | RiskLevel; label: string }> = [
    { id: "all", label: t("admin.riskAll") },
    { id: "low", label: t("admin.riskLow") },
    { id: "medium", label: t("admin.riskMedium") },
    { id: "high", label: t("admin.riskHigh") },
  ];

  return (
    <>
      <SiteHeader showJoin={false} />
      <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8">
        <h1 className="text-4xl font-extrabold">{t("admin.queueTitle")}</h1>
        <p className="mt-2 text-lg text-ink-muted">
          {t("admin.queueSub")}
        </p>
        <p className="mt-2 text-sm text-ink-muted">{t("admin.keysHint")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void seedDemos()}
          >
            {t("admin.seedDemos")}
          </Button>
          {seedFlash && (
            <p className="self-center text-sm font-bold text-secondary-strong">
              {seedFlash}
            </p>
          )}
        </div>

        <label className="mt-6 block max-w-md">
          <span className="sr-only">{t("admin.searchQueue")}</span>
          <DictationField
            value={query}
            onChange={setQuery}
            append={false}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("admin.searchQueuePlaceholder")}
              className="min-h-12 w-full rounded-pill border-2 border-border bg-surface px-5 text-ink placeholder:text-placeholder focus:border-brand focus:outline-none"
            />
          </DictationField>
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          {riskFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setRisk(f.id)}
              className={cn(
                "min-h-11 rounded-pill border-2 px-5 font-bold",
                risk === f.id
                  ? "border-brand bg-brand text-on-brand"
                  : "border-border bg-surface text-ink-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {!ready && (
          <p className="mt-8 text-ink-muted">{t("admin.loadingQueue")}</p>
        )}
        {gateError && (
          <p className="mt-4 font-semibold text-danger">{gateError}</p>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <ul className="space-y-3">
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(p.id);
                    setNote(p.changeRequest ?? "");
                    setReviewFlash("");
                    setGateError("");
                  }}
                  className={cn(
                    "flex w-full gap-4 rounded-xl border-2 bg-surface p-4 text-left shadow-[var(--shadow-1)] transition-all",
                    selected?.id === p.id
                      ? "border-brand"
                      : "border-transparent hover:border-border",
                  )}
                >
                  <div
                    className="h-16 w-20 shrink-0 rounded-lg"
                    style={thumbBackgroundStyle(p.thumbnail)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-extrabold">{p.title}</p>
                      <StatusBadge status={p.status} />
                      {(() => {
                        const plan = normalizeUserPlan(
                          p.ownerId ? ownerPlans[p.ownerId] : "free",
                        );
                        const tier = PLAN_LIMITS[plan].reviewQueue;
                        if (tier === "standard") return null;
                        return (
                          <span className="rounded-pill bg-warning/40 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-ink">
                            {tier === "dedicated_sla"
                              ? t("admin.queueSla")
                              : t("admin.queuePriority")}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">
                      {t("admin.riskLine", {
                        risk:
                          p.risk === "low"
                            ? t("admin.riskLow")
                            : p.risk === "medium"
                              ? t("admin.riskMedium")
                              : p.risk === "high"
                                ? t("admin.riskHigh")
                                : (p.risk ?? "—"),
                        code: p.codeCheckedAt
                          ? t("admin.codeDone")
                          : t("admin.codePending"),
                        play: p.playCheckedAt
                          ? t("admin.playDone")
                          : t("admin.playPending"),
                      })}
                    </p>
                  </div>
                </button>
              </li>
            ))}
            {ready && filtered.length === 0 && (
              <li className="rounded-xl bg-mint/40 px-5 py-10 text-center">
                <p className="text-xl font-extrabold">{t("admin.queueClear")}</p>
                <p className="mt-2 text-ink-muted">{t("admin.queueClearBody")}</p>
              </li>
            )}
          </ul>

          {selected && (
            <aside className="rounded-xl bg-surface p-6 shadow-[var(--shadow-2)]">
              <div
                className="aspect-[16/10] rounded-lg"
                style={thumbBackgroundStyle(selected.thumbnail)}
              />
              <h2 className="mt-5 text-2xl font-extrabold">{selected.title}</h2>
              <p className="mt-2 text-ink-muted">{selected.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge status={selected.status} />
                <span className="inline-flex min-h-8 items-center rounded-pill bg-lilac/70 px-3 text-sm font-bold text-brand-strong">
                  {t("admin.riskBadge", {
                    risk:
                      selected.risk === "low"
                        ? t("admin.riskLow")
                        : selected.risk === "medium"
                          ? t("admin.riskMedium")
                          : selected.risk === "high"
                            ? t("admin.riskHigh")
                            : t("admin.riskUnknown"),
                  })}
                </span>
              </div>

              <ol className="mt-5 space-y-2 rounded-xl bg-lilac/35 p-4 text-sm">
                <li className="font-bold">
                  {t("admin.stepCheck", {
                    mark: selected.codeCheckedAt
                      ? "✓"
                      : t("admin.stepDoThis"),
                  })}
                </li>
                <li className="font-bold">
                  {t("admin.stepPlay", {
                    mark: selected.playCheckedAt
                      ? "✓"
                      : t("admin.stepThenThis"),
                  })}
                </li>
                <li className="font-bold">
                  {t("admin.stepPublish", {
                    mark: publishReady
                      ? t("admin.stepReady")
                      : t("admin.stepLocked"),
                  })}
                </li>
              </ol>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  disabled={busy}
                  onClick={() => void runCodeReview(selected)}
                >
                  {t("admin.checkCode")}
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void moderate(selected, "prepare_preview")}
                >
                  {t("admin.preparePlay")}
                </Button>
                <Button
                  variant="secondary"
                  disabled={
                    busy || !selected.codeCheckedAt || !selected.previewUrl
                  }
                  onClick={() => void moderate(selected, "confirm_play")}
                >
                  {t("admin.playedOk")}
                </Button>
                <Button
                  disabled={busy || !publishReady}
                  onClick={() => void moderate(selected, "publish")}
                >
                  {selected.status === "published"
                    ? t("admin.refreshLive")
                    : t("admin.publish")}
                </Button>
              </div>

              {reviewFlash && (
                <p className="mt-3 text-sm font-bold text-secondary-strong">
                  {reviewFlash}
                </p>
              )}

              {selected.reviewNotes && (
                <pre className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-ink/95 px-3 py-3 text-xs leading-relaxed text-on-brand">
                  {selected.reviewNotes}
                </pre>
              )}

              {selected.aiFlags.length > 0 && (
                <div className="mt-4 rounded-lg bg-warning/15 p-4">
                  <p className="font-bold">{t("admin.flags")}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
                    {selected.aiFlags.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selected.previewUrl && (
                <div className="mt-5">
                  <p className="font-bold">{t("admin.previewTitle")}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {t("admin.previewBody")}
                  </p>
                  <iframe
                    title={`Preview ${selected.title}`}
                    src={previewSrc(selected.previewUrl)}
                    className="mt-3 aspect-[9/16] max-h-[28rem] w-full rounded-xl border-2 border-border bg-canvas"
                    allow="gamepad; fullscreen"
                  />
                  <a
                    href={previewSrc(selected.previewUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm font-bold text-brand-strong underline"
                  >
                    {t("admin.previewFullscreen")}
                  </a>
                </div>
              )}

              <label className="mt-5 block">
                <span className="font-bold">{t("admin.noteLabel")}</span>
                <DictationField
                  className="mt-2"
                  value={note}
                  onChange={setNote}
                >
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder={t("admin.notePlaceholder")}
                    className="w-full rounded-lg border-2 border-border p-3 focus:border-brand focus:outline-none"
                  />
                </DictationField>
              </label>

              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => moderate(selected, "ask_for_changes")}
                >
                  {t("admin.askChanges")}
                </Button>
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={() => setRejectOpen(true)}
                >
                  {t("admin.reject")}
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => moderate(selected, "escalate")}
                >
                  {t("admin.escalate")}
                </Button>
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={() => setDeleteOpen(true)}
                >
                  {t("admin.remove")}
                </Button>
              </div>
            </aside>
          )}
        </div>

        <ConfirmDialog
          open={rejectOpen && Boolean(selected)}
          title={t("admin.rejectTitle")}
          body={t("admin.rejectBody")}
          confirmLabel={t("admin.rejectConfirm")}
          tone="danger"
          onCancel={() => setRejectOpen(false)}
          onConfirm={() => {
            if (!selected) return;
            setRejectOpen(false);
            void moderate(selected, "reject");
          }}
        />

        <ConfirmDialog
          open={deleteOpen && Boolean(selected)}
          title={t("admin.removeTitle")}
          body={t("admin.removeBody")}
          confirmLabel={t("admin.removeConfirm")}
          tone="danger"
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => {
            void removeSelected();
          }}
        />

        <AdminAccountsPanel />

        <section className="mt-14">
          <h2 className="text-2xl font-extrabold">{t("admin.reportsTitle")}</h2>
          <p className="mt-1 text-ink-muted">{t("admin.reportsSub")}</p>
          <ul className="mt-5 space-y-3">
            {openReports.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-1)]"
              >
                <div>
                  <p className="font-extrabold">{r.projectTitle}</p>
                  <p className="text-sm font-bold text-brand-strong">
                    {t(`report.${r.reason}`)}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {t("admin.reportedAt", {
                      when: formatDateTime(r.createdAt),
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button href={`/project/${r.projectId}`} variant="secondary">
                    {t("admin.openProject")}
                  </Button>
                  <Button variant="ghost" onClick={() => resolveReport(r.id)}>
                    {t("admin.markResolved")}
                  </Button>
                </div>
              </li>
            ))}
            {openReports.length === 0 && (
              <li className="rounded-xl bg-mint/40 px-5 py-8 text-center text-ink-muted">
                {t("admin.reportsEmpty")}
              </li>
            )}
          </ul>
        </section>
      </main>
    </>
  );
}
