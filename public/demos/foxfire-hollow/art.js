/* Foxfire Hollow — painted art layer.
 *
 * Everything is drawn with canvas 2D: no image assets, no external fonts.
 * Static art (parallax strips, level terrain) is baked once into offscreen
 * canvases so the per-frame cost stays tiny even on phones.
 */
(() => {
  "use strict";

  const TILE = 32;

  /* ------------------------------------------------------------- utilities */

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function surface(w, h) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /** Seamless 1-D wave: only integer frequencies, so it wraps at `width`. */
  function wave(x, width, freqs) {
    let v = 0;
    for (const [f, amp, phase] of freqs) {
      v += Math.sin((x / width) * Math.PI * 2 * f + phase) * amp;
    }
    return v;
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  /* ------------------------------------------------------------- palettes */

  const PALETTES = {
    moss: {
      name: "Mossveil Woods",
      sky: ["#8fd0f0", "#bfe6f4", "#ffdcae", "#ffb289"],
      sunPos: [0.74, 0.26],
      sunCore: "#fff6d2",
      sunGlow: "rgba(255,205,130,0.55)",
      far: "#7ba6b6",
      farMist: "rgba(214,236,244,0.85)",
      mid: "#3f6f57",
      midDeep: "#2c5140",
      near: "#16281d",
      rockDeep: "#33261f",
      rockMid: "#6a4c3b",
      rockLight: "#8d6a50",
      rockEdge: "#c19a72",
      capDark: "#2c6b45",
      cap: "#48945c",
      capLight: "#84cb7c",
      blade: "#a9e37d",
      bloomA: "#ffd6e6",
      bloomB: "#fff3b0",
      haze: "#cfe8f2",
      lightTint: "rgba(255,214,150,0.12)",
      rayColor: "rgba(255,228,168,0.16)",
      motes: "rgba(255,244,204,0.9)",
      moteKind: "pollen",
      fogTop: "rgba(20,34,26,0.0)",
      fogBot: "rgba(18,32,24,0.42)",
      gloom: ["#2a1b3a", "#4c2c63"],
      vignette: "rgba(28,22,34,0.42)",
      hud: "#2b3b2f",
    },
    cavern: {
      name: "Emberstone Caverns",
      sky: ["#150d20", "#20132f", "#381c3c", "#5a2436"],
      sunPos: [0.5, 0.9],
      sunCore: "#ff9a4d",
      sunGlow: "rgba(255,110,40,0.35)",
      far: "#241634",
      farMist: "rgba(80,44,96,0.55)",
      mid: "#301c42",
      midDeep: "#22132f",
      near: "#140b1c",
      rockDeep: "#150c1e",
      rockMid: "#3a2440",
      rockLight: "#55355f",
      rockEdge: "#96609e",
      capDark: "#2a1740",
      cap: "#4a2a63",
      capLight: "#7f4f9c",
      blade: "#6fe6ff",
      bloomA: "#7ef0ff",
      bloomB: "#ffb066",
      haze: "#2c1b3c",
      lightTint: "rgba(255,120,60,0.14)",
      rayColor: "rgba(255,140,70,0.10)",
      motes: "rgba(255,170,90,0.95)",
      moteKind: "ember",
      fogTop: "rgba(12,6,18,0.0)",
      fogBot: "rgba(10,5,16,0.6)",
      gloom: ["#3a0f18", "#8a1f22"],
      vignette: "rgba(10,6,16,0.62)",
      hud: "#2a1636",
    },
    sky: {
      name: "Skyroot Canopy",
      sky: ["#3d2b70", "#8a4a92", "#e97a86", "#ffc887"],
      sunPos: [0.28, 0.62],
      sunCore: "#fff1c8",
      sunGlow: "rgba(255,168,110,0.5)",
      far: "#8f6ba6",
      farMist: "rgba(255,205,190,0.7)",
      mid: "#5c4276",
      midDeep: "#452f5c",
      near: "#1a1029",
      rockDeep: "#3a2720",
      rockMid: "#7a5a44",
      rockLight: "#a8815d",
      rockEdge: "#e2bb8c",
      capDark: "#2c7a5c",
      cap: "#43a077",
      capLight: "#84d8a4",
      blade: "#c6f2b4",
      bloomA: "#ffd0e0",
      bloomB: "#fff0b8",
      haze: "#f0a48c",
      lightTint: "rgba(255,170,120,0.18)",
      rayColor: "rgba(255,196,140,0.14)",
      motes: "rgba(255,226,196,0.95)",
      moteKind: "leaf",
      fogTop: "rgba(38,20,48,0.0)",
      fogBot: "rgba(34,17,44,0.42)",
      gloom: ["#241436", "#4a2660"],
      vignette: "rgba(24,14,32,0.5)",
      hud: "#3a2450",
    },
  };

  /* --------------------------------------------------------- sky + layers */

  function paintSky(ctx, biome, w, h, camY) {
    const p = PALETTES[biome];
    const g = ctx.createLinearGradient(0, -h * 0.15, 0, h * 1.05);
    g.addColorStop(0, p.sky[0]);
    g.addColorStop(0.42, p.sky[1]);
    g.addColorStop(0.78, p.sky[2]);
    g.addColorStop(1, p.sky[3]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // sun / core glow
    const sx = w * p.sunPos[0];
    const sy = h * p.sunPos[1] + camY * 0.02;
    const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(w, h) * 0.55);
    rg.addColorStop(0, p.sunGlow);
    rg.addColorStop(0.25, p.sunGlow.replace(/[\d.]+\)$/, "0.18)"));
    rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const core = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.min(w, h) * 0.12);
    core.addColorStop(0, p.sunCore);
    core.addColorStop(0.5, p.sunGlow);
    core.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(sx, sy, Math.min(w, h) * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Distant ridge line / cloud sea / cave wall — tileable strip. */
  function bakeFar(biome) {
    const W = 1024;
    const H = 460;
    const c = surface(W, H);
    const ctx = c.getContext("2d");
    const p = PALETTES[biome];
    const rnd = mulberry32(1337);

    if (biome === "sky") {
      // a sea of sunset clouds
      for (let layer = 0; layer < 4; layer++) {
        const base = 150 + layer * 62;
        const alpha = 0.24 + layer * 0.14;
        const tone = ["#ffd6c4", "#ffc0ae", "#f5a79c", "#e28f90"][layer];
        ctx.fillStyle = tone;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 6) {
          const y =
            base +
            wave(x, W, [
              [1, 26, layer],
              [2, 14, layer * 2],
              [4, 7, layer * 3],
            ]);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
        // puffy tops
        for (let i = 0; i < 26; i++) {
          const x = rnd() * W;
          const y =
            base +
            wave(x, W, [
              [1, 26, layer],
              [2, 14, layer * 2],
              [4, 7, layer * 3],
            ]);
          const r = 12 + rnd() * 26;
          ctx.beginPath();
          ctx.arc(x, y + r * 0.35, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      return c;
    }

    if (biome === "cavern") {
      // far cave wall with stalactites and stalagmites
      ctx.fillStyle = p.far;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let x = 0; x <= W; x += 4) {
        const y = 120 + wave(x, W, [[3, 34, 0.4], [7, 16, 1.2], [13, 7, 2.4]]);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, 0);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 34; i++) {
        const x = (i / 34) * W + rnd() * 18;
        const top = 120 + wave(x, W, [[3, 34, 0.4], [7, 16, 1.2], [13, 7, 2.4]]);
        const len = 40 + rnd() * 120;
        const wdt = 10 + rnd() * 20;
        ctx.beginPath();
        ctx.moveTo(x - wdt, top - 2);
        ctx.lineTo(x + wdt, top - 2);
        ctx.lineTo(x + rnd() * 6 - 3, top + len);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = p.far;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 4) {
        const y = H - 90 - wave(x, W, [[2, 40, 1.9], [5, 18, 0.3], [11, 8, 2.1]]);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 28; i++) {
        const x = (i / 28) * W + rnd() * 20;
        const base = H - 90 - wave(x, W, [[2, 40, 1.9], [5, 18, 0.3], [11, 8, 2.1]]);
        const len = 40 + rnd() * 110;
        const wdt = 12 + rnd() * 22;
        ctx.beginPath();
        ctx.moveTo(x - wdt, base + 2);
        ctx.lineTo(x + wdt, base + 2);
        ctx.lineTo(x + rnd() * 6 - 3, base - len);
        ctx.closePath();
        ctx.fill();
      }
      // glowing veins
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 26; i++) {
        const x = rnd() * W;
        const y = 150 + rnd() * (H - 260);
        const r = 24 + rnd() * 46;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rnd() > 0.5 ? "rgba(255,120,50,0.22)" : "rgba(110,220,255,0.16)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.globalCompositeOperation = "source-over";
      return c;
    }

    // moss: layered hills + a distant treeline
    for (let layer = 0; layer < 3; layer++) {
      const base = 210 + layer * 46;
      ctx.fillStyle = ["#a9cdd8", "#89b3c2", "#6c98ab"][layer];
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 5) {
        const y =
          base -
          Math.abs(
            wave(x, W, [
              [1 + layer, 60 - layer * 12, layer * 1.7],
              [3 + layer, 22, layer * 0.6],
              [7, 9, layer],
            ]),
          );
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    }
    // treeline silhouette
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "#5c8a72";
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 3) {
      const jitter = Math.sin(x * 0.32) * 6 + Math.sin(x * 0.11) * 10;
      const y = 300 + wave(x, W, [[2, 24, 0.8], [5, 12, 2.2]]) + jitter;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    return c;
  }

  /** Mid-distance trees / pillars / roots — tileable strip. */
  function bakeMid(biome) {
    const W = 1024;
    const H = 520;
    const c = surface(W, H);
    const ctx = c.getContext("2d");
    const p = PALETTES[biome];
    const rnd = mulberry32(9021);

    const trunk = (x, w, top, colA, colB) => {
      const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
      g.addColorStop(0, colB);
      g.addColorStop(0.45, colA);
      g.addColorStop(1, colB);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - w, H);
      ctx.quadraticCurveTo(x - w * 0.72, (H + top) / 2, x - w * 0.5, top);
      ctx.lineTo(x + w * 0.5, top);
      ctx.quadraticCurveTo(x + w * 0.72, (H + top) / 2, x + w, H);
      ctx.closePath();
      ctx.fill();
    };

    if (biome === "cavern") {
      for (let i = 0; i < 9; i++) {
        const x = (i + 0.5) * (W / 9) + (rnd() - 0.5) * 40;
        const w = 26 + rnd() * 40;
        trunk(x, w, 40 + rnd() * 80, p.mid, p.midDeep);
      }
      // crystal clusters catching light
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 22; i++) {
        const x = rnd() * W;
        const y = H - 40 - rnd() * 220;
        const h = 30 + rnd() * 70;
        const w = 8 + rnd() * 14;
        const cyan = rnd() > 0.45;
        const g = ctx.createLinearGradient(x, y, x, y + h);
        g.addColorStop(0, cyan ? "rgba(140,240,255,0.55)" : "rgba(255,150,80,0.5)");
        g.addColorStop(1, "rgba(60,30,80,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x - w, y + h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      return c;
    }

    const leafColor = biome === "sky" ? ["#4b8f76", "#3b7460"] : ["#3f7a5f", "#2f5f4a"];
    for (let i = 0; i < 6; i++) {
      const x = (i + 0.5) * (W / 6) + (rnd() - 0.5) * 70;
      const w = 16 + rnd() * 22;
      const top = 96 + rnd() * 74;
      trunk(x, w, top, biome === "sky" ? "#6d5040" : "#4a3a2e", biome === "sky" ? "#4a3729" : "#33271f");
      // canopy blobs — small enough to leave sky between the crowns
      const blobs = 6 + Math.floor(rnd() * 4);
      for (let b = 0; b < blobs; b++) {
        const bx = x + (rnd() - 0.5) * 210;
        const by = top - 34 + (rnd() - 0.5) * 96;
        const br = 26 + rnd() * 40;
        const g = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.4, br * 0.1, bx, by, br);
        g.addColorStop(0, leafColor[0]);
        g.addColorStop(1, leafColor[1]);
        ctx.fillStyle = g;
        ctx.globalAlpha = 0.94;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // hanging vines
    ctx.strokeStyle = biome === "sky" ? "rgba(120,190,150,0.6)" : "rgba(90,150,110,0.55)";
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 18; i++) {
      const x = rnd() * W;
      const y = 150 + rnd() * 120;
      const len = 26 + rnd() * 62;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + (rnd() - 0.5) * 30, y + len * 0.6, x + (rnd() - 0.5) * 24, y + len);
      ctx.stroke();
    }
    return c;
  }

  /** Foreground silhouette band drawn over gameplay — tileable strip. */
  function bakeNear(biome) {
    const W = 1024;
    const H = 240;
    const c = surface(W, H);
    const ctx = c.getContext("2d");
    const p = PALETTES[biome];
    const rnd = mulberry32(4242);

    ctx.fillStyle = p.near;
    if (biome === "cavern") {
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 4) {
        const y = H - 40 - Math.abs(wave(x, W, [[2, 46, 0.5], [5, 22, 1.8], [11, 9, 0.2]]));
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
      return c;
    }

    // ferns and grass tufts
    for (let i = 0; i < 150; i++) {
      const x = rnd() * W;
      const h = 50 + rnd() * 120;
      const lean = (rnd() - 0.5) * 54;
      ctx.beginPath();
      ctx.moveTo(x - 9, H);
      ctx.quadraticCurveTo(x + lean * 0.4, H - h * 0.6, x + lean, H - h);
      ctx.quadraticCurveTo(x + lean * 0.5 + 7, H - h * 0.55, x + 11, H);
      ctx.closePath();
      ctx.fill();
    }
    // a few small fern fronds poking above the tufts
    for (let i = 0; i < 22; i++) {
      const x = rnd() * W;
      const y = H - 30 - rnd() * 60;
      const r = 18 + rnd() * 26;
      const rot = (rnd() - 0.5) * 1.1;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(r * 0.42, -r * 0.7, 0, -r * 1.4);
      ctx.quadraticCurveTo(-r * 0.42, -r * 0.7, 0, 0);
      ctx.fill();
      ctx.restore();
    }
    return c;
  }

  /** Aerial perspective: distant layers wash toward the sky colour. */
  function haze(c, color, strength) {
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, c.height);
    g.addColorStop(0, hexA(color, strength * 0.75));
    g.addColorStop(0.6, hexA(color, strength));
    g.addColorStop(1, hexA(color, strength * 1.25));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
    return c;
  }

  function hexA(hex, a) {
    const v = parseInt(hex.slice(1), 16);
    return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${Math.min(1, a).toFixed(3)})`;
  }

  const bgCache = new Map();
  function backgrounds(biome) {
    if (!bgCache.has(biome)) {
      const p = PALETTES[biome];
      bgCache.set(biome, {
        far: haze(bakeFar(biome), p.haze, 0.5),
        mid: haze(bakeMid(biome), p.haze, 0.12),
        near: bakeNear(biome),
      });
    }
    return bgCache.get(biome);
  }

  /** Drop the baked strips so they get rebuilt (after a lost canvas context). */
  function forgetBackgrounds() {
    for (const set of bgCache.values()) {
      for (const c of Object.values(set)) {
        c.width = 0;
        c.height = 0;
      }
    }
    bgCache.clear();
  }

  /* -------------------------------------------------------------- terrain */

  function bakeTerrain(level, biome) {
    const T = window.FoxfireLevels.T;
    const p = PALETTES[biome];
    const { w, h, tiles } = level;
    const c = surface(w * TILE, h * TILE);
    const ctx = c.getContext("2d");
    const rnd = mulberry32(0x5eed ^ (w * 31 + h));

    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? (y >= h ? T.SOLID : T.EMPTY) : tiles[y * w + x]);
    const solid = (x, y) => {
      const v = at(x, y);
      return v === T.SOLID || v === T.CRUMBLE;
    };
    const depthAbove = (x, y) => {
      let d = 0;
      while (d < 6 && solid(x, y - 1 - d)) d++;
      return d;
    };

    // 1) soft drop shadow under the whole silhouette.
    // Built as one quarter-size mask and blitted back once: a blurred fillRect
    // per tile costs thousands of GPU filter passes and locks up phones.
    const S = 4;
    const mask = surface(Math.ceil((w * TILE) / S), Math.ceil((h * TILE) / S));
    const mctx = mask.getContext("2d");
    mctx.fillStyle = "#000";
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (solid(x, y)) mctx.fillRect((x * TILE) / S, (y * TILE) / S, TILE / S, TILE / S);
      }
    }
    ctx.save();
    ctx.globalAlpha = 0.34;
    if (typeof ctx.filter === "string") ctx.filter = "blur(3px)";
    ctx.drawImage(mask, -3, 5, w * TILE, h * TILE);
    ctx.restore();
    mask.width = 0;
    mask.height = 0;

    // 2) rock body
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = at(x, y);
        if (v !== T.SOLID && v !== T.CRUMBLE) continue;
        const px = x * TILE;
        const py = y * TILE;
        const d = depthAbove(x, y);
        const openTop = !solid(x, y - 1);
        const openL = !solid(x - 1, y);
        const openR = !solid(x + 1, y);
        const openB = !solid(x, y + 1);

        const g = ctx.createLinearGradient(px, py, px, py + TILE);
        const t0 = Math.min(1, d / 3.2);
        g.addColorStop(0, d === 0 ? p.rockLight : mixHex(p.rockLight, p.rockDeep, t0));
        g.addColorStop(1, mixHex(p.rockMid, p.rockDeep, Math.min(1, t0 + 0.5)));
        ctx.fillStyle = g;

        const r = 7;
        const rTL = openTop && openL ? r : 0;
        const rTR = openTop && openR ? r : 0;
        const rBR = openB && openR ? r : 0;
        const rBL = openB && openL ? r : 0;
        ctx.beginPath();
        ctx.moveTo(px + rTL, py);
        ctx.lineTo(px + TILE - rTR, py);
        if (rTR) ctx.quadraticCurveTo(px + TILE, py, px + TILE, py + rTR);
        ctx.lineTo(px + TILE, py + TILE - rBR);
        if (rBR) ctx.quadraticCurveTo(px + TILE, py + TILE, px + TILE - rBR, py + TILE);
        ctx.lineTo(px + rBL, py + TILE);
        if (rBL) ctx.quadraticCurveTo(px, py + TILE, px, py + TILE - rBL);
        ctx.lineTo(px, py + rTL);
        if (rTL) ctx.quadraticCurveTo(px, py, px + rTL, py);
        ctx.closePath();
        ctx.fill();

        // speckle + strata
        ctx.save();
        ctx.clip();
        for (let i = 0; i < 12; i++) {
          const sx = px + rnd() * TILE;
          const sy = py + rnd() * TILE;
          const sr = 0.6 + rnd() * 2.1;
          ctx.fillStyle = rnd() > 0.5 ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.10)";
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI * 2);
          ctx.fill();
        }
        if ((y + (x % 2)) % 3 === 0) {
          ctx.strokeStyle = "rgba(0,0,0,0.10)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(px - 2, py + 8 + rnd() * 12);
          ctx.bezierCurveTo(
            px + TILE * 0.35,
            py + 6 + rnd() * 14,
            px + TILE * 0.7,
            py + 10 + rnd() * 12,
            px + TILE + 2,
            py + 9 + rnd() * 12,
          );
          ctx.stroke();
        }
        // inner shading
        if (!openTop) {
          const sg = ctx.createLinearGradient(px, py, px, py + 10);
          sg.addColorStop(0, "rgba(0,0,0,0.22)");
          sg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = sg;
          ctx.fillRect(px, py, TILE, 10);
        }
        if (openL) {
          const lg = ctx.createLinearGradient(px, 0, px + 9, 0);
          lg.addColorStop(0, "rgba(255,255,255,0.16)");
          lg.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = lg;
          ctx.fillRect(px, py, 9, TILE);
        }
        if (openR) {
          const rg2 = ctx.createLinearGradient(px + TILE - 9, 0, px + TILE, 0);
          rg2.addColorStop(0, "rgba(0,0,0,0)");
          rg2.addColorStop(1, "rgba(0,0,0,0.26)");
          ctx.fillStyle = rg2;
          ctx.fillRect(px + TILE - 9, py, 9, TILE);
        }
        if (openB) {
          const bg = ctx.createLinearGradient(px, py + TILE - 10, px, py + TILE);
          bg.addColorStop(0, "rgba(0,0,0,0)");
          bg.addColorStop(1, "rgba(0,0,0,0.3)");
          ctx.fillStyle = bg;
          ctx.fillRect(px, py + TILE - 10, TILE, 10);
        }
        ctx.restore();
      }
    }

    // 2b) buried boulders — only where the whole 3x3 neighbourhood is rock, so
    // the shapes never spill past the silhouette and the mass stops reading flat
    const brnd = mulberry32(0xb01de2 ^ w);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        if (!solid(x, y) || depthAbove(x, y) < 2) continue;
        let walled = true;
        for (let dy = -1; dy <= 1 && walled; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if (!solid(x + dx, y + dy)) {
              walled = false;
              break;
            }
        if (!walled || (x * 7 + y * 13) % 5 !== 0) continue;
        const cx = x * TILE + TILE / 2 + (brnd() - 0.5) * 10;
        const cy = y * TILE + TILE / 2 + (brnd() - 0.5) * 10;
        const rx = TILE * (0.5 + brnd() * 0.42);
        const ry = rx * (0.62 + brnd() * 0.3);
        const rot = (brnd() - 0.5) * 1.2;
        const bg = ctx.createLinearGradient(cx, cy - ry, cx, cy + ry);
        bg.addColorStop(0, hexA(p.rockLight, 0.22));
        bg.addColorStop(0.55, hexA(p.rockMid, 0.16));
        bg.addColorStop(1, "rgba(0,0,0,0.22)");
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.16)";
        ctx.lineWidth = 1.4;
        ctx.stroke();
        // a crack running off the boulder
        if (brnd() > 0.45) {
          ctx.strokeStyle = "rgba(0,0,0,0.2)";
          ctx.lineWidth = 1 + brnd();
          ctx.beginPath();
          ctx.moveTo(cx + rx * 0.4, cy);
          ctx.lineTo(cx + rx * 0.9, cy + ry * 0.5);
          ctx.lineTo(cx + rx * 1.3, cy + ry * 0.2);
          ctx.stroke();
        }
      }
    }

    // 3) surface dressing: moss caps, blades, crystals, roots
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!solid(x, y) || solid(x, y - 1)) continue;
        const px = x * TILE;
        const py = y * TILE;
        drawCap(ctx, biome, p, px, py, rnd, solid(x - 1, y - 1));
      }
    }

    // hanging roots / drips under overhangs
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!solid(x, y) || solid(x, y + 1)) continue;
        if (rnd() > 0.42) continue;
        const px = x * TILE + rnd() * TILE;
        const py = y * TILE + TILE;
        const len = 10 + rnd() * 34;
        ctx.strokeStyle =
          biome === "cavern" ? "rgba(150,90,170,0.5)" : biome === "sky" ? "rgba(120,90,70,0.55)" : "rgba(80,60,44,0.6)";
        ctx.lineWidth = 1.6 + rnd() * 1.6;
        ctx.beginPath();
        ctx.moveTo(px, py - 2);
        ctx.quadraticCurveTo(px + (rnd() - 0.5) * 10, py + len * 0.6, px + (rnd() - 0.5) * 12, py + len);
        ctx.stroke();
        if (biome !== "cavern" && rnd() > 0.5) {
          ctx.fillStyle = p.cap;
          ctx.beginPath();
          ctx.ellipse(px + 1, py + len, 3.5, 5.5, 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 4) one-way platforms (living wood / vine bridges)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (at(x, y) !== T.ONEWAY) continue;
        const px = x * TILE;
        const py = y * TILE;
        const left = at(x - 1, y) !== T.ONEWAY;
        const right = at(x + 1, y) !== T.ONEWAY;
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.35)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        const g = ctx.createLinearGradient(0, py, 0, py + 14);
        g.addColorStop(0, biome === "cavern" ? "#6b4a7a" : "#9a7350");
        g.addColorStop(1, biome === "cavern" ? "#3b2547" : "#5f452f");
        ctx.fillStyle = g;
        roundRect(ctx, px - (left ? 2 : 0), py, TILE + (left ? 2 : 0) + (right ? 2 : 0), 13, 5);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(px, py + 1.5, TILE, 2);
        // mossy fringe
        ctx.fillStyle = p.cap;
        for (let i = 0; i < 5; i++) {
          const bx = px + 3 + i * 6 + rnd() * 3;
          ctx.beginPath();
          ctx.ellipse(bx, py + 1, 4.5, 3.2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = biome === "cavern" ? "rgba(150,110,180,0.5)" : "rgba(110,150,100,0.55)";
        ctx.lineWidth = 1.4;
        if ((x + y) % 2 === 0) {
          ctx.beginPath();
          ctx.moveTo(px + TILE * 0.5, py + 12);
          ctx.quadraticCurveTo(px + TILE * 0.5 + 6, py + 24, px + TILE * 0.5 - 3, py + 32);
          ctx.stroke();
        }
      }
    }

    // 5) thorns
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (at(x, y) !== T.THORN) continue;
        const down = solid(x, y - 1) && !solid(x, y + 1);
        drawThorns(ctx, p, x * TILE, y * TILE, down, rnd);
      }
    }

    return c;
  }

  function drawCap(ctx, biome, p, px, py, rnd, capL) {
    const capH = 11 + rnd() * 3;
    const g = ctx.createLinearGradient(0, py - 3, 0, py + capH + 4);
    g.addColorStop(0, p.capLight);
    g.addColorStop(0.5, p.cap);
    g.addColorStop(1, p.capDark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(px - (capL ? 1 : 0), py + capH + 5);
    let cx = px;
    const steps = 4;
    ctx.lineTo(px, py + 2);
    for (let i = 0; i < steps; i++) {
      const x0 = px + (i * TILE) / steps;
      const x1 = px + ((i + 1) * TILE) / steps;
      ctx.quadraticCurveTo((x0 + x1) / 2, py - 3 - rnd() * 4, x1, py + 1 + rnd() * 2);
      cx = x1;
    }
    ctx.lineTo(cx, py + capH + 5);
    ctx.closePath();
    ctx.fill();

    // top highlight
    ctx.fillStyle = "rgba(255,255,255,0.20)";
    ctx.fillRect(px, py - 0.5, TILE, 2);

    if (biome === "cavern") {
      // glowing crystal shards
      const n = rnd() > 0.6 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const x = px + 5 + rnd() * (TILE - 10);
        const hgt = 8 + rnd() * 18;
        const wdt = 2.5 + rnd() * 3.5;
        const cyan = rnd() > 0.4;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const gg = ctx.createRadialGradient(x, py - hgt * 0.4, 0, x, py - hgt * 0.4, hgt * 1.6);
        gg.addColorStop(0, cyan ? "rgba(120,235,255,0.5)" : "rgba(255,150,70,0.45)");
        gg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gg;
        ctx.fillRect(x - hgt * 1.6, py - hgt * 2, hgt * 3.2, hgt * 3.2);
        ctx.restore();
        const cg = ctx.createLinearGradient(x, py - hgt, x, py + 2);
        cg.addColorStop(0, cyan ? "#d6fbff" : "#ffdcb0");
        cg.addColorStop(1, cyan ? "#3aa9d6" : "#c8622a");
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.moveTo(x, py - hgt);
        ctx.lineTo(x + wdt, py + 2);
        ctx.lineTo(x - wdt, py + 2);
        ctx.closePath();
        ctx.fill();
      }
      // lichen speckles
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = "rgba(110,230,200,0.30)";
        ctx.beginPath();
        ctx.arc(px + rnd() * TILE, py + 2 + rnd() * 8, 1 + rnd() * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    // grass blades
    for (let i = 0; i < 9; i++) {
      const x = px + rnd() * TILE;
      const hgt = 7 + rnd() * 15;
      const lean = (rnd() - 0.5) * 11;
      ctx.strokeStyle = rnd() > 0.5 ? p.blade : p.capLight;
      ctx.lineWidth = 1.3 + rnd() * 1.1;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, py + 4);
      ctx.quadraticCurveTo(x + lean * 0.4, py - hgt * 0.55, x + lean, py - hgt);
      ctx.stroke();
    }
    // occasional flower / mushroom / fern
    const roll = rnd();
    if (roll > 0.86) {
      const x = px + 6 + rnd() * (TILE - 12);
      const y = py - 9 - rnd() * 6;
      ctx.fillStyle = rnd() > 0.5 ? p.bloomA : p.bloomB;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * 3.4, y + Math.sin(a) * 3.4, 2.6, 2.1, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffe89a";
      ctx.beginPath();
      ctx.arc(x, y, 1.9, 0, Math.PI * 2);
      ctx.fill();
    } else if (roll > 0.78) {
      const x = px + 8 + rnd() * (TILE - 16);
      ctx.fillStyle = "#f6e7d2";
      ctx.fillRect(x - 1.6, py - 8, 3.2, 9);
      ctx.fillStyle = "#e8746b";
      ctx.beginPath();
      ctx.ellipse(x, py - 8, 6.5, 4.6, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.arc(x - 2, py - 9.5, 1.1, 0, Math.PI * 2);
      ctx.arc(x + 2.4, py - 8.6, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawThorns(ctx, p, px, py, hangDown, rnd) {
    const n = 4;
    const dir = hangDown ? -1 : 1;
    const baseY = hangDown ? py : py + TILE;
    // a bruised red halo so thorns never read as friendly scenery
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const halo = ctx.createLinearGradient(0, baseY, 0, baseY - dir * TILE);
    halo.addColorStop(0, "rgba(255,60,90,0.22)");
    halo.addColorStop(1, "rgba(255,60,90,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(px - 2, Math.min(baseY, baseY - dir * TILE), TILE + 4, TILE);
    ctx.restore();
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 6;
    for (let i = 0; i < n; i++) {
      const x = px + (i + 0.5) * (TILE / n);
      const hgt = (TILE - 6) * (0.72 + rnd() * 0.28);
      const wdt = TILE / n / 2 - 0.5;
      const g = ctx.createLinearGradient(x, baseY, x, baseY - dir * hgt);
      g.addColorStop(0, "#2c1f33");
      g.addColorStop(0.55, "#5b3f5f");
      g.addColorStop(1, "#e7d9ef");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - wdt, baseY);
      ctx.lineTo(x + wdt, baseY);
      ctx.quadraticCurveTo(x + wdt * 0.3, baseY - dir * hgt * 0.6, x, baseY - dir * hgt);
      ctx.quadraticCurveTo(x - wdt * 0.3, baseY - dir * hgt * 0.6, x - wdt, baseY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // knotted vine base
    const g2 = ctx.createLinearGradient(0, baseY - dir * 6, 0, baseY);
    g2.addColorStop(0, "#3b2a40");
    g2.addColorStop(1, "#1d1424");
    ctx.fillStyle = g2;
    ctx.fillRect(px, hangDown ? py : py + TILE - 7, TILE, 7);
  }

  function mixHex(a, b, t) {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, t));
    const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, t));
    const bl = Math.round(lerp(pa & 255, pb & 255, t));
    return `rgb(${r},${g},${bl})`;
  }

  /* ------------------------------------------------------------------ fox */

  const SKINS = [
    { id: "ember", name: "Ember", fur: "#ff8c4a", furDark: "#e2612c", belly: "#fff1dd", scarf: "#3fd1c0", glow: "#ffb45c", cost: 0 },
    { id: "frost", name: "Frostkit", fur: "#79c8ff", furDark: "#4a95d8", belly: "#f0faff", scarf: "#ff9ecf", glow: "#a8e8ff", cost: 60 },
    { id: "moss", name: "Fernling", fur: "#86c96f", furDark: "#5d9c4e", belly: "#f4ffe8", scarf: "#ffd166", glow: "#c4f08a", cost: 130 },
    { id: "dusk", name: "Duskpaw", fur: "#a98cff", furDark: "#7b5fd6", belly: "#f2ecff", scarf: "#ffb3c8", glow: "#cbb4ff", cost: 220 },
    { id: "gold", name: "Sunspark", fur: "#ffcf5c", furDark: "#e0a12c", belly: "#fff8e0", scarf: "#ff6b8b", glow: "#fff0a8", cost: 0, petals: 10 },
  ];

  /**
   * Draws the fox. `f` carries pose state; the origin is the feet centre.
   * Scarf and tail points are simulated in game.js and passed in world space.
   */
  function drawFox(ctx, f, skin) {
    const s = skin || SKINS[0];
    const dir = f.facing;
    const sq = f.squash || 1;
    const st = 2 - sq;

    ctx.save();
    ctx.translate(f.x, f.y);

    // --- scarf tail (behind everything)
    if (f.scarf && f.scarf.length > 1) {
      ctx.save();
      ctx.translate(-f.x, -f.y);
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        ctx.moveTo(f.scarf[0].x, f.scarf[0].y);
        for (let i = 1; i < f.scarf.length - 1; i++) {
          const a = f.scarf[i];
          const b = f.scarf[i + 1];
          ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
        }
        ctx.strokeStyle = pass === 0 ? "rgba(0,0,0,0.20)" : s.scarf;
        ctx.lineWidth = pass === 0 ? 9 : 7;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      }
      // frayed tip
      const last = f.scarf[f.scarf.length - 1];
      const prev = f.scarf[f.scarf.length - 2];
      const ang = Math.atan2(last.y - prev.y, last.x - prev.x);
      ctx.save();
      ctx.translate(last.x, last.y);
      ctx.rotate(ang);
      ctx.fillStyle = s.scarf;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * 2.4);
        ctx.lineTo(9, i * 4.6);
        ctx.lineTo(0, i * 2.4 + 2.2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      ctx.restore();
    }

    ctx.scale(dir, 1);

    // --- tail (fluffy, ember tipped)
    const tailWag = Math.sin(f.animT * 9) * 0.18 + (f.vy || 0) * -0.0006;
    ctx.save();
    ctx.translate(-9, -17 * sq);
    ctx.rotate(-0.5 + tailWag - Math.min(0.5, Math.abs(f.vx || 0) * 0.0016));
    const tg = ctx.createLinearGradient(0, 2, -30, -14);
    tg.addColorStop(0, s.furDark);
    tg.addColorStop(0.5, s.fur);
    tg.addColorStop(1, s.belly);
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(3, 6);
    ctx.bezierCurveTo(-12, 14, -30, 4, -33, -16);
    ctx.bezierCurveTo(-27, -5, -17, -2, -2, -8);
    ctx.closePath();
    ctx.fill();
    // fur notches + cream tip
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.moveTo(-17, -1);
    ctx.quadraticCurveTo(-27, -5, -31, -14);
    ctx.quadraticCurveTo(-23, -7, -14, -5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // --- legs
    const run = f.grounded && Math.abs(f.vx) > 12 ? 1 : 0;
    const phase = f.animT * 15;
    const legs = [
      { x: -6, off: 0 },
      { x: 5, off: Math.PI },
    ];
    for (const L of legs) {
      const swing = run ? Math.sin(phase + L.off) * 4.4 : f.grounded ? 0 : -1.6;
      const lift = run ? Math.max(0, Math.cos(phase + L.off)) * 3.2 : f.grounded ? 0 : 2.4;
      ctx.fillStyle = s.furDark;
      roundRect(ctx, L.x - 3 + swing, -9 * sq - lift, 6.4, 10 + lift, 3);
      ctx.fill();
      ctx.fillStyle = "#5b3a2c";
      roundRect(ctx, L.x - 3.4 + swing, -2.4 - lift * 0.4, 7.2, 3.4, 1.8);
      ctx.fill();
    }

    // --- body
    const bodyG = ctx.createLinearGradient(0, -30 * sq, 0, -2);
    bodyG.addColorStop(0, s.fur);
    bodyG.addColorStop(0.7, s.fur);
    bodyG.addColorStop(1, s.furDark);
    ctx.fillStyle = bodyG;
    ctx.beginPath();
    ctx.ellipse(-1, -14 * sq, 11.5 * st, 11 * sq, -0.12 * dir, 0, Math.PI * 2);
    ctx.fill();
    // belly
    ctx.fillStyle = s.belly;
    ctx.beginPath();
    ctx.ellipse(1.5, -10 * sq, 7 * st, 6.6 * sq, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // --- head
    const headY = -26 * sq;
    const headX = 4;
    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate((f.headTilt || 0) * 0.6);

    // ears
    for (const e of [
      { x: -6.5, r: -0.5 },
      { x: 4.5, r: 0.24 },
    ]) {
      ctx.save();
      ctx.translate(e.x, -6);
      ctx.rotate(e.r + (f.earBack ? -0.5 * Math.sign(e.r || 1) : 0) + Math.sin(f.animT * 3 + e.x) * 0.05);
      ctx.fillStyle = s.fur;
      ctx.beginPath();
      ctx.moveTo(-4.6, 3);
      ctx.quadraticCurveTo(-2.4, -10.5, 3.4, -8.4);
      ctx.quadraticCurveTo(3.6, -1, 4.4, 3.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffc9c2";
      ctx.beginPath();
      ctx.moveTo(-1.6, 1.6);
      ctx.quadraticCurveTo(-0.6, -6.4, 2.2, -5.6);
      ctx.quadraticCurveTo(2.2, -1.2, 2.6, 1.8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // cheek fluff + skull
    const headG = ctx.createRadialGradient(-2, -4, 1, 0, 0, 14);
    headG.addColorStop(0, s.fur);
    headG.addColorStop(1, s.furDark);
    ctx.fillStyle = headG;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10.4, 9.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // fluffy cheek notches
    ctx.fillStyle = s.belly;
    ctx.beginPath();
    ctx.moveTo(-9, 1.5);
    ctx.quadraticCurveTo(-12.5, 3.5, -8.5, 6);
    ctx.quadraticCurveTo(-6.5, 3.5, -6, 1.8);
    ctx.closePath();
    ctx.fill();

    // snout
    ctx.fillStyle = s.belly;
    ctx.beginPath();
    ctx.moveTo(3, -1.5);
    ctx.quadraticCurveTo(13.5, -0.5, 13.2, 3.4);
    ctx.quadraticCurveTo(10, 7, 3.5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#3a2430";
    ctx.beginPath();
    ctx.ellipse(13.1, 2.6, 2.1, 1.7, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // eye
    const blink = f.blink > 0;
    if (blink) {
      ctx.strokeStyle = "#3a2430";
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(2.4, -1.6);
      ctx.lineTo(7.4, -1.6);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#fffaf2";
      ctx.beginPath();
      ctx.ellipse(5, -2, 3.5, f.squint ? 2 : 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2b1f2e";
      ctx.beginPath();
      ctx.ellipse(5.8 + (f.eyeDx || 0), -1.6, 2.1, f.squint ? 1.5 : 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath();
      ctx.arc(6.6, -3, 1.05, 0, Math.PI * 2);
      ctx.fill();
    }
    // brow
    ctx.strokeStyle = s.furDark;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(1.6, -6.6);
    ctx.quadraticCurveTo(5, -8.4, 8.4, -6.2);
    ctx.stroke();
    ctx.restore();

    // --- scarf knot at the neck
    ctx.fillStyle = s.scarf;
    roundRect(ctx, -5.5, -24 * sq, 12, 6.5, 3);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    roundRect(ctx, -5.5, -24 * sq + 4.4, 12, 2.1, 1);
    ctx.fill();

    ctx.restore();
  }

  /** Small ember flame used for the dash charge indicator and pickups. */
  function drawEmber(ctx, x, y, r, t, hueA, hueB) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(r)) return;
    if (!Number.isFinite(t)) t = 0;
    ctx.save();
    ctx.translate(x, y);
    const flick = 1 + Math.sin(t * 9) * 0.08 + Math.sin(t * 23) * 0.04;
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 3.2 * flick);
    g.addColorStop(0, hueA);
    g.addColorStop(0.32, hueB);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 3.2 * flick, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#fffdf4";
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.7 * flick);
    ctx.quadraticCurveTo(r * 0.95, -r * 0.2, 0, r * 1.05);
    ctx.quadraticCurveTo(-r * 0.95, -r * 0.2, 0, -r * 1.7 * flick);
    ctx.fill();
    ctx.restore();
  }

  window.FoxfireArt = {
    TILE,
    PALETTES,
    SKINS,
    mulberry32,
    surface,
    roundRect,
    paintSky,
    backgrounds,
    forgetBackgrounds,
    bakeTerrain,
    drawFox,
    drawEmber,
    mixHex,
  };
})();
