import { getPublicSiteOrigin } from "@/lib/site-url";

export type LlmProvider = "openrouter" | "openai";
export type LlmTier = "fast" | "quality";

export type LlmChatConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: LlmProvider;
  tier: LlmTier;
  extraHeaders: Record<string, string>;
};

const COMPLEX_HINTS =
  /\b(multiplayer|physics|rpg|inventory|levels?|platformer|puzzle\s*chain|pathfind|enemy|ai\s*bot|3d|websocket|save\s*game|quest|crafting|procedural|animation\s*system)\b/i;

/** Interactive games need the stronger model — even short “catch coins” prompts. */
const GAME_HINTS =
  /\b(game|gra|gry|catch|łap|łowi|koszyk|basket|paddle|platform|monet|coin|enemy|wrog|player|gracz|canvas|sprite|spadaj|falling|shoot|strzel|jump|skacz|score|punkt)\b/i;

const FIX_HINTS =
  /\b(fix|repair|broken|bug|debug|nie\s*dzia[łl]a|nie\s*wida[cć]|bez\s*zmian|podgl[aą]d|popraw|napraw|nadal|still\s*not|doesn'?t\s*work|not\s*working)\b/i;

const SIMPLE_HINTS =
  /\b(timer|countdown|counter|color|paint|dice|flashcard|todo|checklist|stopwatch|button)\b/i;

/**
 * Route build prompts: short / simple tools → cheap (fast); games & fixes → quality.
 * Exported for tests.
 */
export function pickBuildTier(prompt: string): LlmTier {
  const text = prompt.trim();
  const len = text.length;
  if (FIX_HINTS.test(text) || GAME_HINTS.test(text)) return "quality";
  if (COMPLEX_HINTS.test(text) || len >= 280) return "quality";
  if (len <= 140 || SIMPLE_HINTS.test(text)) return "fast";
  // Medium prompts: prefer quality so apps stay usable
  return "quality";
}

function envTrim(name: string) {
  // Dynamic access keeps secrets readable at container runtime (not build-time empty).
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function openRouterHeaders(): Record<string, string> {
  return {
    "HTTP-Referer": getPublicSiteOrigin(),
    "X-Title": "Baiolo",
  };
}

function resolveAuth(): {
  apiKey: string;
  baseUrl: string;
  provider: LlmProvider;
  extraHeaders: Record<string, string>;
} | null {
  const openRouterKey = envTrim("OPENROUTER_API_KEY");
  if (openRouterKey) {
    return {
      apiKey: openRouterKey,
      baseUrl: (
        envTrim("OPENROUTER_BASE_URL") ||
        "https://openrouter.ai/api/v1"
      ).replace(/\/$/, ""),
      provider: "openrouter",
      extraHeaders: openRouterHeaders(),
    };
  }

  const openAiKey = envTrim("OPENAI_API_KEY");
  if (openAiKey) {
    const base = (
      envTrim("OPENAI_BASE_URL") || "https://api.openai.com/v1"
    ).replace(/\/$/, "");
    const viaRouter = base.includes("openrouter.ai");
    return {
      apiKey: openAiKey,
      baseUrl: base,
      provider: viaRouter ? "openrouter" : "openai",
      extraHeaders: viaRouter ? openRouterHeaders() : {},
    };
  }

  return null;
}

function modelForTier(
  provider: LlmProvider,
  tier: LlmTier,
): string {
  if (provider === "openrouter") {
    if (tier === "fast") {
      return (
        envTrim("OPENROUTER_MODEL_FAST") ||
        envTrim("OPENAI_MODEL_FAST") ||
        envTrim("OPENROUTER_MODEL") ||
        envTrim("OPENAI_MODEL") ||
        "openai/gpt-4o-mini"
      );
    }
    return (
      envTrim("OPENROUTER_MODEL_QUALITY") ||
      envTrim("OPENAI_MODEL_QUALITY") ||
      envTrim("OPENROUTER_MODEL") ||
      envTrim("OPENAI_MODEL") ||
      "openai/gpt-4o"
    );
  }

  if (tier === "fast") {
    return (
      envTrim("OPENAI_MODEL_FAST") ||
      envTrim("OPENAI_MODEL") ||
      "gpt-4o-mini"
    );
  }
  return (
    envTrim("OPENAI_MODEL_QUALITY") ||
    envTrim("OPENAI_MODEL") ||
    "gpt-4o"
  );
}

/** Prefer OpenRouter if set; otherwise OpenAI. */
export function resolveLlmChatConfig(
  tier: LlmTier = "quality",
): LlmChatConfig | null {
  const auth = resolveAuth();
  if (!auth) return null;
  return {
    ...auth,
    model: modelForTier(auth.provider, tier),
    tier,
  };
}

export function isLlmConfigured() {
  return Boolean(
    envTrim("OPENROUTER_API_KEY") ||
      envTrim("OPENAI_API_KEY") ||
      envTrim("BUILDER_API_URL"),
  );
}

export async function chatCompletionJson(options: {
  system: string;
  user: string;
  temperature?: number;
  /** Cap completion size — truncated JSON often breaks style.css / script.js links. */
  maxTokens?: number;
  /** fast = cheaper; quality = stronger. Default quality. */
  tier?: LlmTier;
  /** Optional JPEG/PNG data URL so vision models can see the live preview. */
  imageDataUrl?: string | null;
}): Promise<{
  content: string;
  provider: LlmProvider;
  model: string;
  tier: LlmTier;
}> {
  const tier = options.tier ?? "quality";
  const cfg = resolveLlmChatConfig(tier);
  if (!cfg) throw new Error("missing_llm_key");

  const image =
    typeof options.imageDataUrl === "string" &&
    options.imageDataUrl.startsWith("data:image/")
      ? options.imageDataUrl.slice(0, 400_000)
      : null;

  const userContent = image
    ? [
        { type: "text" as const, text: options.user },
        {
          type: "image_url" as const,
          image_url: { url: image },
        },
      ]
    : options.user;

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
      ...cfg.extraHeaders,
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 12_000,
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 400);
    console.error("[baiolo-ai] llm_http_error", {
      status: res.status,
      provider: cfg.provider,
      model: cfg.model,
      detail,
    });
    throw new Error(`llm_http_${res.status}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  return {
    content,
    provider: cfg.provider,
    model: cfg.model,
    tier: cfg.tier,
  };
}
