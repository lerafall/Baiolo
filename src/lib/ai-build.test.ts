import { describe, expect, it } from "vitest";
import {
  normalizeAiBuildFiles,
  parseAiBuildPayload,
} from "@/lib/ai-build";

describe("ai-build parsers", () => {
  it("normalizes allowed files and aliases", () => {
    const files = normalizeAiBuildFiles({
      "index.html": "<html></html>",
      "styles.css": "body{}",
      "main.js": "console.log(1)",
      "evil.exe": "nope",
    });
    expect(files).toEqual({
      "index.html": "<html></html>",
      "style.css": "body{}",
      "script.js": "console.log(1)",
    });
  });

  it("rejects missing index.html", () => {
    expect(normalizeAiBuildFiles({ "style.css": "x" })).toBeNull();
  });

  it("parses full AI payload", () => {
    const parsed = parseAiBuildPayload(
      JSON.stringify({
        title: "Star Catch",
        description: "Catch falling stars",
        category: "game",
        files: {
          "index.html": "<!DOCTYPE html><html></html>",
          "style.css": "body{}",
          "script.js": "1",
        },
      }),
    );
    expect(parsed?.title).toBe("Star Catch");
    expect(parsed?.category).toBe("game");
    expect(parsed?.files["index.html"]).toContain("DOCTYPE");
  });
});
