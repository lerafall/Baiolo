import { describe, expect, it } from "vitest";
import { normalizeTag } from "@/lib/data/projects";

describe("normalizeTag", () => {
  it("trims, lowercases, and dashes spaces", () => {
    expect(normalizeTag("  Soft Clouds ")).toBe("soft-clouds");
  });

  it("caps length", () => {
    expect(normalizeTag("a".repeat(40)).length).toBe(24);
  });
});
