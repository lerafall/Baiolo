import { describe, expect, it } from "vitest";
import { freshProjectId, guardProjectWrite } from "@/lib/project-write-guard";

/** Minimal stand-in for the two calls the guard makes. */
function fakeSupabase(row: { owner_id: string | null } | null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: row }) }),
      }),
    }),
  } as never;
}

describe("project write guard", () => {
  it("moves a curated demo id aside instead of overwriting it", async () => {
    const out = await guardProjectWrite(fakeSupabase(null), "moonlight-bakery", "user-1");
    expect(out).toMatchObject({ ok: true, renamed: true });
    if (out.ok) expect(out.id).not.toBe("moonlight-bakery");
  });

  it("refuses a row owned by somebody else", async () => {
    const out = await guardProjectWrite(
      fakeSupabase({ owner_id: "user-2" }),
      "their-project",
      "user-1",
    );
    expect(out).toEqual({ ok: false, reason: "foreign_owner" });
  });

  it("lets a creator write their own project", async () => {
    const out = await guardProjectWrite(
      fakeSupabase({ owner_id: "user-1" }),
      "my-project",
      "user-1",
    );
    expect(out).toEqual({ ok: true, id: "my-project", renamed: false });
  });

  it("allows a brand new id", async () => {
    const out = await guardProjectWrite(fakeSupabase(null), "p-new", "user-1");
    expect(out).toEqual({ ok: true, id: "p-new", renamed: false });
  });

  it("mints ids that never collide with the catalog", () => {
    expect(freshProjectId()).toMatch(/^p-[a-z0-9]+-[a-z0-9]+$/i);
  });
});
