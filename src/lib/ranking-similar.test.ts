import { describe, expect, it } from "vitest";
import {
  getSimilarProjects,
  projects,
} from "@/lib/data/projects";

describe("getSimilarProjects", () => {
  it("prefers same category and overlapping tags", () => {
    const seed = projects[0];
    const similar = getSimilarProjects(seed, projects, 3);
    expect(similar).toHaveLength(3);
    expect(similar.every((p) => p.id !== seed.id)).toBe(true);
    expect(similar[0].category === seed.category || similar[0].tags.some((t) => seed.tags.includes(t))).toBe(
      true,
    );
  });
});
