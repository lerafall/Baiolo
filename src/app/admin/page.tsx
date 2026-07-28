"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import type { RiskLevel } from "@/lib/moderation";
import type { ProjectSubmission } from "@/lib/moderation";
import { useSession } from "@/lib/session";
import { reportReasonLabel, useContentReports } from "@/lib/reports";
import { formatDateTime } from "@/lib/format";
import { useSubmissions } from "@/lib/submissions";
import { thumbBackgroundStyle } from "@/lib/thumb-style";

const riskFilters: Array<{ id: "all" | RiskLevel; label: string }> = [
  { id: "all", label: "All risk" },
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

export default function AdminModerationPage() {
  const { isAdmin, unlockAdmin, ready: sessionReady } = useSession();
  const { items, ready, upsert, refresh, saveAll } = useSubmissions();
  const { open: openReports, resolve: resolveReport } = useContentReports();
  const [risk, setRisk] = useState<"all" | RiskLevel>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [code, setCode] = useState("");
  const [gateError, setGateError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [seedFlash, setSeedFlash] = useState("");

  const queue = useMemo(() => {
    return items.filter((p) =>
      [
        "submitted",
        "checking",
        "in_review",
        "needs_changes",
        "published",
      ].includes(p.status),
    );
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return queue.filter((p) => {
      const matchRisk = risk === "all" || p.risk === risk;
      const matchQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.aiFlags ?? []).some((f) => f.toLowerCase().includes(q));
      return matchRisk && matchQuery;
    });
  }, [queue, risk, query]);

  const selected =
    filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? null;

  async function moderate(
    project: ProjectSubmission,
    action: "approve" | "reject" | "ask_for_changes" | "escalate",
  ) {
    setBusy(true);
    try {
      const res = await fetch("/api/projects/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project,
          action,
          note,
          adminCode:
            process.env.NEXT_PUBLIC_BAIOLO_ADMIN_CODE || "baiolo-admin",
        }),
      });
      const data = (await res.json()) as {
        project?: ProjectSubmission;
        error?: string;
      };
      if (!res.ok || !data.project) {
        setGateError(data.error || "That action didn’t work.");
        return;
      }
      upsert(data.project);
      void refresh();
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
        body: JSON.stringify({
          adminCode:
            process.env.NEXT_PUBLIC_BAIOLO_ADMIN_CODE || "baiolo-admin",
        }),
      });
      const data = (await res.json()) as {
        items?: ProjectSubmission[];
        seeded?: number;
        error?: string;
      };
      if (!res.ok) {
        setGateError(data.error || "Seed didn’t work.");
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
          ? `Seeded ${data.seeded} demo projects to the cloud.`
          : "Demo projects ready locally.",
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
          adminCode:
            process.env.NEXT_PUBLIC_BAIOLO_ADMIN_CODE || "baiolo-admin",
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setGateError(data.error || "Couldn’t remove that project.");
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
    if (!isAdmin) return;

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
      if ((e.key === "a" || e.key === "A") && selected) {
        e.preventDefault();
        void moderate(selected, "approve");
      }
      if ((e.key === "r" || e.key === "R") && selected) {
        e.preventDefault();
        setRejectOpen(true);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (sessionReady && !isAdmin) {
    return (
      <>
        <SiteHeader showJoin={false} />
        <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-5 py-12">
          <h1 className="text-4xl font-extrabold">Admin access</h1>
          <p className="mt-3 text-ink-muted">
            Enter the demo admin code to open the moderation queue.
          </p>
          <form
            className="mt-8"
            onSubmit={(e) => {
              e.preventDefault();
              const ok = unlockAdmin(code);
              setGateError(ok ? "" : "That admin code didn’t work.");
            }}
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Admin code"
              className="min-h-14 w-full rounded-pill border-2 border-border px-5 text-lg focus:border-brand focus:outline-none"
            />
            {gateError && (
              <p className="mt-3 font-semibold text-danger">{gateError}</p>
            )}
            <Button type="submit" className="mt-6 w-full" size="l">
              Unlock queue
            </Button>
          </form>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader showJoin={false} />
      <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8">
        <h1 className="text-4xl font-extrabold">Moderation queue</h1>
        <p className="mt-2 text-lg text-ink-muted">
          AI helps flag risk. A human always decides before publish.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Keys: j/k move · a approve · r reject
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void seedDemos()}
          >
            Seed demo projects
          </Button>
          {seedFlash && (
            <p className="self-center text-sm font-bold text-secondary-strong">
              {seedFlash}
            </p>
          )}
        </div>

        <label className="mt-6 block max-w-md">
          <span className="sr-only">Search queue</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, description, flags"
            className="min-h-12 w-full rounded-pill border-2 border-border bg-surface px-5 text-ink placeholder:text-placeholder focus:border-brand focus:outline-none"
          />
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

        {!ready && <p className="mt-8 text-ink-muted">Loading queue…</p>}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <ul className="space-y-3">
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(p.id);
                    setNote(p.changeRequest ?? "");
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
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">
                      Risk: {p.risk ?? "—"} · {p.aiFlags[0] ?? "No AI flags"}
                    </p>
                  </div>
                </button>
              </li>
            ))}
            {ready && filtered.length === 0 && (
              <li className="rounded-xl bg-mint/40 px-5 py-10 text-center">
                <p className="text-xl font-extrabold">Queue is clear</p>
                <p className="mt-2 text-ink-muted">Nothing waiting for review.</p>
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
                <span className="inline-flex min-h-8 items-center rounded-pill bg-lilac/70 px-3 text-sm font-bold capitalize text-brand-strong">
                  {selected.risk ?? "unknown"} risk
                </span>
              </div>

              {selected.aiFlags.length > 0 && (
                <div className="mt-4 rounded-lg bg-warning/15 p-4">
                  <p className="font-bold">AI flags</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
                    {selected.aiFlags.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              <label className="mt-5 block">
                <span className="font-bold">Note for creator (optional)</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Please soften the cover colors a little."
                  className="mt-2 w-full rounded-lg border-2 border-border p-3 focus:border-brand focus:outline-none"
                />
              </label>

              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  disabled={busy}
                  onClick={() => moderate(selected, "approve")}
                >
                  {selected.status === "published"
                    ? "Refresh in-browser play"
                    : "Approve"}
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => moderate(selected, "ask_for_changes")}
                >
                  Ask for changes
                </Button>
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={() => setRejectOpen(true)}
                >
                  Reject
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => moderate(selected, "escalate")}
                >
                  Escalate
                </Button>
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={() => setDeleteOpen(true)}
                >
                  Remove
                </Button>
              </div>
            </aside>
          )}
        </div>

        <ConfirmDialog
          open={rejectOpen && Boolean(selected)}
          title="Reject this project?"
          body="It won’t go public. The creator will see a rejected status."
          confirmLabel="Yes, reject"
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
          title="Remove this project?"
          body="Deletes it from the cloud queue and store. This can’t be undone here."
          confirmLabel="Yes, remove"
          tone="danger"
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => {
            void removeSelected();
          }}
        />

        <section className="mt-14">
          <h2 className="text-2xl font-extrabold">User reports</h2>
          <p className="mt-1 text-ink-muted">
            People tapped Report on these projects.
          </p>
          <ul className="mt-5 space-y-3">
            {openReports.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-1)]"
              >
                <div>
                  <p className="font-extrabold">{r.projectTitle}</p>
                  <p className="text-sm font-bold text-brand-strong">
                    {reportReasonLabel(r.reason)}
                  </p>
                  <p className="text-sm text-ink-muted">
                    Reported {formatDateTime(r.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button href={`/project/${r.projectId}`} variant="secondary">
                    Open
                  </Button>
                  <Button variant="ghost" onClick={() => resolveReport(r.id)}>
                    Mark resolved
                  </Button>
                </div>
              </li>
            ))}
            {openReports.length === 0 && (
              <li className="rounded-xl bg-mint/40 px-5 py-8 text-center text-ink-muted">
                No open reports. Nice and calm.
              </li>
            )}
          </ul>
        </section>
      </main>
    </>
  );
}
