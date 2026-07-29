export type StarterId = "game" | "tool" | "experiment";

export type StarterFiles = Record<string, string>;

export type HtmlStarter = {
  id: StarterId;
  category: "game" | "tool" | "experiment";
  suggestedTitle: string;
  suggestedDescription: string;
  files: StarterFiles;
};

const gameFiles: StarterFiles = {
  "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Cloud Tap</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main>
    <h1>Cloud Tap</h1>
    <p class="hint">Tap / click to bounce. Catch 5 coins.</p>
    <canvas id="game" width="360" height="480" aria-label="Cloud Tap game"></canvas>
    <p id="score">Coins: 0</p>
  </main>
  <script src="script.js"></script>
</body>
</html>
`,
  "style.css": `* { box-sizing: border-box; }
html, body {
  margin: 0;
  min-height: 100%;
  font-family: "Segoe UI", system-ui, sans-serif;
  background: linear-gradient(160deg, #c4b5fd, #99f6e4 55%, #fef3c7);
  color: #1e1b4b;
}
main {
  max-width: 400px;
  margin: 0 auto;
  padding: 16px;
  text-align: center;
}
h1 { margin: 0 0 4px; font-size: 1.5rem; }
.hint { margin: 0 0 12px; opacity: 0.8; font-size: 0.95rem; }
canvas {
  width: 100%;
  max-width: 360px;
  height: auto;
  border-radius: 16px;
  background: #312e81;
  touch-action: none;
  box-shadow: 0 8px 24px rgba(30, 27, 75, 0.25);
}
#score { font-weight: 800; margin-top: 12px; }
`,
  "script.js": `const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");

let coins = 0;
const player = { x: 180, y: 360, r: 18, vy: 0 };
const coin = { x: 180, y: 120, r: 12 };

function resetCoin() {
  coin.x = 40 + Math.random() * (canvas.width - 80);
  coin.y = 60 + Math.random() * 160;
}

function bounce() {
  player.vy = -9;
}

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  bounce();
});

function loop() {
  player.vy += 0.35;
  player.y += player.vy;
  if (player.y > canvas.height - player.r) {
    player.y = canvas.height - player.r;
    player.vy *= -0.4;
  }
  if (player.y < player.r) {
    player.y = player.r;
    player.vy = 0;
  }

  const dx = player.x - coin.x;
  const dy = player.y - coin.y;
  if (Math.hypot(dx, dy) < player.r + coin.r) {
    coins += 1;
    scoreEl.textContent = "Coins: " + coins;
    resetCoin();
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#a5b4fc";
  ctx.beginPath();
  ctx.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fde68a";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fill();
  requestAnimationFrame(loop);
}

resetCoin();
loop();
`,
};

const toolFiles: StarterFiles = {
  "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tiny Timer</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main>
    <h1>Tiny Timer</h1>
    <p class="hint">A calm countdown you can remix.</p>
    <div id="display">01:00</div>
    <div class="row">
      <button type="button" id="start">Start</button>
      <button type="button" id="reset" class="ghost">Reset</button>
    </div>
  </main>
  <script src="script.js"></script>
</body>
</html>
`,
  "style.css": `* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: "Segoe UI", system-ui, sans-serif;
  background: linear-gradient(145deg, #fce7f3, #e0e7ff);
  color: #312e81;
}
main {
  width: min(92vw, 360px);
  padding: 28px;
  border-radius: 20px;
  background: rgba(255,255,255,0.85);
  box-shadow: 0 10px 30px rgba(49, 46, 129, 0.12);
  text-align: center;
}
h1 { margin: 0; }
.hint { opacity: 0.75; }
#display {
  font-size: 3rem;
  font-weight: 800;
  margin: 20px 0;
  letter-spacing: 0.04em;
}
.row { display: flex; gap: 10px; justify-content: center; }
button {
  min-height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  font-weight: 700;
  background: #7c3aed;
  color: white;
  cursor: pointer;
}
button.ghost {
  background: white;
  color: #7c3aed;
  border: 2px solid #c4b5fd;
}
`,
  "script.js": `let total = 60;
let left = total;
let timer = null;
const display = document.getElementById("display");

function render() {
  const m = String(Math.floor(left / 60)).padStart(2, "0");
  const s = String(left % 60).padStart(2, "0");
  display.textContent = m + ":" + s;
}

document.getElementById("start").onclick = () => {
  if (timer) return;
  timer = setInterval(() => {
    left -= 1;
    if (left <= 0) {
      left = 0;
      clearInterval(timer);
      timer = null;
    }
    render();
  }, 1000);
};

document.getElementById("reset").onclick = () => {
  clearInterval(timer);
  timer = null;
  left = total;
  render();
};

render();
`,
};

