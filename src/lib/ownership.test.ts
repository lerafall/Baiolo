import { describe, expect, it } from "vitest";
import { isCatalogDemoId, isOwnedSubmission } from "@/lib/ownership";
import type { ProjectSubmission } from "@/lib/moderation";

const base: ProjectSubmission = {
  id: "coin-catcher",
  uploadType: "zip",
  sourceLabel: "a.zip",
  title: "Coin Catcher",
  description: "",
  category: "game",
  tags: [],
  thumbnail: "/x.png",
  status: "published",
  risk: "low",
  aiFlags: [],
  changeRequest: null,
  updatedAt: new Date().toISOString(),
  plays: 0,
  reactions: 0,
  ownerId: "user-1",
};

describe("ownership", () => {
  it("never treats catalog demos as owned", () => {
    expect(isCatalogDemoId("cloud-hopper")).toBe(true);
    expect(isCatalogDemoId("starfall-garden")).toBe(true);
    expect(isCatalogDemoId("moonlight-bakery")).toBe(true);
    expect(isCatalogDemoId("fairy-blocks")).toBe(true);
    expect(isCatalogDemoId("lantern-munch")).toBe(true);
    expect(
      isOwnedSubmission({ ...base, id: "cloud-hopper", ownerId: "user-1" }, "user-1"),
    ).toBe(false);
  });

  it("matches owner id for user projects", () => {
    expect(isOwnedSubmission(base, "user-1")).toBe(true);
    expect(isOwnedSubmission(base, "user-2")).toBe(false);
    expect(isOwnedSubmission(base, null)).toBe(false);
  });
});
