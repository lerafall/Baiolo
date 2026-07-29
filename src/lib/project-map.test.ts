import { describe, expect, it } from "vitest";
import { submissionToProject } from "@/lib/project-map";
import type { ProjectSubmission } from "@/lib/moderation";

describe("submissionToProject visuals", () => {
  it("keeps catalog thumb when submission still has a gradient", () => {
    const s: ProjectSubmission = {
      id: "cloud-hopper",
      uploadType: "zip",
      sourceLabel: "cloud-hopper.zip",
      title: "Cloud Hopper",
      description: "Jump soft clouds. Catch sun coins.",
      category: "game",
      tags: ["platformer"],
      thumbnail:
        "linear-gradient(145deg, #a78bfa 0%, #2dd4bf 55%, #fbbf24 100%)",
      status: "published",
      risk: "low",
      aiFlags: [],
      changeRequest: null,
      updatedAt: "2026-01-01T00:00:00.000Z",
      plays: 10,
      reactions: 5,
      playUrl: "/demos/cloud-hopper/index.html",
    };
    const project = submissionToProject(s);
    expect(project?.thumbnail).toBe("/demos/cloud-hopper/thumb.png");
    expect(project?.cover).toBe("/demos/cloud-hopper/cover.png");
  });
});
