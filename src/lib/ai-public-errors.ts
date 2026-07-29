import { isLlmConfigured } from "@/lib/llm";

/** Safe for end users — never mention env var names or providers. */
export const AI_UNAVAILABLE_PUBLIC =
  "AI building is temporarily unavailable. Please try again in a moment.";

export const AI_BUILD_FAILED_PUBLIC =
  "Couldn’t build that right now. Try a simpler description, or try again.";

export function logAiMisconfiguration(context: string) {
  console.error(
    `[baiolo-ai] ${context}: LLM/builder not configured (set a provider key or external builder URL on the server).`,
  );
}

/**
 * Early gate before any quota consumption.
 * Callers must not increment AI usage when this returns ok: false.
 */
export function gateAiBuildReady():
  | { ok: true }
  | { ok: false; status: 503; error: string } {
  if (isLlmConfigured()) return { ok: true };
  logAiMisconfiguration("build_gate");
  return { ok: false, status: 503, error: AI_UNAVAILABLE_PUBLIC };
}

/** True only after a successful build that produced files — never on config/chat-only failures. */
export function shouldChargeAiGeneration(options: {
  configured: boolean;
  producedBuild: boolean;
}): boolean {
  return options.configured && options.producedBuild;
}
