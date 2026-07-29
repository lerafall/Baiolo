import type { ProjectCategory } from "@/lib/types";
import type { StarterFiles } from "@/lib/html-starters";
import { chatCompletionJson, pickBuildTier } from "@/lib/llm";

export type AiBuildResult = {
  title: string;
  description: string;
  category: ProjectCategory;
  files: StarterFiles;
  provider: "openai" | "openrouter" | "builder";
  model?: string;
  tier?: "fast" | "quality";
};

const ALLOWED_FILES = new Set([
  "index.html",
  "style.css",
  "styles.css",
  "script.js",
  "main.js",
]);

const CATEGORIES: ProjectCategory[] = [
  "game",
  "tool",
  "experiment",
  "demo",
];

export function normalizeAiBuildFiles(
  raw: Record<string, unknown> | null | undefined,
): StarterFiles | null {
  if (!raw || typeof raw !== "object") return null;
  const files: StarterFiles = {};
  for (const [key, value] of Object.entries(raw)) {
    const name = key.replace(/^\.\//, "").split("/").pop() || key;
    if (!ALLOWED_FILES.has(name)) continue;
    if (typeof value !== "string" || !value.trim()) continue;
    files[name] = value;
  }
  if (!files["index.html"]?.trim()) return null;
  if (!files["style.css"] && files["styles.css"]) {
    files["style.css"] = files["styles.css"];
    delete files["styles.css"];
  }
  if (!files["script.js"] && files["main.js"]) {
    files["script.js"] = files["main.js"];
    delete files["main.js"];
  }
  return files;
}

export function parseAiBuildPayload(raw: string): Omit<AiBuildResult, "provider"> | null {
  let parsed: {
    title?: unknown;
    description?: unknown;
    category?: unknown;
    files?: Record<string, unknown>;
  };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    return null;
  }

  const files = normalizeAiBuildFiles(parsed.files);
  if (!files) return null;

  const category =
    typeof parsed.category === "string" &&
    CATEGORIES.includes(parsed.category as ProjectCategory)
      ? (parsed.category as ProjectCategory)
      : "experiment";

  const title =
    typeof parsed.title === "string" && parsed.title.trim()
      ? parsed.title.trim().slice(0, 60)
      : "AI project";
  const description =
    typeof parsed.description === "string" && parsed.description.trim()
      ? parsed.description.trim().slice(0, 280)
      : "Built from a description in Baiolo.";

  return { title, description, category, files };
}

const SYSTEM_PROMPT = `You build tiny playable static web apps for Baiolo (kids/creators MVP showcase).
Reply with JSON only:
{"title":"...","description":"...","category":"game|tool|experiment|demo","files":{"index.html":"...","style.css":"...","script.js":"..."}}

Rules:
- Self-contained HTML+CSS+JS only. No frameworks, no npm, no external CDNs, no fetch to unknown APIs.
- index.html must link style.css and script.js with relative paths.
- Mobile-friendly, large tap targets, works in an iframe sandbox.
- English UI copy in the generated app.
- Keep code short and working. Prefer canvas or simple DOM interactions.
- No violence, hate, adult content, phishing, malware, or collecting personal data.
- Max ~200 lines of JS. Make something people can try in under a minute.`;

export async function buildFromDescription(
  prompt: string,
): Promise<AiBuildResult> {
  const builderUrl = process.env.BUILDER_API_URL?.trim();
  if (builderUrl) {
    return buildViaExternal(builderUrl, prompt);
  }
  return buildViaLlm(prompt);
}

async function buildViaExternal(
  url: string,
  prompt: string,
): Promise<AiBuildResult> {
  const secret = process.env.BUILDER_API_SECRET?.trim();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    throw new Error(`builder_http_${res.status}`);
  }
  const data = (await res.json()) as {
    title?: string;
    description?: string;
    category?: string;
    files?: Record<string, unknown>;
  };
  const parsed = parseAiBuildPayload(JSON.stringify(data));
  if (!parsed) throw new Error("builder_bad_payload");
  return { ...parsed, provider: "builder" };
}

async function buildViaLlm(prompt: string): Promise<AiBuildResult> {
  const tier = pickBuildTier(prompt);
  const { content, provider, model } = await chatCompletionJson({
    system: SYSTEM_PROMPT,
    user: `Build this Baiolo project:\n${prompt.slice(0, 2000)}`,
    temperature: 0.7,
    tier,
  });
  const parsed = parseAiBuildPayload(content);
  if (!parsed) throw new Error("llm_bad_payload");
  return { ...parsed, provider, model, tier };
}
