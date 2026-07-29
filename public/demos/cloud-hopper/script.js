(() => {
  const canvas = document.getElementById("game");
  const frame = document.getElementById("frame");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const hud = document.getElementById("hud");
  const coinsEl = document.getElementById("coins");
  const heightEl = document.getElementById("height");

  const W = 360;
  const H = 640;
  // Tuned so one bounce reliably reaches the next cloud.
  const GRAVITY = 0.35;
  const JUMP = -10.8;
  const MOVE_ACCEL = 0.9;
  const MAX_VX = 7.5;
  const FRICTION = 0.86;

  let playing = false;
  let ended = false;
  let camY = 0;
  let bestHeight = 0;
  let coinScore = 0;
  let platforms = [];
  let coins = [];
  let sparks = [];
  let keys = { left: false, right: false };
  /** -1 left, 1 right, or null when not steering with pointer */
  let steer = null;
  let raf = 0;

  const player = {
    x: W / 2,
    y: H - 120,
    vx: 0,
    vy: 0,
    r: 18,
    facing: 1,
  };

  function resize() {
    const rect = frame.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function cloudColor(i) {
    const palette = ["#fff7fb", "#fce7f3", "#ccfbf1", "#e0e7ff", "#fef3c7"];
    return palette[i % palette.length];
  }

  function addPlatform(x, y, opts = {}) {
    const w = opts.w ?? 96;
    const spring = opts.spring ?? false;
    const tint = opts.tint ?? platforms.length;
    platforms.push({ x, y, w, h: 22, spring, tint });
    if (opts.coin !== false && Math.random() < (opts.coinChance ?? 0.5)) {
      coins.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y - 36,
        r: 11,
        taken: false,
        spin: Math.random() * Math.PI,
      });
    }
  }

  /** Reachable zigzag: next cloud is never too far sideways or up. */
  function resetWorld() {
    camY = 0;
    bestHeight = 0;
    coinScore = 0;
    platforms = [];
    coins = [];
    sparks = [];
    player.x = W / 2;
    player.y = H - 120;
    player.vx = 0;
    player.vy = 0;

    addPlatform(W / 2, H - 70, { w: 150, coin: false, spring: false });

    let x = W / 2;
    let y = H - 70;
    for (let i = 0; i < 36; i += 1) {
      const gap = 58 + Math.random() * 28; // ~58–86px (well under jump height)
      y -= gap;
      const side = i % 2 === 0 ? 1 : -1;
      const offset = 40 + Math.random() * 70;
      x = Math.max(55, Math.min(W - 55, x + side * offset));
      addPlatform(x, y, {
        w: 88 + Math.random() * 28,
        spring: Math.random() < 0.1,
        tint: i,
        coinChance: 0.55,
      });
    }
  }

  function extendWorld() {
    if (!platforms.length) return;
    const top = platforms.reduce((m, p) => Math.min(m, p.y), Infinity);
    let highest = platforms.reduce((a, p) => (p.y < a.y ? p : a), platforms[0]);
    let x = highest.x;
    let y = top;
    while (y > camY - 900) {
      const gap = 58 + Math.random() * 28;
      y -= gap;
      const side = Math.random() < 0.5 ? -1 : 1;
      const offset = 40 + Math.random() * 70;
      x = Math.max(55, Math.min(W - 55, x + side * offset));
      addPlatform(x, y, {
        w: 88 + Math.random() * 28,
        spring: Math.random() < 0.12,
        coinChance: 0.55,
      });
    }
    platforms = platforms.filter((p) => p.y < camY + H + 160);
    coins = coins.filter((c) => !c.taken && c.y < camY + H + 160);
  }

  function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / W;
    const scaleY = rect.height / H;
    const src =
      (e.touches && e.touches[0]) ||
      (e.changedTouches && e.changedTouches[0]) ||
      e;
    return {
      x: (src.clientX - rect.left) / scaleX,
      y: (src.clientY - rect.top) / scaleY,
    };
  }

  function setSteerFromEvent(e) {
    const p = getCanvasPos(e);
    // Left / right half — hold to keep moving that way.
    steer = p.x < W / 2 ? -1 : 1;
  }

  function onPointerDown(e) {
    if (e.target.closest?.("#startBtn")) return;
    e.preventDefault();
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {
      /* ignore */
    }
    if (!playing) return;
    setSteerFromEvent(e);
  }

  function onPointerMove(e) {
    if (!playing || steer === null) return;
    e.preventDefault();
    setSteerFromEvent(e);
  }

  function onPointerUp(e) {
    if (steer === null) return;
    e.preventDefault();
    steer = null;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (_) {
      /* ignore */
    }
  }

  canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
  canvas.addEventListener("pointermove", onPointerMove, { passive: false });
  canvas.addEventListener("pointerup", onPointerUp, { passive: false });
  canvas.addEventListener("pointercancel", onPointerUp, { passive: false });
  frame.addEventListener("pointerdown", onPointerDown, { passive: false });

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      keys.left = true;
      e.preventDefault();
    }
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      keys.right = true;
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
  });

  function bounce(boost = 1) {
    player.vy = JUMP * boost;
    for (let i = 0; i < 8; i += 1) {
      sparks.push({
        x: player.x,
        y: player.y + player.r,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 2,
        life: 18 + Math.random() * 10,
        color: boost > 1 ? "#f472b6" : "#a78bfa",
      });
    }
  }

  function landOnPlatforms() {
    // Only when moving downward — classic hopper landing.
    if (player.vy <= 0) return;

    const prevY = player.y - player.vy;
    const prevBottom = prevY + player.r;
    const bottom = player.y + player.r;
    const hitPad = 10;

    for (const p of platforms) {
      const left = p.x - p.w / 2 - hitPad;
      const right = p.x + p.w / 2 + hitPad;
      const top = p.y - p.h / 2;

      // Tunnel-safe: feet crossed the cloud top this frame.
      if (
        player.x >= left &&
        player.x <= right &&
        prevBottom <= top + 2 &&
        bottom >= top
      ) {
        player.y = top - player.r;
        bounce(p.spring ? 1.38 : 1);
        return;
      }
    }
  }

  function update() {
    if (!playing) return;

    let dir = 0;
    if (keys.left) dir -= 1;
    if (keys.right) dir += 1;
    if (steer !== null) dir = steer;

    if (dir !== 0) {
      player.vx += dir * MOVE_ACCEL;
      player.facing = dir;
    } else {
      player.vx *= FRICTION;
    }
    player.vx = Math.max(-MAX_VX, Math.min(MAX_VX, player.vx));

    player.vy += GRAVITY;
    player.x += player.vx;
    player.y += player.vy;

    if (player.x < -16) player.x = W + 16;
    if (player.x > W + 16) player.x = -16;

    landOnPlatforms();

    for (const c of coins) {
      if (c.taken) continue;
      c.spin += 0.08;
      const dx = player.x - c.x;
      const dy = player.y - c.y;
      if (dx * dx + dy * dy < (player.r + c.r) * (player.r + c.r)) {
        c.taken = true;
        coinScore += 1;
        coinsEl.textContent = String(coinScore);
        for (let i = 0; i < 10; i += 1) {
          sparks.push({
            x: c.x,
            y: c.y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 16,
            color: "#fbbf24",
          });
        }
      }
    }

    const focus = player.y - H * 0.48;
    if (focus < camY) camY = focus;
    const heightMeters = Math.max(0, Math.floor((H - 140 - player.y) / 10));
    if (heightMeters > bestHeight) {
      bestHeight = heightMeters;
      heightEl.textContent = String(bestHeight);
    }

    extendWorld();

    for (const s of sparks) {
      s.x += s.vx;
      s.y += s.vy;
      s.life -= 1;
    }
    sparks = sparks.filter((s) => s.life > 0);

    if (player.y > camY + H + 50) {
      endGame();
    }
  }

  function drawCloud(p) {
    const y = p.y - camY;
    if (y < -60 || y > H + 60) return;
    ctx.save();
    ctx.translate(p.x, y);
    const fill = p.spring ? "#fbcfe8" : cloudColor(p.tint || 0);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
    ctx.ellipse(-p.w * 0.28, -4, p.w * 0.22, p.h * 0.55, 0, 0, Math.PI * 2);
    ctx.ellipse(p.w * 0.26, -6, p.w * 0.24, p.h * 0.58, 0, 0, Math.PI * 2);
    ctx.ellipse(0, -10, p.w * 0.2, p.h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.ellipse(-p.w * 0.1, -8, p.w * 0.18, p.h * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    if (p.spring) {
      ctx.fillStyle = "#db2777";
      ctx.font = "bold 14px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("↑", 0, 5);
    }
    ctx.restore();
  }

  function drawCoin(c) {
    if (c.taken) return;
    const y = c.y - camY;
    if (y < -40 || y > H + 40) return;
    const squash = 0.7 + Math.abs(Math.cos(c.spin)) * 0.3;
    ctx.save();
    ctx.translate(c.x, y);
    ctx.scale(squash, 1);
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(0, 0, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.arc(-2, -2, c.r * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b45309";
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPlayer() {
    const y = player.y - camY;
    ctx.save();
    ctx.translate(player.x, y);
    ctx.scale(player.facing, 1);

    ctx.fillStyle = "rgba(49,46,129,0.15)";
    ctx.beginPath();
    ctx.ellipse(0, player.r + 6, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createRadialGradient(-6, -8, 4, 0, 0, 22);
    grad.addColorStop(0, "#ddd6fe");
    grad.addColorStop(1, "#7c3aed");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, player.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(5, -4, 5, 0, Math.PI * 2);
    ctx.arc(13, -4, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1e1b4b";
    ctx.beginPath();
    ctx.arc(6.5, -3.5, 2.2, 0, Math.PI * 2);
    ctx.arc(14, -3.5, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#4c1d95";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(8, 4, 5, 0.15, Math.PI - 0.15);
    ctx.stroke();

    ctx.restore();
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#c4b5fd");
    g.addColorStop(0.45, "#99f6e4");
    g.addColorStop(1, "#fde68a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255,255,255,0.28)";
    for (let i = 0; i < 6; i += 1) {
      const x = ((i * 67 + camY * 0.02) % (W + 80)) - 40;
      const y = ((i * 97) % H) * 0.7 + 30;
      ctx.beginPath();
      ctx.ellipse(x, y, 28 + (i % 3) * 8, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawControlsHint() {
    if (!playing || bestHeight > 3) return;
    ctx.fillStyle = "rgba(49,46,129,0.45)";
    ctx.font = "bold 13px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Hold left  ·  Hold right", W / 2, H - 24);
  }

  function draw() {
    drawSky();
    for (const p of platforms) drawCloud(p);
    for (const c of coins) drawCoin(c);
    for (const s of sparks) {
      ctx.globalAlpha = Math.max(0, s.life / 20);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y - camY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    drawPlayer();
    drawControlsHint();

    if (ended) {
      ctx.fillStyle = "rgba(49,46,129,0.35)";
      ctx.fillRect(0, 0, W, H);
    }
  }

  function loop() {
    update();
    draw();
    raf = requestAnimationFrame(loop);
  }

  function startGame() {
    ended = false;
    playing = true;
    steer = null;
    overlay.hidden = true;
    hud.hidden = false;
    coinsEl.textContent = "0";
    heightEl.textContent = "0";
    resetWorld();
    // Sit on the starter cloud and hop immediately.
    player.y = H - 70 - 22 / 2 - player.r;
    bounce(1);
  }

  function endGame() {
    playing = false;
    ended = true;
    steer = null;
    overlay.hidden = false;
    overlay.querySelector(".brand").textContent = "Nice hop!";
    overlay.querySelector(".body").textContent =
      `Height ${bestHeight} · Coins ${coinScore}. Bounce again?`;
    overlay.querySelector(".hint").textContent =
      "Hold left or right side of the screen";
    startBtn.textContent = "Play again";
  }

  startBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    startGame();
  });

  window.addEventListener("resize", resize);
  resize();
  resetWorld();
  draw();
  raf = requestAnimationFrame(loop);
})();
