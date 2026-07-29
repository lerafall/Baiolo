import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AI_BUILD_FAILED_PUBLIC,
  AI_UNAVAILABLE_PUBLIC,
  gateAiBuildReady,
  shouldChargeAiGeneration,
} from "@/lib/ai-public-errors";

describe("ai public errors", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("never exposes env var names in public copy", () => {
    for (const msg of [AI_UNAVAILABLE_PUBLIC, AI_BUILD_FAILED_PUBLIC]) {
      expect(msg).not.toMatch(/OPENROUTER|OPENAI|BUILDER_API|API_KEY/i);
    }
  });

  it("gates when no provider is configured", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("BUILDER_API_URL", "");
    const gate = gateAiBuildReady();
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.status).toBe(503);
      expect(gate.error).toBe(AI_UNAVAILABLE_PUBLIC);
      expect(gate.error).not.toMatch(/OPENROUTER|OPENAI|BUILDER/i);
    }
  });

  it("does not charge when misconfigured or build failed", () => {
    expect(
      shouldChargeAiGeneration({ configured: false, producedBuild: true }),
    ).toBe(false);
    expect(
      shouldChargeAiGeneration({ configured: true, producedBuild: false }),
    ).toBe(false);
    expect(
      shouldChargeAiGeneration({ configured: true, producedBuild: true }),
    ).toBe(true);
  });
});
