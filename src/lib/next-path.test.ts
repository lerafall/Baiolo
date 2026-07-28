import { describe, expect, it } from "vitest";
import { authHref, safeNextPath } from "@/lib/next-path";
import { notificationHref } from "@/lib/notification-href";

describe("safeNextPath", () => {
  it("allows relative paths", () => {
    expect(safeNextPath("/create")).toBe("/create");
    expect(safeNextPath("/projects?x=1")).toBe("/projects?x=1");
  });

  it("rejects open redirects", () => {
    expect(safeNextPath("//evil.com")).toBe("/explore");
    expect(safeNextPath("https://evil.com")).toBe("/explore");
    expect(safeNextPath(null)).toBe("/explore");
  });

  it("builds auth href with next", () => {
    expect(authHref("/create")).toBe("/auth?next=%2Fcreate");
  });
});

describe("notificationHref", () => {
  it("routes by status", () => {
    expect(notificationHref("published", "p1")).toBe("/project/p1");
    expect(notificationHref("needs_changes", "p1")).toBe(
      "/create?edit=p1",
    );
    expect(notificationHref("checking", "p1")).toBe("/projects");
  });
});
