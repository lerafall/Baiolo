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

export type AiClarifyQuestion = {
  id: string;
  question: string;
};

export type AiClarifyResult =
  | { status: "ready" }
  | { status: "clarify"; questions: AiClarifyQuestion[] };

export type AiAnswer = {
  id?: string;
  question: string;
  answer: string;
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

export function parseAiBuildPayload(
  raw: string,
): Omit<AiBuildResult, "provider"> | null {
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

export function parseClarifyPayload(raw: string): AiClarifyResult {
  let parsed: {
    ready?: unknown;
    questions?: unknown;
  };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    return { status: "ready" };
  }

  if (parsed.ready === true) return { status: "ready" };

  const questions: AiClarifyQuestion[] = [];
  if (Array.isArray(parsed.questions)) {
    for (let i = 0; i < parsed.questions.length && questions.length < 4; i++) {
      const item = parsed.questions[i];
      if (typeof item === "string" && item.trim()) {
        questions.push({
          id: `q${i + 1}`,
          question: item.trim().slice(0, 200),
        });
        continue;
      }
      if (item && typeof item === "object") {
        const obj = item as {
          id?: unknown;
          question?: unknown;
          text?: unknown;
        };
        const q =
          (typeof obj.question === "string" && obj.question.trim()) ||
          (typeof obj.text === "string" && obj.text.trim()) ||
          "";
        if (!q) continue;
        const id =
          typeof obj.id === "string" && obj.id.trim()
            ? obj.id.trim().slice(0, 32)
            : `q${i + 1}`;
        questions.push({ id, question: q.slice(0, 200) });
      }
    }
  }

  if (questions.length === 0) return { status: "ready" };
  return { status: "clarify", questions };
}

export function composeBuildBrief(
  prompt: string,
  answers?: AiAnswer[],
): string {
  const base = prompt.trim().slice(0, 2000);
  const useful = (answers ?? []).filter((a) => a.answer.trim());
  if (useful.length === 0) return base;
  const qa = useful
    .map(
      (a, i) =>
        `Q${i + 1}: ${a.question.trim().slice(0, 200)}\nA${i + 1}: ${a.answer.trim().slice(0, 400)}`,
    )
    .join("\n");
  return `${base}\n\nClarifications from the creator:\n${qa}`.slice(0, 3500);
}

const CLARIFY_SYSTEM = `You help Baiolo prepare a tiny HTML/CSS/JS game or tool from a creator’s short idea.
Decide if the idea is clear enough to build a playable MVP in one sitting.

Reply with JSON only:
{"ready":true}
or
{"ready":false,"questions":["...","..."]}

Rules:
- Ask only when something important is missing or ambiguous (goal, win condition, main interaction, theme).
- Max 3 short questions. Plain English. No jargon.
- If the idea is already clear enough for a simple MVP, set ready:true — do not over-ask.
- Never ask about tech stack, hosting, accounts, or monetization.`;

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
- Max ~200 lines of JS. Make something people can try in under a minute.
- Honor clarifications from the creator when provided.`;

export async function clarifyBuildPrompt(
  prompt: string,
): Promise<AiClarifyResult> {
  try {
    const { content } = await chatCompletionJson({
      system: CLARIFY_SYSTEM,
      user: `Creator idea:\n${prompt.slice(0, 2000)}`,
      temperature: 0.2,
      tier: "fast",
    });
    return parseClarifyPayload(content);
  } catch {
    // If clarify fails, proceed to build rather than blocking the user.
    return { status: "ready" };
  }
}

export async function buildFromDescription(
  prompt: string,
  answers?: AiAnswer[],
): Promise<AiBuildResult> {
  const brief = composeBuildBrief(prompt, answers);
  const builderUrl = process.env.BUILDER_API_URL?.trim();
  if (builderUrl) {
    return buildViaExternal(builderUrl, brief, answers);
  }
  return buildViaLlm(brief);
}

async function buildViaExternal(
  url: string,
  prompt: string,
  answers?: AiAnswer[],
): Promise<AiBuildResult> {
  const secret = process.env.BUILDER_API_SECRET?.trim();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({ prompt, answers }),
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

async function buildViaLlm(brief: string): Promise<AiBuildResult> {
  const tier = pickBuildTier(brief);
  const { content, provider, model } = await chatCompletionJson({
    system: SYSTEM_PROMPT,
    user: `Build this Baiolo project:\n${brief}`,
    temperature: 0.7,
    tier,
  });
  const parsed = parseAiBuildPayload(content);
  if (!parsed) throw new Error("llm_bad_payload");
  return { ...parsed, provider, model, tier };
}
