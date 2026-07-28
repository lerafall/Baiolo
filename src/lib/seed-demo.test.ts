import { describe, expect, it } from "vitest";
import { demoSeedSubmissions } from "@/lib/seed-demo";

describe("demoSeedSubmissions", () => {
  it("returns published catalog rows", () => {
    const seeds = demoSeedSubmissions();
    expect(seeds.length).toBeGreaterThan(3);
    expect(seeds.every((s) => s.status === "published")).toBe(true);
    expect(seeds[0].tags.length).toBeGreaterThan(0);
  });
});
