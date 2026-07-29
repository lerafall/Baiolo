import { describe, expect, it } from "vitest";
import {
  resolvePlayableUrl,
  submissionToProject,
} from "@/lib/project-map";
import type { ProjectSubmission } from "@/lib/moderation";

const base: ProjectSubmission = {
  id: "p1",
  uploadType: "zip",
  sourceLabel: "game.zip",
  title: "Test Game",
  description: "A test",
  category: "game",
  tags: ["arcade"],
  thumbnail: "linear-gradient(145deg, #a78bfa 0%, #2dd4bf 100%)",
  status: "published",
  risk: "low",
  aiFlags: [],
  changeRequest: null,
  updatedAt: "2026-01-01T00:00:00.000Z",
  plays: 0,
  reactions: 0,
};

describe("submissionToProject visuals", () => {
  it("keeps catalog thumb when submission still has a gradient", () => {
    const s: ProjectSubmission = {
      ...base,
      id: "cloud-hopper",
      title: "Cloud Hopper",
      description: "Jump soft clouds. Catch sun coins.",
      tags: ["platformer"],
      playUrl: "/demos/cloud-hopper/index.html",
    };
    const project = submissionToProject(s);
    expect(project?.thumbnail).toBe("/demos/cloud-hopper/thumb.png");
    expect(project?.cover).toBe("/demos/cloud-hopper/cover.png");
  });

  it("does not invent reactions when total is 0", async () => {
    const { splitReactionTotal, totalReactions, submissionToProject } =
      await import("@/lib/project-map");
    expect(totalReactions(splitReactionTotal(0))).toBe(0);
    expect(totalReactions(splitReactionTotal(59))).toBe(59);
    const project = submissionToProject({
      ...base,
      playUrl: "/api/play-site/p1/index.html",
      reactions: 0,
    });
    expect(totalReactions(project?.reactions)).toBe(0);
  });

  it("keeps catalog reaction total when scalars match", () => {
    const project = submissionToProject({
      ...base,
      id: "star-catch",
      title: "Star Catch",
      playUrl: "/demos/star-catch/index.html",
      reactions: 59,
      plays: 42,
    });
    expect(project?.plays).toBe(42);
    expect(
      (project?.reactions.fun || 0) +
        (project?.reactions.interesting || 0) +
        (project?.reactions["would-use-again"] || 0),
    ).toBe(59);
  });
});

describe("resolvePlayableUrl for published", () => {
  it("rejects mock and owner-only URLs on Explore", () => {
    expect(
      resolvePlayableUrl({
        ...base,
        playUrl: null,
        previewUrl: "#mock-play/p1",
      }),
    ).toBeNull();
    expect(
      resolvePlayableUrl({
        ...base,
        playUrl: "/api/owner-play-site/p1/index.html",
      }),
    ).toBeNull();
    expect(
      submissionToProject({
        ...base,
        playUrl: null,
        previewUrl: "#mock-play/p1",
      }),
    ).toBeNull();
  });

  it("accepts public play-site URL", () => {
    expect(
      resolvePlayableUrl({
        ...base,
        playUrl: "/api/play-site/p1/index.html",
      }),
    ).toBe("/api/play-site/p1/index.html");
  });
});

describe("statusRank sync guard", () => {
  it("ranks published above in_review", async () => {
    const { statusRank } = await import("@/app/api/projects/sync/route");
    expect(statusRank("published")).toBeGreaterThan(statusRank("in_review"));
    expect(statusRank("published")).toBeGreaterThan(statusRank("checking"));
  });
});
