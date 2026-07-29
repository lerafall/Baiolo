"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DictationField } from "@/components/ui/DictationField";
import { formatDateTime } from "@/lib/format";
import type { AdminAccount } from "@/lib/admin-accounts";

const adminCode =
  process.env.NEXT_PUBLIC_BAIOLO_ADMIN_CODE || "baiolo-admin";

export function AdminAccountsPanel() {
  const [items, setItems] = useState<AdminAccount[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [planBusyId, setPlanBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(
        `/api/admin/accounts?adminCode=${encodeURIComponent(adminCode)}`,
      );
      const data = (await res.json()) as {
        items?: AdminAccount[];
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setError(data.error || "Couldn’t load accounts.");
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
      setMessage(data.message || "");
    } catch {
      setError("Couldn’t load accounts.");
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function removeAccount(id: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, adminCode }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Delete failed.");
        return;
      }
      setItems((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setBusy(false);
      setDeleteId(null);
    }
  }

  function labelPlan(plan: string | null | undefined) {
    if (plan === "pro" || plan === "paid" || plan === "paid_basic") return "Pro";
    if (plan === "studio" || plan === "paid_pro") return "Studio";
    return "Free";
  }

  async function setAccountPlan(id: string, nextPlan: string) {
    setError("");
    setPlanBusyId(id);
    try {
      const res = await fetch("/api/admin/accounts/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, plan: nextPlan, adminCode }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "Plan update failed.");
        return;
      }
      setItems((prev) => prev.map((a) => (a.id === id ? { ...a, plan: nextPlan } : a)));
    } catch {
      setError("Plan update failed.");
    } finally {
      setPlanBusyId(null);
    }
  }

  const filtered = items.filter((a) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      a.name.toLowerCase().includes(q) ||
      (a.email ?? "").toLowerCase().includes(q) ||
      (a.provider ?? "").toLowerCase().includes(q) ||
      a.role.toLowerCase().includes(q)
    );
  });

  const pending = items.find((a) => a.id === deleteId) ?? null;

  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold">Accounts</h2>
          <p className="mt-1 text-ink-muted">
            Browse sign-ups and remove accounts when needed.
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => void load()}
        >
          Refresh
        </Button>
      </div>

      <label className="mt-5 block max-w-md">
        <span className="sr-only">Search accounts</span>
        <DictationField
          value={query}
          onChange={setQuery}
          append={false}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, provider"
            className="min-h-12 w-full rounded-pill border-2 border-border bg-surface px-5 text-ink placeholder:text-placeholder focus:border-brand focus:outline-none"
          />
        </DictationField>
      </label>

      {error && (
        <p className="mt-4 font-semibold text-danger">{error}</p>
      )}
      {message && !error && (
        <p className="mt-4 text-sm text-ink-muted">{message}</p>
      )}

      {!ready && <p className="mt-6 text-ink-muted">Loading accounts…</p>}

      <ul className="mt-5 space-y-3">
        {filtered.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-1)]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-lilac text-2xl">
                {a.avatar}
              </span>
              <div className="min-w-0">
                <p className="truncate font-extrabold">{a.name}</p>
                <p className="truncate text-sm text-ink-muted">
                  {a.email || "No email"} · {a.provider || "unknown"} ·{" "}
                  {a.role} · {labelPlan(a.plan)}
                </p>
                <p className="text-xs text-ink-muted">
                  Joined{" "}
                  {a.createdAt ? formatDateTime(a.createdAt) : "—"}
                  {a.lastSignInAt
                    ? ` · Last sign-in ${formatDateTime(a.lastSignInAt)}`
                    : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="l"
                disabled={busy || planBusyId === a.id}
                variant={(a.plan ?? "free") === "free" ? undefined : "secondary"}
                onClick={() => void setAccountPlan(a.id, "free")}
              >
                Free
              </Button>
              <Button
                size="l"
                disabled={busy || planBusyId === a.id}
                variant={(a.plan ?? "free") === "pro" ? undefined : "secondary"}
                onClick={() => void setAccountPlan(a.id, "pro")}
              >
                Pro
              </Button>
              <Button
                size="l"
                disabled={busy || planBusyId === a.id}
                variant={(a.plan ?? "free") === "studio" ? undefined : "secondary"}
                onClick={() => void setAccountPlan(a.id, "studio")}
              >
                Studio
              </Button>
            </div>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => setDeleteId(a.id)}
            >
              Delete account
            </Button>
          </li>
        ))}
        {ready && filtered.length === 0 && (
          <li className="rounded-xl bg-mint/40 px-5 py-8 text-center text-ink-muted">
            No accounts found.
          </li>
        )}
      </ul>

      <ConfirmDialog
        open={Boolean(pending)}
        title="Delete this account?"
        body={
          pending
            ? `Removes ${pending.name}${pending.email ? ` (${pending.email})` : ""} from Baiolo auth. Their projects stay, but lose the owner link.`
            : ""
        }
        confirmLabel="Yes, delete account"
        tone="danger"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (pending) void removeAccount(pending.id);
        }}
      />
    </section>
  );
}
