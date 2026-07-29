import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/lib/phone";

describe("normalizePhone", () => {
  it("keeps E.164 style numbers", () => {
    expect(normalizePhone("+48 500 000 000")).toBe("+48500000000");
  });

  it("adds + when missing", () => {
    expect(normalizePhone("48500000000")).toBe("+48500000000");
  });

  it("rejects short input", () => {
    expect(normalizePhone("123")).toBe("");
  });
});
