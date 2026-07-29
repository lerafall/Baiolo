import { describe, expect, it } from "vitest";
import {
  composeBuildBrief,
  normalizeAiBuildFiles,
  parseAiBuildPayload,
  parseClarifyPayload,
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

  it("parses clarify questions", () => {
    const result = parseClarifyPayload(
      JSON.stringify({
        ready: false,
        questions: [
          "How do you win?",
          { id: "theme", question: "What theme?" },
        ],
      }),
    );
    expect(result.status).toBe("clarify");
    if (result.status === "clarify") {
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0].question).toBe("How do you win?");
    }
  });

  it("treats ready clarify as ready", () => {
    expect(parseClarifyPayload(JSON.stringify({ ready: true }))).toEqual({
      status: "ready",
    });
  });

  it("composes brief with answers", () => {
    const brief = composeBuildBrief("Tap stars", [
      { question: "Win?", answer: "Catch 10" },
    ]);
    expect(brief).toContain("Tap stars");
    expect(brief).toContain("Catch 10");
  });
});
