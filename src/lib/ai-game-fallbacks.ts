import type { StarterFiles } from "@/lib/html-starters";

/** Guaranteed-working falling-coin / basket catcher for repair fallbacks. */
export function coinCatcherFiles(title = "Coin Catcher"): StarterFiles {
  const safeTitle = title.replace(/[<>&"]/g, "").slice(0, 40) || "Coin Catcher";
  return {
    "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${safeTitle}</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main>
    <h1>${safeTitle}</h1>
    <p class="hint">Move the basket · catch golden coins · arrow keys or drag</p>
    <canvas id="game" width="360" height="480" aria-label="${safeTitle}"></canvas>
    <p id="score">Score: 0</p>
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
  background: linear-gradient(180deg, #7dd3fc 0%, #bae6fd 45%, #fef9c3 100%);
  color: #0f172a;
}
main {
  max-width: 400px;
  margin: 0 auto;
  padding: 16px;
  text-align: center;
}
h1 { margin: 0 0 4px; font-size: 1.45rem; }
.hint { margin: 0 0 12px; opacity: 0.85; font-size: 0.92rem; }
canvas {
  width: 100%;
  max-width: 360px;
  height: auto;
  display: block;
  margin: 0 auto;
  border-radius: 16px;
  background: linear-gradient(180deg, #38bdf8, #7dd3fc 55%, #bbf7d0);
  touch-action: none;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.18);
}
#score { font-weight: 800; margin-top: 12px; font-size: 1.15rem; }
`,
    "script.js": `const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");

const basket = { x: canvas.width / 2, y: canvas.height - 36, w: 72, h: 22, speed: 6 };
const coins = [];
let score = 0;
let spawnTimer = 0;
const keys = { left: false, right: false };

function spawnCoin() {
  coins.push({
    x: 24 + Math.random() * (canvas.width - 48),
    y: -20,
    r: 14,
    vy: 2.2 + Math.random() * 1.8,
    label: ["$","★","10"][Math.floor(Math.random() * 3)],
  });
}

function hit(c) {
  return (
    c.x > basket.x - basket.w / 2 &&
    c.x < basket.x + basket.w / 2 &&
    c.y + c.r > basket.y - basket.h / 2 &&
    c.y - c.r < basket.y + basket.h / 2
  );
}

function drawCoin(c) {
  ctx.beginPath();
  ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
  ctx.fillStyle = "#f59e0b";
  ctx.fill();
  ctx.strokeStyle = "#b45309";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#78350f";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(c.label, c.x, c.y + 1);
}

function drawBasket() {
  const x = basket.x - basket.w / 2;
  const y = basket.y - basket.h / 2;
  ctx.fillStyle = "#92400e";
  ctx.fillRect(x, y, basket.w, basket.h);
  ctx.fillStyle = "#d97706";
  ctx.fillRect(x + 4, y + 4, basket.w - 8, basket.h - 8);
}

function loop() {
  if (keys.left) basket.x -= basket.speed;
  if (keys.right) basket.x += basket.speed;
  basket.x = Math.max(basket.w / 2, Math.min(canvas.width - basket.w / 2, basket.x));

  spawnTimer += 1;
  if (spawnTimer > 42) {
    spawnTimer = 0;
    spawnCoin();
  }

  for (let i = coins.length - 1; i >= 0; i -= 1) {
    const c = coins[i];
    c.y += c.vy;
    if (hit(c)) {
      score += 1;
      scoreEl.textContent = "Score: " + score;
      coins.splice(i, 1);
      continue;
    }
    if (c.y - c.r > canvas.height) coins.splice(i, 1);
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const c of coins) drawCoin(c);
  drawBasket();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a") keys.left = true;
  if (e.key === "ArrowRight" || e.key === "d") keys.right = true;
});
window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
  if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
});

function pointerX(e) {
  const rect = canvas.getBoundingClientRect();
  return ((e.clientX - rect.left) / rect.width) * canvas.width;
}
canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  basket.x = pointerX(e);
});
canvas.addEventListener("pointermove", (e) => {
  if (e.buttons || e.pressure > 0) basket.x = pointerX(e);
});

spawnCoin();
loop();
`,
  };
}

export function briefLooksLikeCatchGame(brief: string): boolean {
  return /\b(coin|monet|koszyk|basket|catch|łap|łowi|spadaj|falling|paddle|zbier)\b/i.test(
    brief,
  );
}
