import fs from "fs";

const path = [".env.local", ".env"].find((p) => fs.existsSync(p));
if (!path) {
  console.log(JSON.stringify({ ok: false, reason: "no_env_file" }));
  process.exit(2);
}

const raw = fs.readFileSync(path, "utf8");
const env = {};
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}

const key = (env.OPENROUTER_API_KEY || "").trim();
const openai = (env.OPENAI_API_KEY || "").trim();
if (!key && !openai) {
  console.log(
    JSON.stringify({
      ok: false,
      reason: "no_api_key",
      envFile: path,
      hint: "Set OPENROUTER_API_KEY in .env.local",
    }),
  );
  process.exit(3);
}

const useOr = Boolean(key);
const apiKey = key || openai;
const base = (
  useOr
    ? env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"
    : env.OPENAI_BASE_URL || "https://api.openai.com/v1"
).replace(/\/$/, "");
const model = useOr
  ? env.OPENROUTER_MODEL_FAST ||
    env.OPENROUTER_MODEL ||
    "openai/gpt-4o-mini"
  : env.OPENAI_MODEL_FAST || env.OPENAI_MODEL || "gpt-4o-mini";

const headers = {
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
};
if (useOr) {
  headers["HTTP-Referer"] = env.NEXT_PUBLIC_SITE_URL || "https://baiolo.com";
  headers["X-Title"] = "Baiolo";
}

try {
  const r = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 16,
      messages: [{ role: "user", content: "Reply with exactly: ok" }],
    }),
  });
  const text = await r.text();
  let detail = "";
  try {
    const j = JSON.parse(text);
    detail = j.error?.message || j.choices?.[0]?.message?.content || "";
  } catch {
    detail = text.slice(0, 120);
  }
  console.log(
    JSON.stringify({
      ok: r.ok,
      status: r.status,
      provider: useOr ? "openrouter" : "openai",
      model,
      envFile: path,
      detail: String(detail).slice(0, 200),
    }),
  );
  process.exit(r.ok ? 0 : 1);
} catch (e) {
  console.log(
    JSON.stringify({
      ok: false,
      reason: "network",
      detail: String(e.message || e).slice(0, 200),
    }),
  );
  process.exit(1);
}
