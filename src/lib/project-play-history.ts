/**
 * Lightweight local play snapshots for week-over-week / 7-day sparklines
 * on the creator projects dashboard (no warehouse required).
 */

export type PlaySample = { day: string; plays: number };

const KEY = "baiolo.project-play-history.v1";

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function readAll(): Record<string, PlaySample[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, PlaySample[]>) : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, PlaySample[]>) {
  localStorage.setItem(KEY, JSON.stringify(map));
}

/** Record today's plays for a project (idempotent per day). */
export function recordPlaySnapshot(projectId: string, plays: number) {
  if (typeof window === "undefined") return;
  const map = readAll();
  const day = dayKey();
  const prev = map[projectId] || [];
  const withoutToday = prev.filter((s) => s.day !== day);
  const next = [...withoutToday, { day, plays }].slice(-30);
  map[projectId] = next;
  writeAll(map);
}

export function getPlayHistory(projectId: string): PlaySample[] {
  return readAll()[projectId] || [];
}

export type TrendSummary = {
  points: number[];
  changePct: number | null;
  label: "up" | "down" | "flat" | "new";
};

/** Build 7 daily points + WoW-ish % from snapshots (pad with earliest known). */
export function summarizePlayTrend(
  history: PlaySample[],
  currentPlays: number,
  now = new Date(),
): TrendSummary {
  const byDay = new Map(history.map((s) => [s.day, s.plays]));
  byDay.set(dayKey(now), currentPlays);

  const points: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    let plays = byDay.get(key);
    if (plays === undefined) {
      // carry forward last known earlier value
      let found: number | undefined;
      for (let j = i + 1; j <= 14; j++) {
        const back = new Date(now);
        back.setDate(now.getDate() - j);
        const v = byDay.get(dayKey(back));
        if (v !== undefined) {
          found = v;
          break;
        }
      }
      plays = found ?? 0;
    }
    points.push(plays);
  }

  const today = points[6] ?? currentPlays;
  const weekAgo = points[0] ?? 0;
  if (weekAgo <= 0 && today <= 0) {
    return { points, changePct: null, label: "new" };
  }
  if (weekAgo <= 0) {
    return { points, changePct: null, label: "up" };
  }
  const changePct = Math.round(((today - weekAgo) / weekAgo) * 100);
  const label =
    changePct > 3 ? "up" : changePct < -3 ? "down" : ("flat" as const);
  return { points, changePct, label };
}
