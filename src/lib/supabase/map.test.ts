import { describe, expect, it } from "vitest";
import { rowToSubmission, submissionToRow } from "@/lib/supabase/map";
import type { ProjectSubmission } from "@/lib/moderation";

const sample: ProjectSubmission = {
  id: "demo-1",
  uploadType: "link",
  sourceLabel: "https://example.com",
  title: "Demo",
  description: "Hello",
  category: "demo",
  tags: ["demo", "fun"],
  thumbnail: "x",
  status: "checking",
  risk: "low",
  aiFlags: [],
  changeRequest: null,
  updatedAt: "2026-01-01T00:00:00.000Z",
  plays: 3,
  reactions: 1,
  ownerId: null,
  storagePath: null,
  playUrl: "https://example.com",
  previewUrl: null,
  codeCheckedAt: null,
  playCheckedAt: null,
  reviewNotes: null,
};

describe("supabase map", () => {
  it("round-trips submission fields", () => {
    const row = submissionToRow(sample);
    expect(row.upload_type).toBe("link");
    expect(row.thumbnail_path).toBe("x");
    expect(row.tags).toEqual(["demo", "fun"]);
    expect(row.play_url).toBe("https://example.com");

    const back = rowToSubmission({
      ...row,
      source_label: row.source_label,
      title: row.title,
      description: row.description,
      thumbnail_path: row.thumbnail_path,
      ai_flags: row.ai_flags,
      change_request: row.change_request,
      plays: row.plays,
      reactions: row.reactions,
      updated_at: row.updated_at,
      owner_id: row.owner_id,
      storage_path: row.storage_path,
      play_url: row.play_url,
      preview_url: row.preview_url,
      code_checked_at: row.code_checked_at,
      play_checked_at: row.play_checked_at,
      review_notes: row.review_notes,
    });
    expect(back).toEqual(sample);
  });
});
