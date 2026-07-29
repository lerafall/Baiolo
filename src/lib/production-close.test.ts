import { describe, expect, it } from "vitest";
import { canSelfServeSetPlan } from "@/lib/billing/provider";
import {
  analyticsTierAtLeast,
  normalizeUserPlan,
  reviewQueueRank,
} from "@/lib/plans.config";
import {
  computeCreatorAnalytics,
  toCsv,
} from "@/lib/creator-analytics";
import type { ProjectSubmission } from "@/lib/moderation";

describe("billing self-serve", () => {
  it("allows only free without an external provider", () => {
    expect(canSelfServeSetPlan("free")).toBe(true);
    expect(canSelfServeSetPlan("pro")).toBe(false);
    expect(canSelfServeSetPlan("studio")).toBe(false);
  });
});

describe("plan helpers", () => {
  it("normalizes legacy paid labels", () => {
    expect(normalizeUserPlan("paid")).toBe("pro");
    expect(normalizeUserPlan("paid_pro")).toBe("studio");
    expect(normalizeUserPlan("unknown")).toBe("free");
  });

  it("ranks review queues", () => {
    expect(reviewQueueRank("studio")).toBeGreaterThan(reviewQueueRank("pro"));
    expect(reviewQueueRank("pro")).toBeGreaterThan(reviewQueueRank("free"));
  });

  it("gates analytics tiers", () => {
    expect(analyticsTierAtLeast("free", "basic")).toBe(true);
    expect(analyticsTierAtLeast("free", "trends")).toBe(false);
    expect(analyticsTierAtLeast("pro", "trends")).toBe(true);
    expect(analyticsTierAtLeast("studio", "export_api")).toBe(true);
  });
});

describe("creator analytics", () => {
  const sample: ProjectSubmission = {
    id: "p1",
    uploadType: "ai",
    sourceLabel: "ai",
    title: "Demo",
    description: "",
    category: "game",
    tags: [],
    thumbnail: "",
    status: "published",
    risk: "low",
    aiFlags: [],
    changeRequest: null,
    updatedAt: new Date().toISOString(),
    plays: 3,
    reactions: 1,
  };

  it("includes trend buckets", () => {
    const stats = computeCreatorAnalytics([sample]);
    expect(stats.trends7).toHaveLength(7);
    expect(stats.trends30).toHaveLength(30);
    expect(stats.totalPlays).toBe(3);
  });

  it("builds csv", () => {
    const csv = toCsv([
      { id: "a", title: 'Say "hi"', plays: 1 },
    ]);
    expect(csv).toContain("id,title,plays");
    expect(csv).toContain('"Say ""hi"""');
  });
});
