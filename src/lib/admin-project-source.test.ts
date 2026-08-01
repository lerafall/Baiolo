import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ProjectSubmission } from "@/lib/moderation";

const configured = vi.fn(() => true);
const rowFor = vi.fn();

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: () => configured(),
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: rowFor() }) }),
      }),
    }),
  }),
}));
vi.mock("@/lib/supabase/map", () => ({
  rowToSubmission: (row: { id: string; status: string }) => row,
}));

const { loadModerationTarget } = await import("@/lib/admin-project-source");

const stale = {
  id: "p-1",
  status: "checking",
  storagePath: "old/path.zip",
} as unknown as ProjectSubmission;

describe("moderation target", () => {
  beforeEach(() => {
    configured.mockReturnValue(true);
    rowFor.mockReset();
  });

  it("prefers the stored row over whatever the browser posted", async () => {
    rowFor.mockReturnValue({ id: "p-1", status: "in_review", storagePath: "new/path.zip" });
    const out = await loadModerationTarget("p-1", stale);
    expect(out.source).toBe("db");
    expect(out.project).toMatchObject({ status: "in_review", storagePath: "new/path.zip" });
  });

  it("reports a project that no longer exists", async () => {
    rowFor.mockReturnValue(null);
    const out = await loadModerationTarget("p-gone", stale);
    expect(out.project).toBeNull();
  });

  it("falls back to the posted copy when there is no database", async () => {
    configured.mockReturnValue(false);
    const out = await loadModerationTarget("p-1", stale);
    expect(out.source).toBe("posted");
    expect(out.project).toBe(stale);
  });

  it("needs an id from somewhere", async () => {
    const out = await loadModerationTarget(null, null);
    expect(out.project).toBeNull();
  });
});
