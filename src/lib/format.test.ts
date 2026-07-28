import { describe, expect, it } from "vitest";
import { formatCount, formatDateTime } from "@/lib/format";

describe("formatCount", () => {
  it("uses stable en-US grouping", () => {
    expect(formatCount(1284)).toBe("1,284");
    expect(formatCount(42)).toBe("42");
  });
});

describe("formatDateTime", () => {
  it("formats an ISO timestamp", () => {
    const out = formatDateTime("2026-07-28T12:00:00.000Z");
    expect(out.length).toBeGreaterThan(6);
  });
});
