import { describe, expect, it } from "vitest";
import {
  summarizePlayTrend,
} from "@/lib/project-play-history";
import {
  canWithdrawSubmission,
  formatWaitingDuration,
  stagesForStatus,
} from "@/lib/submission-timeline";
import type { ProjectSubmission } from "@/lib/moderation";

const base: ProjectSubmission = {
  id: "p1",
  uploadType: "zip",
  sourceLabel: "a.zip",
  title: "Demo",
  description: "",
  category: "game",
  tags: [],
  thumbnail: "/x.png",
  status: "checking",
  risk: "low",
  aiFlags: [],
  changeRequest: null,
  updatedAt: new Date().toISOString(),
  plays: 0,
  reactions: 0,
};

describe("submission timeline", () => {
  it("builds checking stages", () => {
    const stages = stagesForStatus("checking");
    expect(stages.some((s) => s.name === "live_checking")).toBe(true);
  });

  it("allows withdraw while in queue", () => {
    expect(canWithdrawSubmission({ ...base, status: "in_review" })).toBe(true);
    expect(canWithdrawSubmission({ ...base, status: "draft" })).toBe(false);
  });

  it("formats waiting duration", () => {
    expect(formatWaitingDuration(30_000)).toBe("<1m");
    expect(formatWaitingDuration(90 * 60_000)).toBe("1h 30m");
  });
});

describe("play trend", () => {
  it("computes percent change", () => {
    const trend = summarizePlayTrend(
      [
        { day: "2026-07-22", plays: 10 },
        { day: "2026-07-29", plays: 15 },
      ],
      15,
      new Date("2026-07-29T12:00:00.000Z"),
    );
    expect(trend.points).toHaveLength(7);
    expect(trend.changePct).toBe(50);
    expect(trend.label).toBe("up");
  });
});
