import { describe, expect, it } from "vitest";
import { pickBuildTier } from "@/lib/llm";

describe("pickBuildTier", () => {
  it("uses quality for games even when short", () => {
    expect(pickBuildTier("A soft tap game to catch coins")).toBe("quality");
    expect(pickBuildTier("Spadające monety i koszyk")).toBe("quality");
  });

  it("uses quality for fix / repair prompts", () => {
    expect(pickBuildTier("Nie działa ta gra. popraw ją")).toBe("quality");
    expect(pickBuildTier("Fix the broken controls please")).toBe("quality");
  });

  it("uses fast for short simple tools", () => {
    expect(pickBuildTier("One-minute calm timer")).toBe("fast");
    expect(pickBuildTier("Simple todo checklist")).toBe("fast");
  });

  it("uses quality for complex or long prompts", () => {
    expect(
      pickBuildTier(
        "A platformer with inventory, enemy AI, and multiple levels",
      ),
    ).toBe("quality");
    expect(pickBuildTier("x".repeat(300))).toBe("quality");
  });
});
