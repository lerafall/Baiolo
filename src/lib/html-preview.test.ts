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
    expect(html).toContain("dataset.ok");
    expect(html).not.toMatch(/href=["']style/);
  });

  it("survives an unclosed truncated link tag that would eat the DOM", () => {
    const html = buildPreviewHtml({
      "index.html": `<!DOCTYPE html><html><head>
<meta charset="UTF-8"/>
<title>Coin Catcher</title>
<link rel="stylesheet" href="style.
`,
      "style.css": "body{background:#38bdf8}",
      "script.js": 'document.body.setAttribute("data-ran","1")',
    });
    // Must still produce a coherent document with inlined assets.
    expect(html).toContain("</body>");
    expect(html).toContain("background:#38bdf8");
    expect(html).toContain('data-ran","1"');
    expect(html).not.toMatch(/<link\b/i);
  });

  it("appends assets when tags are missing", () => {
    const html = buildPreviewHtml({
      "index.html":
        "<!DOCTYPE html><html><head></head><body><h1>Hi</h1></body></html>",
      "style.css": ".x{color:red}",
      "script.js": "console.log(1)",
    });
    expect(html).toContain(".x{color:red}");
    expect(html).toContain("console.log(1)");
  });

  it("injects an idle score gate for the live preview iframe", () => {
    const html = buildPreviewHtml({
      "index.html":
        '<!DOCTYPE html><html><body><p id="score">Score: 0</p></body></html>',
      "style.css": "",
      "script.js": "setInterval(function(){ score++; }, 50); var score = 0;",
    });
    expect(html).toContain("baioloScoreGate");
    expect(html).toContain("interacted");
    expect(html).toContain("#score");
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
