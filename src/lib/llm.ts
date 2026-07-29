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

const SIMPLE_HINTS =
  /\b(timer|countdown|click|tap|counter|color|paint|dice|coin|flashcard|todo|checklist|stopwatch|button|score)\b/i;

/**
 * Route build prompts: short / simple → cheap (fast); richer ideas → quality.
 * Exported for tests.
 */
export function pickBuildTier(prompt: string): LlmTier {
  const text = prompt.trim();
  const len = text.length;
  if (COMPLEX_HINTS.test(text) || len >= 280) return "quality";
  if (len <= 140 || SIMPLE_HINTS.test(text)) return "fast";
  // Medium prompts: prefer quality so games stay playable
  return "quality";
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
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openRouterKey) {
    return {
      apiKey: openRouterKey,
      baseUrl: (
        process.env.OPENROUTER_BASE_URL?.trim() ||
        "https://openrouter.ai/api/v1"
      ).replace(/\/$/, ""),
      provider: "openrouter",
      extraHeaders: openRouterHeaders(),
    };
  }

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (openAiKey) {
    const base = (
      process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1"
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
        process.env.OPENROUTER_MODEL_FAST?.trim() ||
        process.env.OPENAI_MODEL_FAST?.trim() ||
        process.env.OPENROUTER_MODEL?.trim() ||
        process.env.OPENAI_MODEL?.trim() ||
        "openai/gpt-4o-mini"
      );
    }
    return (
      process.env.OPENROUTER_MODEL_QUALITY?.trim() ||
      process.env.OPENAI_MODEL_QUALITY?.trim() ||
      process.env.OPENROUTER_MODEL?.trim() ||
      process.env.OPENAI_MODEL?.trim() ||
      "openai/gpt-4o-mini"
    );
  }

  if (tier === "fast") {
    return (
      process.env.OPENAI_MODEL_FAST?.trim() ||
      process.env.OPENAI_MODEL?.trim() ||
      "gpt-4o-mini"
    );
  }
  return (
    process.env.OPENAI_MODEL_QUALITY?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o-mini"
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
    process.env.OPENROUTER_API_KEY?.trim() ||
      process.env.OPENAI_API_KEY?.trim() ||
      process.env.BUILDER_API_URL?.trim(),
  );
}

export async function chatCompletionJson(options: {
  system: string;
  user: string;
  temperature?: number;
  /** fast = cheaper; quality = stronger. Default quality. */
  tier?: LlmTier;
}): Promise<{
  content: string;
  provider: LlmProvider;
  model: string;
  tier: LlmTier;
}> {
  const tier = options.tier ?? "quality";
  const cfg = resolveLlmChatConfig(tier);
  if (!cfg) throw new Error("missing_llm_key");

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
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
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
