import { describe, expect, it } from "vitest";
import {
  evaluateAiGate,
  summarizeLocalAiUsage,
  type AiUsageSummary,
} from "@/lib/ai-usage";
import type { ProjectSubmission } from "@/lib/moderation";
import { PLAN_LIMITS } from "@/lib/plans.config";

function sample(
  overrides: Partial<ProjectSubmission> = {},
): ProjectSubmission {
  return {
    id: "p1",
    uploadType: "ai",
    sourceLabel: "idea",
    title: "Demo",
    description: "x",
    category: "game",
    tags: [],
    thumbnail: "x",
    status: "approved",
    risk: "low",
    aiFlags: [],
    changeRequest: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
    plays: 0,
    reactions: 0,
    sourceType: "ai_build",
    aiSlotActive: true,
    ...overrides,
  };
}

describe("AI plan limits", () => {
  it("counts only active AI slots locally", () => {
    const summary = summarizeLocalAiUsage("free", [
      sample({ id: "a" }),
      sample({ id: "b", aiSlotActive: false }),
      sample({ id: "c", sourceType: "zip", uploadType: "zip", aiSlotActive: false }),
    ], 1);

    expect(summary.activeAiCount).toBe(1);
    expect(summary.generationsUsed).toBe(1);
    expect(summary.generationsLimit).toBe(PLAN_LIMITS.free.aiGenerationsPerMonth);
  });

  it("blocks a second new AI project on free", () => {
    const summary: AiUsageSummary = {
      ...summarizeLocalAiUsage("free", [sample()], 1),
    };
    const gate = evaluateAiGate(summary, "new_project");
    expect(gate.allowed).toBe(false);
  });

  it("allows regenerating the same AI project when at slot limit", () => {
    const summary = summarizeLocalAiUsage("free", [sample()], 1);
    const gate = evaluateAiGate(summary, "regenerate");
    expect(gate.allowed).toBe(true);
  });

  it("blocks regenerate after monthly generations are used", () => {
    const summary = summarizeLocalAiUsage("free", [sample()], 3);
    const gate = evaluateAiGate(summary, "regenerate");
    expect(gate.allowed).toBe(false);
  });

  it("blocks regenerate when over slot limit after downgrade", () => {
    const summary = summarizeLocalAiUsage(
      "free",
      [sample({ id: "a" }), sample({ id: "b" })],
      0,
    );
    expect(summary.activeAiCount).toBe(2);
    const gate = evaluateAiGate(summary, "regenerate");
    expect(gate.allowed).toBe(false);
  });

  it("does not limit ZIP/link projects in local summary", () => {
    const summary = summarizeLocalAiUsage("free", [
      sample({
        id: "z1",
        uploadType: "zip",
        sourceType: "zip",
        aiSlotActive: false,
      }),
      sample({
        id: "l1",
        uploadType: "link",
        sourceType: "link",
        aiSlotActive: false,
      }),
    ], 0);
    expect(summary.activeAiCount).toBe(0);
    expect(evaluateAiGate(summary, "new_project").allowed).toBe(true);
  });

  it("raises limits immediately on upgrade to pro", () => {
    const free = summarizeLocalAiUsage(
      "free",
      [sample({ id: "a" }), sample({ id: "b" })],
      3,
    );
    expect(evaluateAiGate(free, "new_project").allowed).toBe(false);

    const pro = summarizeLocalAiUsage(
      "pro",
      [sample({ id: "a" }), sample({ id: "b" })],
      3,
    );
    expect(pro.generationsLimit).toBe(100);
    expect(pro.activeAiLimit).toBe(10);
    expect(evaluateAiGate(pro, "new_project").allowed).toBe(true);
  });
});
