"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { computeCreatorAnalytics } from "@/lib/creator-analytics";
import { formatCount } from "@/lib/format";
import { PLAN_LIMITS, analyticsTierAtLeast } from "@/lib/plans.config";
import { useSession } from "@/lib/session";
import { useSubmissions } from "@/lib/submissions";
import { useT } from "@/lib/i18n/LocaleProvider";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function CreatorAnalyticsPage() {
  const t = useT();
  const { session } = useSession();
  const { items, ready } = useSubmissions();
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState("");
  const stats = useMemo(() => computeCreatorAnalytics(items), [items]);
  const maxTop = Math.max(1, ...stats.topProjects.map((p) => p.plays + p.reactions));
  const plan = session.plan;
  const tier = PLAN_LIMITS[plan].analytics;
  const showTrends = analyticsTierAtLeast(plan, "trends");
  const showExport = analyticsTierAtLeast(plan, "export_api");

  async function downloadExport() {
    setExportError("");
    setExportBusy(true);
    try {
      if (!isSupabaseConfigured()) {
        const blob = new Blob(
          [
            [
              "id,title,status,plays,reactions",
              ...items.map(
                (p) =>
                  `${p.id},"${(p.title || "").replace(/"/g, '""')}",${p.status},${p.plays},${p.reactions}`,
              ),
            ].join("\n"),
          ],
          { type: "text/csv" },
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "baiolo-analytics.csv";
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      const res = await fetch("/api/projects/analytics/export?format=csv");
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setExportError(data?.error || t("analytics.exportFail"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "baiolo-analytics.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError(t("analytics.exportFail"));
    } finally {
      setExportBusy(false);
    }
  }

  function TrendBars({
    title,
    buckets,
  }: {
    title: string;
    buckets: typeof stats.trends7;
  }) {
    const max = Math.max(1, ...buckets.map((b) => b.submissions + (b.plays > 0 ? 1 : 0)));
    return (
      <section className="mt-10">
        <h2 className="text-2xl font-extrabold">{title}</h2>
        <ul className="mt-4 space-y-2">
          {buckets.map((b) => (
            <li key={b.date} className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0 font-semibold text-ink-muted">
                {b.date.slice(5)}
              </span>
              <div className="h-3 flex-1 overflow-hidden rounded-pill bg-lilac">
                <div
                  className="h-full rounded-pill bg-brand"
                  style={{
                    width: `${Math.round((b.submissions / max) * 100)}%`,
                  }}
                />
              </div>
              <span className="w-28 shrink-0 text-right text-ink-muted">
                {t("analytics.trendMeta", {
                  n: b.submissions,
                  plays: formatCount(b.plays),
                })}
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <>
      <SiteHeader showJoin={false} />
      <main className="mx-auto w-full max-w-3xl px-5 py-10 md:px-8">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-strong">
          {t("analytics.eyebrow")}
        </p>
        <h1 className="mt-2 text-4xl font-extrabold">{t("analytics.title")}</h1>
        <p className="mt-2 text-ink-muted">{t("analytics.sub")}</p>
        <p className="mt-2 text-sm font-semibold text-ink-muted">
          {t("analytics.tierNote", {
            tier: t(`analytics.tier.${tier}`),
            plan: t(`pricing.${plan}.title`),
          })}
        </p>

        {!ready && (
          <p className="mt-8 text-ink-muted">{t("common.loading")}</p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[
            { label: t("analytics.plays"), value: formatCount(stats.totalPlays) },
            {
              label: t("analytics.reactions"),
              value: formatCount(stats.totalReactions),
            },
            {
              label: t("analytics.public"),
              value: String(stats.publishedCount),
            },
            {
              label: t("analytics.private"),
              value: String(stats.privateCount),
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border-2 border-border bg-surface p-5 shadow-[var(--shadow-1)]"
            >
              <p className="text-sm font-bold text-ink-muted">{card.label}</p>
              <p className="mt-2 text-3xl font-extrabold">{card.value}</p>
            </div>
          ))}
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-extrabold">{t("analytics.top")}</h2>
          <ul className="mt-4 space-y-3">
            {stats.topProjects.length === 0 && (
              <li className="rounded-xl bg-lilac/40 px-4 py-6 text-ink-muted">
                {t("analytics.empty")}
              </li>
            )}
            {stats.topProjects.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border-2 border-border bg-surface p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/project/${p.id}`}
                    className="font-extrabold text-brand-strong underline"
                  >
                    {p.title}
                  </Link>
                  <p className="text-sm text-ink-muted">
                    {t("analytics.rowMeta", {
                      plays: formatCount(p.plays),
                      reactions: p.reactions,
                    })}
                  </p>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-pill bg-lilac">
                  <div
                    className="h-full rounded-pill bg-brand"
                    style={{
                      width: `${Math.round(
                        ((p.plays + p.reactions) / maxTop) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {showTrends ? (
          <>
            <TrendBars title={t("analytics.trends7")} buckets={stats.trends7} />
            <TrendBars title={t("analytics.trends30")} buckets={stats.trends30} />
          </>
        ) : (
          <section className="mt-10 rounded-xl border-2 border-dashed border-border bg-lilac/30 p-5">
            <p className="font-extrabold">{t("analytics.trendsLockedTitle")}</p>
            <p className="mt-2 text-ink-muted">{t("analytics.trendsLockedBody")}</p>
            <Button href="/pricing" className="mt-4" variant="secondary">
              {t("projects.seePlans")}
            </Button>
          </section>
        )}

        {showExport ? (
          <section className="mt-10">
            <h2 className="text-2xl font-extrabold">{t("analytics.exportTitle")}</h2>
            <p className="mt-2 text-ink-muted">{t("analytics.exportBody")}</p>
            {exportError && (
              <p className="mt-3 font-semibold text-danger">{exportError}</p>
            )}
            <Button
              type="button"
              className="mt-4"
              disabled={exportBusy}
              onClick={() => void downloadExport()}
            >
              {exportBusy ? t("analytics.exporting") : t("analytics.exportCta")}
            </Button>
          </section>
        ) : (
          <section className="mt-10 rounded-xl border-2 border-dashed border-border bg-lilac/30 p-5">
            <p className="font-extrabold">{t("analytics.exportLockedTitle")}</p>
            <p className="mt-2 text-ink-muted">{t("analytics.exportLockedBody")}</p>
            <Button href="/pricing" className="mt-4" variant="secondary">
              {t("projects.seePlans")}
            </Button>
          </section>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          <Button href="/projects">{t("nav.projects")}</Button>
          <Button href="/create" variant="secondary">
            {t("projects.addProject")}
          </Button>
        </div>
      </main>
    </>
  );
}
