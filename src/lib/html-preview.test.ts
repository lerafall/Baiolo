import { describe, expect, it } from "vitest";
import { buildPreviewHtml } from "@/lib/html-starters";
import { coinCatcherFiles } from "@/lib/ai-game-fallbacks";
import { sanitizeAiFiles } from "@/lib/ai-build";

describe("buildPreviewHtml", () => {
  it("inlines CSS/JS even when link href is truncated", () => {
    const html = buildPreviewHtml({
      "index.html": `<!DOCTYPE html><html><head>
<link rel="stylesheet" href="style.">
</head><body><p id="score">Score: 0</p>
<script src="script."></script>
</body></html>`,
      "style.css": "body{background:#7dd3fc}",
      "script.js": "document.body.dataset.ok='1'",
    });
    expect(html).toContain("<style>");
    expect(html).toContain("background:#7dd3fc");
    expect(html).toContain("<script>");
    expect(html).toContain("dataset.ok");
    expect(html).not.toMatch(/href=["']style/);
  });

  it("appends assets when tags are missing", () => {
    const html = buildPreviewHtml({
      "index.html": "<!DOCTYPE html><html><head></head><body><h1>Hi</h1></body></html>",
      "style.css": ".x{color:red}",
      "script.js": "console.log(1)",
    });
    expect(html).toContain(".x{color:red}");
    expect(html).toContain("console.log(1)");
  });
});

describe("sanitizeAiFiles", () => {
  it("repairs truncated stylesheet href", () => {
    const out = sanitizeAiFiles({
      "index.html":
        '<html><head><link rel="stylesheet" href="style."></head><body></body></html>',
      "style.css": "body{}",
      "script.js": "1",
    });
    expect(out["index.html"]).toContain('href="style.css"');
    expect(out["index.html"]).toContain('src="script.js"');
  });
});

describe("coinCatcherFiles", () => {
  it("is a complete playable package", () => {
    const files = coinCatcherFiles("Test Catch");
    expect(files["index.html"]).toContain("<canvas");
    expect(files["script.js"]).toContain("requestAnimationFrame");
    expect(files["script.js"]).toContain("basket");
    const preview = buildPreviewHtml(files);
    expect(preview).toContain("requestAnimationFrame");
    expect(preview).toContain("linear-gradient");
  });
});
