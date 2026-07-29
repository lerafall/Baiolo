import { describe, expect, it } from "vitest";
import {
  composeBuildBrief,
  normalizeAiBuildFiles,
  parseAiBuildPayload,
  parseChatTurnPayload,
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

  it("parses chat turn follow-up", () => {
    const result = parseChatTurnPayload(
      JSON.stringify({
        ready: false,
        message: "Cool! Pastel or neon colors?",
      }),
    );
    expect(result).toEqual({
      status: "chat",
      message: "Cool! Pastel or neon colors?",
    });
  });

  it("parses ready chat turn", () => {
    const result = parseChatTurnPayload(
      JSON.stringify({ ready: true, message: "Building now!" }),
    );
    expect(result.status).toBe("ready");
  });

  it("composes brief from chat", () => {
    const brief = composeBuildBrief("Tap stars", [
      { role: "assistant", content: "Catch 5 or 10?" },
      { role: "user", content: "10 please" },
    ]);
    expect(brief).toContain("Tap stars");
    expect(brief).toContain("10 please");
  });
});
