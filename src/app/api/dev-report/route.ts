/* TEMPORARY diagnostics sink for the Foxfire Hollow phone issue.
 * Keeps the last few reports in memory so they can be read back over HTTP.
 * Delete this route once the issue is closed. */

const KEY = "foxfire-diag";
const MAX = 8;

type Store = { reports: { at: string; body: unknown }[] };
const g = globalThis as unknown as { __foxfireDiag?: Store };
g.__foxfireDiag ??= { reports: [] };

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("k") !== KEY) return new Response("nope", { status: 403 });
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = { parseError: true };
  }
  const store = g.__foxfireDiag!;
  store.reports.unshift({ at: new Date().toISOString(), body });
  store.reports.length = Math.min(store.reports.length, MAX);
  return Response.json({ ok: true, stored: store.reports.length });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("k") !== KEY) return new Response("nope", { status: 403 });
  return Response.json(g.__foxfireDiag!.reports);
}
