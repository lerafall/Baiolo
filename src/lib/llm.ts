import { getPublicSiteOrigin } from "@/lib/site-url";

export type LlmChatConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: "openrouter" | "openai";
  extraHeaders: Record<string, string>;
};

/** Prefer OpenRouter if set; otherwise OpenAI. */
export function resolveLlmChatConfig(): LlmChatConfig | null {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openRouterKey) {
    return {
      apiKey: openRouterKey,
      baseUrl: (
        process.env.OPENROUTER_BASE_URL?.trim() ||
        "https://openrouter.ai/api/v1"
      ).replace(/\/$/, ""),
      model:
        process.env.OPENROUTER_MODEL?.trim() ||
        process.env.OPENAI_MODEL?.trim() ||
        "openai/gpt-4o-mini",
      provider: "openrouter",
      extraHeaders: {
        "HTTP-Referer": getPublicSiteOrigin(),
        "X-Title": "Baiolo",
      },
    };
  }

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (openAiKey) {
    const base = (
      process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1"
    ).replace(/\/$/, "");
    return {
      apiKey: openAiKey,
      baseUrl: base,
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      provider: base.includes("openrouter.ai") ? "openrouter" : "openai",
      extraHeaders: base.includes("openrouter.ai")
        ? {
            "HTTP-Referer": getPublicSiteOrigin(),
            "X-Title": "Baiolo",
          }
        : {},
    };
  }

  return null;
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
}): Promise<{ content: string; provider: LlmChatConfig["provider"] }> {
  const cfg = resolveLlmChatConfig();
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
  return { content, provider: cfg.provider };
}
