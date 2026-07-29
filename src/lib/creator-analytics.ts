import type { ProjectSubmission } from "@/lib/moderation";
import type { AnalyticsTier } from "@/lib/plans.config";

export type CreatorAnalytics = {
  projectCount: number;
  publishedCount: number;
  privateCount: number;
  totalPlays: number;
  totalReactions: number;
  topProjects: Array<{
    id: string;
    title: string;
    plays: number;
    reactions: number;
    status: string;
  }>;
  byStatus: Record<string, number>;
  trends7: TrendBucket[];
  trends30: TrendBucket[];
};

export type TrendBucket = {
  date: string;
  submissions: number;
  plays: number;
};

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function buildTrendBuckets(
  items: ProjectSubmission[],
  days: number,
  now = new Date(),
): TrendBucket[] {
  const buckets: TrendBucket[] = [];
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const byDay = new Map<string, TrendBucket>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = dayKey(d.toISOString());
    byDay.set(key, { date: key, submissions: 0, plays: 0 });
  }

  for (const p of items) {
    const key = dayKey(p.updatedAt || "");
    const bucket = byDay.get(key);
    if (!bucket) continue;
    bucket.submissions += 1;
    // Approximate: attribute current play count to the update day (no daily play warehouse).
    bucket.plays += p.plays || 0;
  }

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = dayKey(d.toISOString());
    buckets.push(byDay.get(key) || { date: key, submissions: 0, plays: 0 });
  }
  return buckets;
}

export function computeCreatorAnalytics(
  items: ProjectSubmission[],
): CreatorAnalytics {
  const byStatus: Record<string, number> = {};
  let totalPlays = 0;
  let totalReactions = 0;
  let publishedCount = 0;
  let privateCount = 0;

  for (const p of items) {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    totalPlays += p.plays || 0;
    totalReactions += p.reactions || 0;
    if (p.status === "published") publishedCount += 1;
    else if (p.status !== "draft") privateCount += 1;
  }

  const topProjects = [...items]
    .filter((p) => p.status !== "draft")
    .sort(
      (a, b) =>
        b.plays + b.reactions * 2 - (a.plays + a.reactions * 2),
    )
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      title: p.title || "Untitled",
      plays: p.plays,
      reactions: p.reactions,
      status: p.status,
    }));

  return {
    projectCount: items.length,
    publishedCount,
    privateCount,
    totalPlays,
    totalReactions,
    topProjects,
    byStatus,
    trends7: buildTrendBuckets(items, 7),
    trends30: buildTrendBuckets(items, 30),
  };
}

export function analyticsRowsForExport(items: ProjectSubmission[]) {
  return items.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    visibility: p.visibility ?? "",
    category: p.category ?? "",
    plays: p.plays,
    reactions: p.reactions,
    sourceType: p.sourceType ?? "",
    updatedAt: p.updatedAt,
  }));
}

export function toCsv(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) {
    return "id,title,status,visibility,category,plays,reactions,sourceType,updatedAt\n";
  }
  const keys = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [
    keys.join(","),
    ...rows.map((r) => keys.map((k) => escape(r[k] ?? "")).join(",")),
  ].join("\n");
}

/** Soft attribution labels from ?from= / ?ref= query on play. */
export function referrerLabel(raw: string | null | undefined) {
  if (!raw) return "direct";
  const v = raw.toLowerCase();
  if (v.includes("whatsapp") || v === "wa") return "whatsapp";
  if (v.includes("twitter") || v === "x") return "twitter";
  if (v.includes("facebook") || v === "fb") return "facebook";
  if (v.includes("telegram")) return "telegram";
  if (v.includes("explore")) return "explore";
  if (v.includes("share")) return "share";
  return raw.slice(0, 32);
}

export type { AnalyticsTier };
