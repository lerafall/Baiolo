import { describe, expect, it } from "vitest";
import {
  dedupeNotesByProject,
  type BaioloNotification,
} from "@/lib/notifications";

describe("dedupeNotesByProject", () => {
  it("keeps only the newest status per project", () => {
    const notes: BaioloNotification[] = [
      {
        id: "1",
        projectId: "coin",
        title: "Coin Catcher",
        status: "checking",
        createdAt: "2026-07-29T10:00:00.000Z",
        read: false,
      },
      {
        id: "2",
        projectId: "coin",
        title: "Coin Catcher",
        status: "published",
        createdAt: "2026-07-29T12:00:00.000Z",
        read: false,
      },
      {
        id: "3",
        projectId: "proto",
        title: "Test Prototyp",
        status: "approved",
        createdAt: "2026-07-29T11:00:00.000Z",
        read: true,
      },
    ];
    const out = dedupeNotesByProject(notes);
    expect(out).toHaveLength(2);
    expect(out.find((n) => n.projectId === "coin")?.status).toBe("published");
    expect(out.find((n) => n.projectId === "proto")?.status).toBe("approved");
  });
});
