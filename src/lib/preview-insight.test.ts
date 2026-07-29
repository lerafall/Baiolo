import { describe, expect, it } from "vitest";
import {
  insightFromFiles,
  previewHtmlHasPlaySurface,
} from "@/lib/preview-insight";
import { coinCatcherFiles } from "@/lib/ai-game-fallbacks";

describe("preview insight", () => {
  it("flags score-only shells as blank", () => {
    const insight = insightFromFiles({
      "index.html": "<html><body><p>Score: 0</p></body></html>",
      "script.js": "console.log(1)",
    });
    expect(insight.hasCanvas).toBe(false);
    expect(insight.likelyBlank).toBe(true);
    expect(insight.summary).toMatch(/NO <canvas>/i);
  });

  it("sees canvas in a working catcher", () => {
    const files = coinCatcherFiles("Coin Catcher");
    const insight = insightFromFiles(files);
    expect(insight.hasCanvas).toBe(true);
    expect(previewHtmlHasPlaySurface(files)).toBe(true);
  });
});
