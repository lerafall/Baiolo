import { describe, expect, it } from "vitest";
import { pickBuildTier } from "@/lib/llm";

describe("pickBuildTier", () => {
  it("uses fast for short simple ideas", () => {
    expect(pickBuildTier("A soft tap game to catch coins")).toBe("fast");
    expect(pickBuildTier("One-minute calm timer")).toBe("fast");
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