const experimentFiles: StarterFiles = {
  "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Color Bloom</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main>
    <h1>Color Bloom</h1>
    <p class="hint">Drag to paint soft circles.</p>
    <canvas id="art" width="360" height="420"></canvas>
    <button type="button" id="clear">Clear</button>
  </main>
  <script src="script.js"></script>
</body>
</html>
`,
  "style.css": `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: "Segoe UI", system-ui, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}
main { text-align: center; padding: 16px; }
canvas {
  display: block;
  margin: 12px auto;
  border-radius: 16px;
  background: #1e293b;
  touch-action: none;
  max-width: 100%;
}
button {
  min-height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  font-weight: 700;
  background: #38bdf8;
  color: #0f172a;
  cursor: pointer;
}
`,
  "script.js": `const canvas = document.getElementById("art");
const ctx = canvas.getContext("2d");
let drawing = false;
const colors = ["#f472b6", "#a78bfa", "#38bdf8", "#fbbf24", "#34d399"];

function paint(x, y) {
  ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
  ctx.beginPath();
  ctx.arc(x, y, 10 + Math.random() * 18, 0, Math.PI * 2);
  ctx.fill();
}

function pos(e) {
  const r = canvas.getBoundingClientRect();
  const sx = canvas.width / r.width;
  const sy = canvas.height / r.height;
  return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
}

canvas.addEventListener("pointerdown", (e) => {
  drawing = true;
  canvas.setPointerCapture(e.pointerId);
  const p = pos(e);
  paint(p.x, p.y);
});
canvas.addEventListener("pointermove", (e) => {
  if (!drawing) return;
  const p = pos(e);
  paint(p.x, p.y);
});
canvas.addEventListener("pointerup", () => { drawing = false; });
document.getElementById("clear").onclick = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};
`,
};

export const HTML_STARTERS: Record<StarterId, HtmlStarter> = {
  game: {
    id: "game",
    category: "game",
    suggestedTitle: "Cloud Tap",
    suggestedDescription: "Tap to bounce and catch soft coins.",
    files: gameFiles,
  },
  tool: {
    id: "tool",
    category: "tool",
    suggestedTitle: "Tiny Timer",
    suggestedDescription: "A calm one-minute countdown you can remix.",
    files: toolFiles,
  },
  experiment: {
    id: "experiment",
    category: "experiment",
    suggestedTitle: "Color Bloom",
    suggestedDescription: "Drag to paint playful color circles.",
    files: experimentFiles,
  },
};

export function cloneStarterFiles(id: StarterId): StarterFiles {
  const files = HTML_STARTERS[id].files;
  return Object.fromEntries(
    Object.entries(files).map(([path, content]) => [path, content]),
  );
}

/**
 * Build a srcdoc document for the live preview.
 * Never relies on relative CSS/JS URLs (they cannot load inside srcdoc).
 * Also tolerates truncated AI HTML like `<link href="style.` without a closing `>`.
 */
export function buildPreviewHtml(files: StarterFiles): string {
  const css = files["style.css"] || files["styles.css"] || "";
  const js = files["script.js"] || files["main.js"] || "";
  const raw =
    files["index.html"] ||
    "<!DOCTYPE html><html><body>Missing index.html</body></html>";

  const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = (titleMatch?.[1] || "Baiolo preview")
    .replace(/<[^>]+>/g, "")
    .trim()
    .slice(0, 80);

  let bodyInner = "";
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    bodyInner = bodyMatch[1];
  } else {
    // Truncated / broken head often eats the real body — fall back to stripping tags.
    bodyInner = raw
      .replace(/<!DOCTYPE[^>]*>/i, "")
      .replace(/<\/?(?:html|head|body)[^>]*>/gi, "");
  }

  // Remove any remaining external assets / scripts from body — we inject our own.
  bodyInner = bodyInner
    .replace(/<link\b[\s\S]*?(?:>|$)/gi, "")
    .replace(/<script\b[^>]*\bsrc\b[\s\S]*?(?:<\/script>|$)/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");

  // If the playfield is clearly a score-only shell, keep it — caller may heal files.
  // Still always wrap in a clean document so a broken <link> cannot swallow the DOM.
  const safeCss = css.replace(/<\/style>/gi, "<\\/style>");
  const safeJs = js.replace(/<\/script>/gi, "<\\/script>");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${title.replace(/</g, "&lt;")}</title>
  <style>
${safeCss}
  </style>
</head>
<body>
${bodyInner}
<script>
(function () {
  try {
${safeJs}
  } catch (err) {
    var box = document.createElement("pre");
    box.setAttribute("data-baiolo-preview-error", "1");
    box.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;max-height:40vh;overflow:auto;margin:0;padding:10px 12px;border-radius:10px;background:#7f1d1d;color:#fff;font:12px/1.4 ui-monospace,monospace;white-space:pre-wrap;";
    box.textContent = "Preview JS error: " + (err && err.message ? err.message : String(err));
    document.body.appendChild(box);
    console.error("[baiolo-preview]", err);
  }
})();
</script>
</body>
</html>`;
}
