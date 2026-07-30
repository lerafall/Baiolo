(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const hud = document.getElementById("hud");
  const levelNum = document.getElementById("levelNum");
  const lightsEl = document.getElementById("lights");
  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const levelCard = document.getElementById("levelCard");
  const levelKicker = document.getElementById("levelKicker");
  const levelTitle = document.getElementById("levelTitle");
  const levelHint = document.getElementById("levelHint");
  const winCard = document.getElementById("winCard");
  const winTitle = document.getElementById("winTitle");
  const winBody = document.getElementById("winBody");
  const nextBtn = document.getElementById("nextBtn");

  const G = 0.17;
  const MAX_PULL = 78;
  const LAUNCH = 0.19;
  const REST = 0.74;
  const STAR_R = 11;

  /** @type {"title"|"aim"|"fly"|"win"|"finale"} */
  let mode = "title";
  let levelIndex = 0;
  let lights = 0;
  let totalLights = 0;
  let shake = 0;
  let flash = 0;
  let tipTimer = 0;
  let winBurst = 0;
  let bounceCool = 0;

  /** @type {ReturnType<typeof buildLevel>} */
  let level;
  /** @type {{x:number,y:number,vx:number,vy:number,trail:Array<{x:number,y:number,a:number}>}} */
  let star;
  let aiming = false;
  let pull = { x: 0, y: 0 };
  /** @type {Array<{x:number,y:number,vx:number,vy:number,life:number,color:string,size:number}>} */
  let particles = [];
  /** @type {Array<{x:number,y:number,r:number,a:number,s:number}>} */
  let pollen = [];
  let time = 0;

  const LEVELS = [
    {
      name: "First Light",
      purpose: "Direct shot",
      hint: "Drag back, release toward the crystal flower.",
      start: { x: 180, y: 520 },
      flower: { x: 180, y: 140, r: 28 },
      leaves: [],
      thorns: [],
      portals: [],
      lights: [{ x: 180, y: 320 }],
    },
    {
      name: "Leaf Bounce",
      purpose: "Bounce leaf",
      hint: "Bounce off the soft leaf to reach the bloom.",
      start: { x: 80, y: 540 },
      flower: { x: 280, y: 120, r: 26 },
      leaves: [{ x: 170, y: 360, w: 120, h: 16, angle: -0.35 }],
      thorns: [],
      portals: [],
      lights: [{ x: 200, y: 280 }],
    },
    {
      name: "Soft Thorns",
      purpose: "Avoid thorns",
      hint: "Soft thorns reset gently — curve around them.",
      start: { x: 60, y: 530 },
      flower: { x: 300, y: 130, r: 26 },
      leaves: [{ x: 180, y: 420, w: 90, h: 14, angle: 0.2 }],
      thorns: [
        { x: 160, y: 260, r: 18 },
        { x: 220, y: 200, r: 16 },
      ],
      portals: [],
      lights: [{ x: 90, y: 300 }],
    },
    {
      name: "Gather Glow",
      purpose: "Collect lights",
      hint: "Scoop the light fragments on your way up.",
      start: { x: 180, y: 560 },
      flower: { x: 180, y: 100, r: 28 },
      leaves: [
        { x: 90, y: 400, w: 100, h: 14, angle: 0.4 },
        { x: 270, y: 300, w: 100, h: 14, angle: -0.4 },
      ],
      thorns: [],
      portals: [],
      lights: [
        { x: 120, y: 350 },
        { x: 240, y: 250 },
        { x: 180, y: 180 },
      ],
    },
    {
      name: "Portal Gate",
      purpose: "Portal travel",
      hint: "Enter the violet gate — exit near the flower.",
      start: { x: 70, y: 540 },
      flower: { x: 290, y: 120, r: 26 },
      leaves: [{ x: 120, y: 380, w: 80, h: 14, angle: 0.15 }],
      thorns: [{ x: 180, y: 250, r: 16 }],
      portals: [{ ax: 90, ay: 220, bx: 250, by: 200, r: 22 }],
      lights: [{ x: 200, y: 360 }],
    },
    {
      name: "Turning Leaf",
      purpose: "Rotating leaf",
      hint: "Time your bounce on the spinning leaf.",
      start: { x: 60, y: 540 },
      flower: { x: 300, y: 110, r: 26 },
      leaves: [
        {
          x: 180,
          y: 340,
          w: 130,
          h: 15,
          angle: 0,
          rotating: true,
          rotSpeed: 0.012,
        },
      ],
      thorns: [{ x: 120, y: 200, r: 15 }],
      portals: [],
      lights: [{ x: 200, y: 260 }],
    },
    {
      name: "Cascade Path",
      purpose: "Multi-bounce",
      hint: "Chain soft bounces up the garden stairs.",
      start: { x: 50, y: 560 },
      flower: { x: 300, y: 90, r: 26 },
      leaves: [
        { x: 100, y: 470, w: 95, h: 13, angle: 0.45 },
        { x: 220, y: 380, w: 95, h: 13, angle: -0.4 },
        { x: 110, y: 290, w: 95, h: 13, angle: 0.35 },
        { x: 230, y: 200, w: 95, h: 13, angle: -0.3 },
      ],
      thorns: [{ x: 180, y: 330, r: 14 }],
      portals: [],
      lights: [
        { x: 140, y: 430 },
        { x: 200, y: 340 },
        { x: 150, y: 250 },
      ],
    },
    {
      name: "Starfall Finale",
      purpose: "Everything together",
      hint: "Portals, leaves, lights — bloom the crystal.",
      start: { x: 50, y: 560 },
      flower: { x: 300, y: 90, r: 28 },
      leaves: [
        { x: 130, y: 460, w: 100, h: 14, angle: 0.3 },
        {
          x: 240,
          y: 320,
          w: 110,
          h: 14,
          angle: -0.2,
          rotating: true,
          rotSpeed: -0.01,
        },
        { x: 100, y: 220, w: 90, h: 13, angle: 0.25 },
      ],
      thorns: [
        { x: 180, y: 380, r: 15 },
        { x: 200, y: 160, r: 14 },
      ],
      portals: [{ ax: 70, ay: 300, bx: 280, by: 240, r: 20 }],
      lights: [
        { x: 150, y: 420 },
        { x: 260, y: 280 },
        { x: 140, y: 180 },
        { x: 260, y: 140 },
      ],
    },
  ];

  function buildLevel(def) {
    return {
      ...def,
      leaves: def.leaves.map((l) => ({ ...l, angle: l.angle || 0 })),
      lights: def.lights.map((l) => ({ ...l, taken: false })),
      portalUsed: false,
    };
  }

  function resetStar() {
    const s = level.start;
    star = { x: s.x, y: s.y, vx: 0, vy: 0, trail: [] };
    aiming = false;
    pull = { x: s.x, y: s.y };
    level.portalUsed = false;
  }

  function loadLevel(i) {
    levelIndex = i;
    level = buildLevel(LEVELS[i]);
    lights = 0;
    resetStar();
    mode = "aim";
    tipTimer = 220;
    shake = 0;
    flash = 0;
    winBurst = 0;
    particles = [];
    levelNum.textContent = String(i + 1);
    lightsEl.textContent = "0";
    levelKicker.textContent = `Level ${i + 1} · ${level.purpose}`;
    levelTitle.textContent = level.name;
    levelHint.textContent = level.hint;
    levelCard.hidden = false;
    winCard.hidden = true;
    hud.hidden = false;
    setTimeout(() => {
      if (mode === "aim") levelCard.hidden = true;
    }, 2800);
  }

  function spawnPollen() {
    pollen = [];
    for (let i = 0; i < 28; i += 1) {
      pollen.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 1 + Math.random() * 2.2,
        a: 0.15 + Math.random() * 0.35,
        s: 0.15 + Math.random() * 0.4,
      });
    }
  }

  function burst(x, y, color, n = 14, speed = 3) {
    for (let i = 0; i < n; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random());
      particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.6 + Math.random() * 0.7,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  function pointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return {
      x: ((src.clientX - rect.left) / rect.width) * W,
      y: ((src.clientY - rect.top) / rect.height) * H,
    };
  }

  function onDown(e) {
    if (mode !== "aim") return;
    e.preventDefault();
    const p = pointerPos(e);
    const dx = p.x - star.x;
    const dy = p.y - star.y;
    if (dx * dx + dy * dy < 55 * 55) {
      aiming = true;
      pull = p;
      levelCard.hidden = true;
    }
  }

  function onMove(e) {
    if (!aiming || mode !== "aim") return;
    e.preventDefault();
    pull = pointerPos(e);
  }

  function onUp(e) {
    if (!aiming || mode !== "aim") return;
    e.preventDefault();
    aiming = false;
    const dx = star.x - pull.x;
    const dy = star.y - pull.y;
    const len = Math.hypot(dx, dy);
    if (len < 8) return;
    const capped = Math.min(len, MAX_PULL);
    const nx = dx / len;
    const ny = dy / len;
    star.vx = nx * capped * LAUNCH;
    star.vy = ny * capped * LAUNCH;
    mode = "fly";
    burst(star.x, star.y, "#fde68a", 10, 2.2);
  }

  canvas.addEventListener("mousedown", onDown);
  canvas.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  canvas.addEventListener("touchstart", onDown, { passive: false });
  canvas.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("touchend", onUp);

  startBtn.addEventListener("click", () => {
    overlay.hidden = true;
    totalLights = 0;
    loadLevel(0);
  });

  nextBtn.addEventListener("click", () => {
    if (levelIndex >= LEVELS.length - 1) {
      winCard.hidden = true;
      overlay.hidden = false;
      hud.hidden = true;
      mode = "title";
      nextBtn.textContent = "Next garden";
      return;
    }
    winCard.hidden = true;
    loadLevel(levelIndex + 1);
  });

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function roundRect(
      x,
      y,
      w,
      h,
      r,
    ) {
      const radius = typeof r === "number" ? r : 8;
      this.moveTo(x + radius, y);
      this.arcTo(x + w, y, x + w, y + h, radius);
      this.arcTo(x + w, y + h, x, y + h, radius);
      this.arcTo(x, y + h, x, y, radius);
      this.arcTo(x, y, x + w, y, radius);
      this.closePath();
    };
  }

  function collideLeaf(leaf) {
    if (bounceCool > 0) return false;
    const c = Math.cos(-leaf.angle);
    const s = Math.sin(-leaf.angle);
    const dx = star.x - leaf.x;
    const dy = star.y - leaf.y;
    const lx = dx * c - dy * s;
    const ly = dx * s + dy * c;
    const hw = leaf.w / 2 + STAR_R * 0.85;
    const hh = leaf.h / 2 + STAR_R * 0.85;
    if (Math.abs(lx) > hw || Math.abs(ly) > hh) return false;

    // Prefer top-face bounce (local -Y)
    const nAngle = leaf.angle - Math.PI / 2;
    let nxw = Math.cos(nAngle);
    let nyw = Math.sin(nAngle);
    if (star.vx * nxw + star.vy * nyw > 0) {
      nxw = -nxw;
      nyw = -nyw;
    }
    star.x += nxw * 3;
    star.y += nyw * 3;
    const dot = star.vx * nxw + star.vy * nyw;
    star.vx = (star.vx - 2 * dot * nxw) * REST;
    star.vy = (star.vy - 2 * dot * nyw) * REST - 0.55;
    bounceCool = 10;
    shake = Math.max(shake, 5);
    burst(star.x, star.y, "#6ee7b7", 12, 2.5);
    return true;
  }

  function update(dt) {
    time += dt;
    if (shake > 0) shake *= 0.86;
    if (flash > 0) flash *= 0.9;
    if (bounceCool > 0) bounceCool -= dt / 16;
    tipTimer = Math.max(0, tipTimer - dt);

    for (const p of pollen) {
      p.y -= p.s * 0.35;
      p.x += Math.sin(time * 0.01 + p.y) * 0.15;
      if (p.y < -4) {
        p.y = H + 4;
        p.x = Math.random() * W;
      }
    }

    for (const leaf of level?.leaves || []) {
      if (leaf.rotating) leaf.angle += leaf.rotSpeed || 0;
    }

    particles = particles.filter((p) => {
      p.life -= dt / 60;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04;
      p.vx *= 0.98;
      return p.life > 0;
    });

    if (!level || (mode !== "fly" && mode !== "aim" && mode !== "win")) return;

    if (mode === "fly") {
      star.vy += G;
      star.vx *= 0.998;
      star.x += star.vx;
      star.y += star.vy;
      star.trail.unshift({ x: star.x, y: star.y, a: 1 });
      if (star.trail.length > 18) star.trail.pop();
      for (let i = 0; i < star.trail.length; i += 1) {
        star.trail[i].a *= 0.92;
      }

      // Walls soft bounce
      if (star.x < STAR_R) {
        star.x = STAR_R;
        star.vx = Math.abs(star.vx) * REST;
        burst(star.x, star.y, "#c4b5fd", 6, 1.5);
      }
      if (star.x > W - STAR_R) {
        star.x = W - STAR_R;
        star.vx = -Math.abs(star.vx) * REST;
        burst(star.x, star.y, "#c4b5fd", 6, 1.5);
      }

      for (const leaf of level.leaves) collideLeaf(leaf);

      for (const th of level.thorns) {
        const d = Math.hypot(star.x - th.x, star.y - th.y);
        if (d < th.r + STAR_R * 0.7) {
          flash = 0.55;
          shake = 8;
          burst(star.x, star.y, "#f9a8d4", 18, 3);
          mode = "aim";
          resetStar();
          tipTimer = 90;
          return;
        }
      }

      for (const portal of level.portals) {
        if (level.portalUsed) break;
        const da = Math.hypot(star.x - portal.ax, star.y - portal.ay);
        if (da < portal.r) {
          level.portalUsed = true;
          star.x = portal.bx;
          star.y = portal.by;
          star.vx *= 0.85;
          star.vy = Math.min(star.vy, -2.5);
          flash = 0.4;
          shake = 6;
          burst(portal.ax, portal.ay, "#c4b5fd", 16, 3);
          burst(portal.bx, portal.by, "#a5f3fc", 16, 3);
        }
      }

      for (const light of level.lights) {
        if (light.taken) continue;
        if (Math.hypot(star.x - light.x, star.y - light.y) < 18) {
          light.taken = true;
          lights += 1;
          totalLights += 1;
          lightsEl.textContent = String(lights);
          burst(light.x, light.y, "#fde68a", 16, 2.8);
        }
      }

      const fl = level.flower;
      if (Math.hypot(star.x - fl.x, star.y - fl.y) < fl.r + STAR_R * 0.4) {
        mode = "win";
        winBurst = 1;
        shake = 10;
        flash = 0.7;
        burst(fl.x, fl.y, "#a5f3fc", 28, 4);
        burst(fl.x, fl.y, "#fde68a", 18, 3);
        winTitle.textContent =
          levelIndex >= LEVELS.length - 1 ? "Garden complete" : "Bloom!";
        winBody.textContent =
          levelIndex >= LEVELS.length - 1
            ? `You gathered ${totalLights} lights across Starfall Garden.`
            : `+${lights} light${lights === 1 ? "" : "s"} · ${level.name}`;
        nextBtn.textContent =
          levelIndex >= LEVELS.length - 1 ? "Play again" : "Next garden";
        winCard.hidden = false;
        levelCard.hidden = true;
      }

      // Soft fail — drifted away
      if (star.y > H + 40 || star.y < -80) {
        mode = "aim";
        resetStar();
        tipTimer = 70;
      }

      // Settle if nearly stopped far from flower
      const speed = Math.hypot(star.vx, star.vy);
      if (speed < 0.35 && star.y > H * 0.55) {
        // let it keep falling slowly via gravity — if grounded-ish on leaf already bounced
      }
    }

    if (mode === "win" && winBurst > 0) {
      winBurst *= 0.98;
      if (Math.random() < 0.35) {
        burst(
          level.flower.x + (Math.random() - 0.5) * 40,
          level.flower.y + (Math.random() - 0.5) * 40,
          Math.random() > 0.5 ? "#fde68a" : "#f9a8d4",
          4,
          1.5,
        );
      }
    }
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1e1548");
    g.addColorStop(0.45, "#24185a");
    g.addColorStop(1, "#120c2b");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Nebula blobs (parallax-ish with time)
    const blobs = [
      { x: 80, y: 120, r: 90, c: "rgba(124, 58, 237, 0.18)" },
      { x: 280, y: 200, r: 110, c: "rgba(45, 212, 191, 0.1)" },
      { x: 160, y: 420, r: 120, c: "rgba(244, 114, 182, 0.1)" },
    ];
    for (const b of blobs) {
      const ox = Math.sin(time * 0.004 + b.x) * 8;
      const oy = Math.cos(time * 0.003 + b.y) * 6;
      const rg = ctx.createRadialGradient(
        b.x + ox,
        b.y + oy,
        10,
        b.x + ox,
        b.y + oy,
        b.r,
      );
      rg.addColorStop(0, b.c);
      rg.addColorStop(1, "transparent");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(b.x + ox, b.y + oy, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Distant leaf silhouettes
    ctx.save();
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 5; i += 1) {
      const x = 40 + i * 70 + Math.sin(time * 0.002 + i) * 10;
      const y = 80 + (i % 3) * 160;
      drawLeafShape(x, y, 70, 18, -0.4 + i * 0.2, "#6ee7b7");
    }
    ctx.restore();

    for (const p of pollen) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(253, 230, 138, ${p.a})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawLeafShape(x, y, w, h, angle, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-w * 0.35, 0);
    ctx.quadraticCurveTo(0, -h * 0.2, w * 0.35, 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawLeaf(leaf) {
    const pulse = 0.85 + Math.sin(time * 0.05 + leaf.x) * 0.08;
    ctx.save();
    ctx.translate(leaf.x, leaf.y);
    ctx.rotate(leaf.angle);
    // Glow
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, leaf.w * 0.55);
    glow.addColorStop(0, "rgba(110, 231, 183, 0.35)");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(-leaf.w, -leaf.h * 3, leaf.w * 2, leaf.h * 6);

    ctx.fillStyle = `rgba(52, 211, 153, ${pulse})`;
    ctx.beginPath();
    ctx.roundRect(-leaf.w / 2, -leaf.h / 2, leaf.w, leaf.h, 10);
    ctx.fill();
    ctx.fillStyle = "rgba(167, 243, 208, 0.55)";
    ctx.beginPath();
    ctx.roundRect(-leaf.w / 2 + 3, -leaf.h / 2 + 2, leaf.w - 6, leaf.h * 0.35, 6);
    ctx.fill();
    ctx.restore();
  }

  function drawThorn(th) {
    ctx.save();
    ctx.translate(th.x, th.y);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, th.r * 1.4);
    g.addColorStop(0, "rgba(249, 168, 212, 0.45)");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, th.r * 1.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#db2777";
    ctx.beginPath();
    for (let i = 0; i < 5; i += 1) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      const r = i % 2 === 0 ? th.r : th.r * 0.55;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPortal(portal) {
    for (const [x, y, hue] of [
      [portal.ax, portal.ay, "#c4b5fd"],
      [portal.bx, portal.by, "#a5f3fc"],
    ]) {
      ctx.save();
      ctx.translate(x, y);
      const spin = time * 0.04;
      for (let i = 0; i < 3; i += 1) {
        ctx.strokeStyle = hue;
        ctx.globalAlpha = 0.35 + i * 0.2;
        ctx.lineWidth = 3 - i;
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          portal.r - i * 3,
          portal.r * 0.55 - i,
          spin + i,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = hue;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Soft link
    ctx.strokeStyle = "rgba(196, 181, 253, 0.2)";
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(portal.ax, portal.ay);
    ctx.lineTo(portal.bx, portal.by);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawFlower(fl) {
    const pulse = 1 + Math.sin(time * 0.06) * 0.06;
    ctx.save();
    ctx.translate(fl.x, fl.y);
    ctx.scale(pulse, pulse);
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, fl.r * 1.8);
    glow.addColorStop(0, "rgba(165, 243, 252, 0.55)");
    glow.addColorStop(0.5, "rgba(249, 168, 212, 0.2)");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, fl.r * 1.8, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + time * 0.01;
      ctx.fillStyle = i % 2 === 0 ? "#f9a8d4" : "#c4b5fd";
      ctx.beginPath();
      ctx.ellipse(
        Math.cos(a) * fl.r * 0.45,
        Math.sin(a) * fl.r * 0.45,
        fl.r * 0.38,
        fl.r * 0.22,
        a,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.arc(0, 0, fl.r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(-3, -3, fl.r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLight(light) {
    if (light.taken) return;
    const bob = Math.sin(time * 0.08 + light.x) * 3;
    ctx.save();
    ctx.translate(light.x, light.y + bob);
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 14);
    g.addColorStop(0, "rgba(253, 230, 138, 0.9)");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fef9c3";
    ctx.beginPath();
    for (let i = 0; i < 4; i += 1) {
      const a = -Math.PI / 2 + (i * Math.PI) / 2;
      const r = i % 2 === 0 ? 7 : 3;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawStar() {
    // Trail
    for (let i = star.trail.length - 1; i >= 0; i -= 1) {
      const t = star.trail[i];
      ctx.beginPath();
      ctx.fillStyle = `rgba(253, 230, 138, ${t.a * 0.35})`;
      ctx.arc(t.x, t.y, STAR_R * (0.3 + t.a * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(star.x, star.y);
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, STAR_R * 2.4);
    glow.addColorStop(0, "rgba(253, 230, 138, 0.7)");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, STAR_R * 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(time * 0.03 + star.vx * 0.05);
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? STAR_R : STAR_R * 0.45;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(-2, -2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawAim() {
    if (!aiming && mode === "aim") {
      // Idle pulse ring
      ctx.beginPath();
      ctx.strokeStyle = "rgba(253, 230, 138, 0.35)";
      ctx.lineWidth = 2;
      ctx.arc(
        star.x,
        star.y,
        STAR_R + 10 + Math.sin(time * 0.08) * 3,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      return;
    }
    if (!aiming) return;

    let dx = star.x - pull.x;
    let dy = star.y - pull.y;
    let len = Math.hypot(dx, dy);
    if (len < 1) return;
    if (len > MAX_PULL) {
      dx = (dx / len) * MAX_PULL;
      dy = (dy / len) * MAX_PULL;
      len = MAX_PULL;
    }
    const ax = star.x - dx;
    const ay = star.y - dy;

    // Rubber band
    ctx.strokeStyle = "rgba(249, 168, 212, 0.7)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(star.x - 12, star.y);
    ctx.lineTo(ax, ay);
    ctx.lineTo(star.x + 12, star.y);
    ctx.stroke();

    // Aim dots
    const nx = dx / len;
    const ny = dy / len;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (let i = 1; i <= 6; i += 1) {
      const t = i / 6;
      const px = star.x + nx * len * 0.55 * t * 2.2;
      const py =
        star.y +
        ny * len * 0.55 * t * 2.2 +
        0.5 * G * (t * 14) * (t * 14);
      ctx.beginPath();
      ctx.arc(px, py, 2.5 - t, 0, Math.PI * 2);
      ctx.fill();
    }

    // Power arc
    ctx.strokeStyle = `rgba(253, 230, 138, ${0.4 + (len / MAX_PULL) * 0.5})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(star.x, star.y, 28, -Math.PI * 0.8, -Math.PI * 0.8 + (len / MAX_PULL) * Math.PI * 1.6);
    ctx.stroke();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawLaunchPad() {
    if (!level) return;
    const s = level.start;
    ctx.save();
    ctx.translate(s.x, s.y + 18);
    ctx.fillStyle = "rgba(196, 181, 253, 0.25)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(253, 230, 138, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, -8);
    ctx.lineTo(0, 4);
    ctx.lineTo(16, -8);
    ctx.stroke();
    ctx.restore();
  }

  function render() {
    ctx.save();
    if (shake > 0.4) {
      ctx.translate(
        (Math.random() - 0.5) * shake,
        (Math.random() - 0.5) * shake,
      );
    }
    drawBackground();

    if (level) {
      drawLaunchPad();
      for (const portal of level.portals) drawPortal(portal);
      for (const leaf of level.leaves) drawLeaf(leaf);
      for (const th of level.thorns) drawThorn(th);
      for (const light of level.lights) drawLight(light);
      drawFlower(level.flower);
      if (mode === "aim" || mode === "fly" || mode === "win") {
        drawAim();
        drawStar();
      }
    }

    drawParticles();

    if (flash > 0.05) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flash * 0.25})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();

    // Title idle scene
    if (mode === "title") {
      // soft floating star for ambience
      const sx = W * 0.5 + Math.sin(time * 0.02) * 20;
      const sy = H * 0.42 + Math.cos(time * 0.015) * 12;
      ctx.save();
      ctx.translate(sx, sy);
      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 40);
      glow.addColorStop(0, "rgba(253, 230, 138, 0.55)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(32, now - last);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  spawnPollen();
  requestAnimationFrame(frame);
})();
