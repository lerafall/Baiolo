import { describe, expect, it } from "vitest";
import { mockAiPrecheck } from "@/lib/ai-precheck";
import { buildPackageFromFile, buildPackageFromLabel } from "@/lib/draft";
import { applyAdminAction, runSubmitPipeline } from "@/lib/pipeline";
import { progressCheckingSubmissions } from "@/lib/status-progress";

describe("mockAiPrecheck", () => {
  it("returns low risk for friendly copy", () => {
    const result = mockAiPrecheck({
      title: "Cloud Hopper",
      description: "Soft clouds and sunny coins",
      sourceLabel: "cloud.zip",
    });
    expect(result.risk).toBe("low");
    expect(result.flags).toHaveLength(0);
  });

  it("flags medium risk for intense themes", () => {
    const result = mockAiPrecheck({
      title: "Weapon practice",
      description: "A calm tool",
      sourceLabel: "demo.zip",
    });
    expect(result.risk).toBe("medium");
  });
});

describe("packaging helper", () => {
  it("builds a package from a zip file name", () => {
    const file = new File(["hello"], "my-fun-game.zip", {
      type: "application/zip",
    });
    const result = buildPackageFromFile(file);
    expect(result.packageReady).toBe(true);
    expect(result.suggestedTitle).toBe("My Fun Game");
  });

  it("requires a label before packaging text input", () => {
    const result = buildPackageFromLabel("  ");
    expect(result.packageReady).toBe(false);
  });
});

describe("submit pipeline", () => {
  it("keeps private submits playable without public queue", async () => {
    const { submission, stages } = await runSubmitPipeline({
      id: "t1",
      uploadType: "zip",
      sourceLabel: "demo.zip",
      title: "Tiny Demo",
      description: "A friendly little experiment.",
      category: "demo",
      thumbnail: "linear-gradient(#fff,#fff)",
      shareIntent: "private",
    });
    expect(submission.status).toBe("approved");
    expect(submission.visibility).toBe("private");
    expect(stages.map((s) => s.name)).toContain("ai_moderation");
  });

  it("queues public share requests for review", async () => {
    const { submission } = await runSubmitPipeline({
      id: "t2",
      uploadType: "zip",
      sourceLabel: "demo.zip",
      title: "Tiny Demo",
      description: "A friendly little experiment.",
      category: "demo",
      thumbnail: "linear-gradient(#fff,#fff)",
      shareIntent: "public",
    });
    expect(submission.visibility).toBe("pending_public");
    expect(["checking", "in_review"]).toContain(submission.status);
  });
});

describe("admin actions", () => {
  const base = {
    id: "t1",
    uploadType: "link" as const,
    sourceLabel: "https://example.com",
    title: "Demo",
    description: "Hello world project",
    category: "demo" as const,
    tags: [] as string[],
    thumbnail: "x",
    status: "in_review" as const,
    risk: "low" as const,
    aiFlags: [] as string[],
    changeRequest: null,
    updatedAt: new Date().toISOString(),
    plays: 0,
    reactions: 0,
  };

  it("does not publish without code + play checks", () => {
    expect(applyAdminAction(base, "publish").status).toBe("in_review");
  });

  it("publishes only after code and play checks", () => {
    const ready = {
      ...base,
      codeCheckedAt: "2026-01-01T00:00:00.000Z",
      playCheckedAt: "2026-01-01T00:01:00.000Z",
      status: "approved" as const,
    };
    expect(applyAdminAction(ready, "publish").status).toBe("published");
  });

  it("marks play check and moves to approved when code is done", () => {
    const withCode = {
      ...base,
      codeCheckedAt: "2026-01-01T00:00:00.000Z",
    };
    const next = applyAdminAction(withCode, "confirm_play");
    expect(next.playCheckedAt).toBeTruthy();
    expect(next.status).toBe("approved");
  });

  it("asks for changes with friendly copy", () => {
    const next = applyAdminAction(base, "ask_for_changes");
    expect(next.status).toBe("needs_changes");
    expect(next.changeRequest).toMatch(/small fix/i);
  });
});

describe("status progress", () => {
  it("moves checking to in_review after delay", () => {
    const old = new Date(Date.now() - 20_000).toISOString();
    const items = [
      {
        id: "a",
        uploadType: "zip" as const,
        sourceLabel: "a.zip",
        title: "A",
        description: "desc",
        category: "game" as const,
        tags: [],
        thumbnail: "x",
        status: "checking" as const,
        risk: "low" as const,
        aiFlags: [],
        changeRequest: null,
        updatedAt: old,
        plays: 0,
        reactions: 0,
      },
    ];
    const next = progressCheckingSubmissions(items);
    expect(next[0].status).toBe("in_review");
  });

  it("keeps fresh checking items", () => {
    const items = [
      {
        id: "a",
        uploadType: "zip" as const,
        sourceLabel: "a.zip",
        title: "A",
        description: "desc",
        category: "game" as const,
        tags: [],
        thumbnail: "x",
        status: "checking" as const,
        risk: "low" as const,
        aiFlags: [],
        changeRequest: null,
        updatedAt: new Date().toISOString(),
        plays: 0,
        reactions: 0,
      },
    ];
    const next = progressCheckingSubmissions(items);
    expect(next).toBe(items);
  });
});

describe("ranking", () => {
  it("orders by plays and reactions", async () => {
    const { rankProjects } = await import("@/lib/ranking");
    const ranked = rankProjects(
      [
        {
          id: "a",
          title: "A",
          tagline: "",
          description: "",
          category: "game",
          tags: ["game"],
          creator: "x",
          thumbnail: "x",
          cover: "x",
          playUrl: "#",
          plays: 10,
          reactions: { fun: 1, interesting: 1, "would-use-again": 1 },
        },
        {
          id: "b",
          title: "B",
          tagline: "",
          description: "",
          category: "game",
          tags: ["game"],
          creator: "x",
          thumbnail: "x",
          cover: "x",
          playUrl: "#",
          plays: 100,
          reactions: { fun: 10, interesting: 10, "would-use-again": 10 },
          featured: true,
        },
      ],
      2,
    );
    expect(ranked[0].project.id).toBe("b");
    expect(ranked[0].rank).toBe(1);
  });
});
