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

export type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

export type ChatTurnResult =
  | { status: "ready"; message: string }
  | { status: "chat"; message: string };

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

export const MAX_CHAT_ASSISTANT_TURNS = 3;

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

export function parseChatTurnPayload(raw: string): ChatTurnResult {
  let parsed: { ready?: unknown; message?: unknown };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    return {
      status: "ready",
      message: "Sounds good — I’ll build it now.",
    };
  }

  const message =
    typeof parsed.message === "string" && parsed.message.trim()
      ? parsed.message.trim().slice(0, 400)
      : "";

  if (parsed.ready === true) {
    return {
      status: "ready",
      message: message || "Perfect — I’ll build that now.",
    };
  }

  if (!message) {
    return {
      status: "ready",
      message: "Got it — building now.",
    };
  }

  return { status: "chat", message };
}

export function normalizeChatMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as ChatMessage;
    if (row.role !== "assistant" && row.role !== "user") continue;
    const content = typeof row.content === "string" ? row.content.trim() : "";
    if (!content) continue;
    out.push({ role: row.role, content: content.slice(0, 500) });
    if (out.length >= 12) break;
  }
  return out;
}

export function composeBuildBrief(
  prompt: string,
  messages?: ChatMessage[],
): string {
  const base = prompt.trim().slice(0, 2000);
  const chat = (messages ?? []).filter((m) => m.content.trim());
  if (chat.length === 0) return base;
  const lines = chat
    .map((m) =>
      m.role === "assistant"
        ? `Baiolo: ${m.content.trim()}`
        : `Creator: ${m.content.trim()}`,
    )
    .join("\n");
  return `${base}\n\nFriendly chat with the creator:\n${lines}`.slice(0, 3500);
}

function chatSystemPrompt(locale: string) {
  const language =
    locale === "pl"
      ? "Write every message in natural, warm Polish (like texting a friend)."
      : "Write every message in natural, warm English (like texting a friend).";

  return `You are Baiolo’s friendly helper. You chat with creators before building a tiny HTML game or tool.

${language}

Reply with JSON only:
{"ready":true,"message":"..."}
or
{"ready":false,"message":"..."}

How to talk:
- Sound human, kind, and simple — not like a form or a survey.
- Ask at most ONE easy thing at a time.
- Prefer choices people can answer in a few words (“pastel or neon?”, “tap or swipe?”, “catch 5 or 10?”).
- Short messages (1–2 sentences). No jargon, no tech talk.
- If the idea is already clear enough for a small MVP, set ready:true with a warm confirmation.
- After a couple of replies, prefer ready:true instead of more questions.
- Never ask about accounts, money, hosting, frameworks, or code.`;
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
- Max ~200 lines of JS. Make something people can try in under a minute.
- Honor the friendly chat with the creator when provided.`;

export async function continueBuildChat(options: {
  prompt: string;
  messages: ChatMessage[];
  locale?: string;
}): Promise<ChatTurnResult> {
  const assistantTurns = options.messages.filter(
    (m) => m.role === "assistant",
  ).length;
  if (assistantTurns >= MAX_CHAT_ASSISTANT_TURNS) {
    return {
      status: "ready",
      message:
        options.locale === "pl"
          ? "Super, mam już wystarczająco — buduję."
          : "Great, that’s enough — I’ll build it now.",
    };
  }

  try {
    const history =
      options.messages.length === 0
        ? "(no chat yet — this is your first reply)"
        : options.messages
            .map((m) => `${m.role === "assistant" ? "Baiolo" : "Creator"}: ${m.content}`)
            .join("\n");

    const { content } = await chatCompletionJson({
      system: chatSystemPrompt(options.locale || "en"),
      user: `Creator’s idea:\n${options.prompt.slice(0, 2000)}\n\nChat so far:\n${history}\n\nDecide: ask one easy follow-up, or say you’re ready to build.`,
      temperature: 0.5,
      tier: "fast",
    });
    return parseChatTurnPayload(content);
  } catch {
    return {
      status: "ready",
      message:
        options.locale === "pl"
          ? "Dobra, buduję z tego co mam."
          : "Alright — I’ll build from what we have.",
    };
  }
}

export async function buildFromDescription(
  prompt: string,
  messages?: ChatMessage[],
): Promise<AiBuildResult> {
  const brief = composeBuildBrief(prompt, messages);
  const builderUrl = process.env.BUILDER_API_URL?.trim();
  if (builderUrl) {
    return buildViaExternal(builderUrl, brief, messages);
  }
  return buildViaLlm(brief);
}

async function buildViaExternal(
  url: string,
  prompt: string,
  messages?: ChatMessage[],
): Promise<AiBuildResult> {
  const secret = process.env.BUILDER_API_SECRET?.trim();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({ prompt, messages }),
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
