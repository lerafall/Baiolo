/** Fix common canvas drag bugs in uploaded Baiolo play packages. */

export function patchPlayCss(source: string) {
  let out = source;
  out = out.replace(/object-fit\s*:\s*contain\s*;?/gi, "");
  out += `

/* Baiolo play fixes: correct hit-testing + touch drag */
canvas {
  touch-action: none !important;
  -webkit-user-select: none;
  user-select: none;
  max-width: 100% !important;
  max-height: 100% !important;
  width: auto !important;
  height: auto !important;
}
#game-container, body {
  touch-action: none;
}
`;
  return out;
}

export function patchPlayScript(source: string) {
  let out = source;

  out = out.replace(
    /window\.addEventListener\(\s*(['"])pointermove\1/g,
    "canvas.addEventListener($1pointermove$1",
  );
  out = out.replace(
    /window\.addEventListener\(\s*(['"])pointerup\1/g,
    "canvas.addEventListener($1pointerup$1",
  );
  out = out.replace(
    /window\.addEventListener\(\s*(['"])pointercancel\1/g,
    "canvas.addEventListener($1pointercancel$1",
  );
  out = out.replace(
    /window\.addEventListener\(\s*(['"])mousemove\1/g,
    "canvas.addEventListener($1mousemove$1",
  );
  out = out.replace(
    /window\.addEventListener\(\s*(['"])mouseup\1/g,
    "canvas.addEventListener($1mouseup$1",
  );

  // Correct mapping when canvas is letterboxed / scaled in CSS.
  out = out.replace(
    /function\s+getCanvasPos\s*\(\s*e\s*\)\s*\{[\s\S]*?\n\}/,
    `function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
    const dispW = canvas.width * scale;
    const dispH = canvas.height * scale;
    const offX = rect.left + (rect.width - dispW) / 2;
    const offY = rect.top + (rect.height - dispH) / 2;
    const src = (e.touches && e.touches[0])
      || (e.changedTouches && e.changedTouches[0])
      || e;
    return {
      x: (src.clientX - offX) / scale,
      y: (src.clientY - offY) / scale
    };
}`,
  );

  // Append forgiving drag + pointer capture (runs after original listeners).
  out += `

/* === Baiolo input fix === */
(function () {
  var c = document.getElementById("gameCanvas");
  if (!c) return;
  c.style.touchAction = "none";

  function startDrag(e) {
    if (typeof gameState === "undefined" || gameState !== "AIM") return;
    if (typeof token === "undefined" || !token.active) return;
    e.preventDefault();
    try { c.setPointerCapture(e.pointerId); } catch (_) {}
    var p = getCanvasPos(e);
    // Anchor to the wisp so mouse/touch don't need a pixel-perfect grab.
    dragStart = { x: token.x, y: token.y };
    dragCurrent = p;
  }

  function moveDrag(e) {
    if (!dragStart) return;
    e.preventDefault();
    dragCurrent = getCanvasPos(e);
  }

  function endDrag(e) {
    if (!dragStart) return;
    e.preventDefault();
    dragCurrent = getCanvasPos(e);
    var dx = dragStart.x - dragCurrent.x;
    var dy = dragStart.y - dragCurrent.y;
    var power = Math.min(Math.hypot(dx, dy) * 0.1, 40);
    var angle = Math.atan2(dy, dx);
    if (power > 2 && typeof token !== "undefined") {
      token.vx = Math.cos(angle) * power;
      token.vy = Math.sin(angle) * power;
      gameState = "MOVE";
      if (typeof playSound === "function") playSound("shoot");
    }
    dragStart = null;
    dragCurrent = null;
    try { c.releasePointerCapture(e.pointerId); } catch (_) {}
  }

  c.addEventListener("pointerdown", startDrag, { passive: false });
  c.addEventListener("pointermove", moveDrag, { passive: false });
  c.addEventListener("pointerup", endDrag, { passive: false });
  c.addEventListener("pointercancel", endDrag, { passive: false });
})();
`;

  return out;
}
