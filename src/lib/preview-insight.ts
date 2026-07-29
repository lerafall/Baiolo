import type { StarterFiles } from "@/lib/html-starters";
import { buildPreviewHtml } from "@/lib/html-starters";

export type PreviewInsight = {
  /** Short plain-language report of what the live preview shows. */
  summary: string;
  /** JPEG data URL of the play canvas (or a text-fallback snapshot), if available. */
  imageDataUrl?: string;
  hasCanvas: boolean;
  visibleText: string;
  likelyBlank: boolean;
};

const MAX_IMAGE_CHARS = 180_000; // ~keep request payload reasonable

/** Static insight from source files (no live iframe needed). */
export function insightFromFiles(files: StarterFiles): PreviewInsight {
  const html = files["index.html"] || "";
  const js = files["script.js"] || files["main.js"] || "";
  const hasCanvas = /<canvas\b/i.test(html);
  const textBits = Array.from(
    html.matchAll(/>([^<]{1,80})</g),
    (m) => m[1].replace(/\s+/g, " ").trim(),
  ).filter((t) => t && !/^[\s{}();]*$/.test(t));
  const visibleText = textBits.slice(0, 12).join(" · ").slice(0, 400);
  const likelyBlank =
    !hasCanvas ||
    (/score\s*:\s*0/i.test(html) && !/requestAnimationFrame/.test(js));

  const lines = [
    hasCanvas
      ? "HTML includes a <canvas>."
      : "HTML has NO <canvas> — often looks like a blank/score-only screen.",
    visibleText
      ? `Visible text-ish content: ${visibleText}`
      : "Little/no visible text nodes in HTML.",
    /requestAnimationFrame/.test(js)
      ? "script.js has a requestAnimationFrame loop."
      : "script.js has no requestAnimationFrame loop.",
    /getElementById\s*\(\s*['"]game['"]\s*\)/.test(js) && !hasCanvas
      ? "JS looks for #game canvas but HTML does not define one."
      : null,
    likelyBlank
      ? "Preview is likely blank or not playable."
      : "Preview may already be interactive.",
  ].filter(Boolean);

  return {
    summary: lines.join("\n"),
    hasCanvas,
    visibleText,
    likelyBlank,
  };
}

function isMostlyBlankCanvas(canvas: HTMLCanvasElement): boolean {
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) return true;
    const w = Math.min(canvas.width, 64);
    const h = Math.min(canvas.height, 64);
    if (w < 2 || h < 2) return true;
    const data = ctx.getImageData(0, 0, w, h).data;
    let colored = 0;
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a > 8 && (Math.abs(r - g) > 12 || Math.abs(g - b) > 12 || r < 230)) {
        colored += 1;
      }
    }
    return colored < 8;
  } catch {
    return true;
  }
}

/** Capture live iframe preview (requires allow-same-origin on the iframe). */
export function insightFromIframe(
  iframe: HTMLIFrameElement | null,
): PreviewInsight | null {
  if (!iframe) return null;
  let doc: Document | null = null;
  try {
    doc = iframe.contentDocument;
  } catch {
    return null;
  }
  if (!doc?.body) return null;

  const visibleText = (doc.body.innerText || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
  const canvas = doc.querySelector("canvas");
  const hasCanvas = Boolean(canvas);

  let imageDataUrl: string | undefined;
  let canvasBlank = false;
  if (canvas instanceof HTMLCanvasElement && canvas.width > 0) {
    canvasBlank = isMostlyBlankCanvas(canvas);
    try {
      const shot = document.createElement("canvas");
      const maxW = 480;
      const scale = Math.min(1, maxW / canvas.width);
      shot.width = Math.max(1, Math.round(canvas.width * scale));
      shot.height = Math.max(1, Math.round(canvas.height * scale));
      const ctx = shot.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#e0f2fe";
        ctx.fillRect(0, 0, shot.width, shot.height);
        ctx.drawImage(canvas, 0, 0, shot.width, shot.height);
        // Caption strip so the model knows this is the live preview.
        ctx.fillStyle = "rgba(15,23,42,0.75)";
        ctx.fillRect(0, 0, shot.width, 22);
        ctx.fillStyle = "#fff";
        ctx.font = "12px sans-serif";
        ctx.fillText("Baiolo live preview", 8, 15);
        const url = shot.toDataURL("image/jpeg", 0.72);
        if (url.length <= MAX_IMAGE_CHARS) imageDataUrl = url;
      }
    } catch {
      /* tainted / empty */
    }
  } else {
    // No canvas — render a simple text snapshot so vision models still see “Score: 0”.
    try {
      const shot = document.createElement("canvas");
      shot.width = 360;
      shot.height = 240;
      const ctx = shot.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#bae6fd";
        ctx.fillRect(0, 0, shot.width, shot.height);
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText("Live preview (no canvas)", 16, 36);
        ctx.font = "14px sans-serif";
        const lines = (visibleText || "(empty)").match(/.{1,42}/g) || [];
        lines.slice(0, 8).forEach((line, i) => {
          ctx.fillText(line, 16, 70 + i * 20);
        });
        const url = shot.toDataURL("image/jpeg", 0.72);
        if (url.length <= MAX_IMAGE_CHARS) imageDataUrl = url;
      }
    } catch {
      /* ignore */
    }
  }

  const likelyBlank =
    !hasCanvas ||
    canvasBlank ||
    /^score\s*:\s*0$/i.test(visibleText.trim()) ||
    visibleText.trim().length < 3;

  const summary = [
    hasCanvas
      ? `Live preview has a canvas${canvasBlank ? " that looks mostly blank" : ""}.`
      : "Live preview has NO canvas element.",
    visibleText
      ? `Visible text: “${visibleText}”`
      : "Visible text: (none / empty).",
    imageDataUrl
      ? "A JPEG snapshot of the preview is attached."
      : "No snapshot could be captured.",
  ].join("\n");

  return {
    summary,
    imageDataUrl,
    hasCanvas,
    visibleText,
    likelyBlank,
  };
}

/** Prefer live iframe; fall back to static file analysis. */
export function capturePreviewInsight(
  iframe: HTMLIFrameElement | null,
  files?: StarterFiles | null,
): PreviewInsight {
  const live = insightFromIframe(iframe);
  if (live) return live;
  if (files) return insightFromFiles(files);
  return {
    summary: "Preview could not be inspected.",
    hasCanvas: false,
    visibleText: "",
    likelyBlank: true,
  };
}

/** Soft check used in tests — buildPreviewHtml still works for srcdoc. */
export function previewHtmlHasPlaySurface(files: StarterFiles): boolean {
  const html = buildPreviewHtml(files);
  return /<canvas\b/i.test(html) || /<button\b/i.test(html);
}
