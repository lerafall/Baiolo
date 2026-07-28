import { describe, expect, it } from "vitest";
import { patchPlayCss, patchPlayScript } from "@/lib/patch-play-package";

describe("patchPlayScript", () => {
  it("rewrites window pointer listeners to canvas", () => {
    const src = `
function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: 1, y: 2 };
}
window.addEventListener('pointermove', (e) => {});
window.addEventListener('pointerup', () => {});
`;
    const out = patchPlayScript(src);
    expect(out).toContain("canvas.addEventListener('pointermove'");
    expect(out).toContain("canvas.addEventListener('pointerup'");
    expect(out).toContain("Baiolo input fix");
    expect(out).toContain("setPointerCapture");
  });
});

describe("patchPlayCss", () => {
  it("removes object-fit contain and adds touch-action", () => {
    const out = patchPlayCss("canvas { object-fit: contain; width: 100%; }");
    expect(out).not.toMatch(/object-fit:\s*contain/);
    expect(out).toContain("touch-action: none");
  });
});
