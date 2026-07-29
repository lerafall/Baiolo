/**
 * External builder (path B) contract.
 * POST BUILDER_API_URL with JSON body; expect Baiolo build JSON back.
 */

export type BuilderRequest = {
  prompt: string;
  messages?: Array<{ role: "assistant" | "user"; content: string }>;
  locale?: string;
  categoryHint?: string | null;
  existingFiles?: Record<string, string> | null;
};

export type BuilderResponse = {
  title?: string;
  description?: string;
  category?: string;
  files?: Record<string, string>;
  error?: string;
};

const DEFAULT_TIMEOUT_MS = 85_000;

export async function callExternalBuilder(
  url: string,
  body: BuilderRequest,
  secret?: string,
): Promise<BuilderResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        "X-Baiolo-Builder": "1",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let data: BuilderResponse = {};
    try {
      data = JSON.parse(text) as BuilderResponse;
    } catch {
      throw new Error(`builder_bad_json_${res.status}`);
    }
    if (!res.ok) {
      throw new Error(data.error || `builder_http_${res.status}`);
    }
    return data;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("builder_timeout");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Optional health ping: BUILDER_HEALTH_URL, or BUILDER_API_URL with /build stripped + /health */
export async function pingBuilderHealth(): Promise<{
  ok: boolean;
  detail: string;
}> {
  const explicit = process.env.BUILDER_HEALTH_URL?.trim();
  const buildUrl = process.env.BUILDER_API_URL?.trim();
  let health = explicit || "";
  if (!health && buildUrl) {
    // BUILDER_API_URL is often …/build — health lives at …/health, not …/build/health
    const base = buildUrl.replace(/\/$/, "").replace(/\/build$/i, "");
    health = `${base}/health`;
  }
  if (!health) return { ok: false, detail: "not_configured" };
  try {
    const res = await fetch(health, { method: "GET" });
    return {
      ok: res.ok,
      detail: res.ok ? "ok" : `http_${res.status}`,
    };
  } catch (e) {
    return {
      ok: false,
      detail: e instanceof Error ? e.message : "network",
    };
  }
}
