import { describe, expect, it } from "vitest";
import {
  composeBuildBrief,
  isFixIntent,
  looksIncompletePlayable,
  normalizeAiBuildFiles,
  parseAiBuildPayload,
  parseChatTurnPayload,
  truncateExistingFiles,
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
      categoryHint: null,
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

  it("detects fix intent in PL/EN", () => {
    expect(isFixIntent("Nie działa ta gra. popraw ją")).toBe(true);
    expect(isFixIntent("Na podglądzie nie widać działającej gry")).toBe(true);
    expect(isFixIntent("Nadal bez zmian")).toBe(true);
    expect(isFixIntent("Still not working")).toBe(true);
    expect(isFixIntent("Catch falling coins with a basket")).toBe(false);
  });

  it("flags incomplete game shells", () => {
    expect(
      looksIncompletePlayable(
        {
          "index.html": "<html></html>",
          "script.js": "document.body.textContent='Score: 0'",
        },
        "game",
      ),
    ).toBe(true);
    expect(
      looksIncompletePlayable(
        {
          "index.html": "<canvas id=c></canvas>",
          "script.js": `
            const c=document.getElementById('c');
            const ctx=c.getContext('2d');
            addEventListener('keydown',()=>{});
            function loop(){ ctx.fillRect(0,0,10,10); requestAnimationFrame(loop); }
            loop();
          `,
        },
        "game",
      ),
    ).toBe(false);
  });

  it("truncates large existing files", () => {
    const big = "a".repeat(40_000);
    const out = truncateExistingFiles(
      { "index.html": big, "style.css": "x", "script.js": "y" },
      1000,
    );
    expect(out["index.html"]!.length).toBeLessThan(1200);
    expect(out["index.html"]).toContain("truncated");
  });
});
