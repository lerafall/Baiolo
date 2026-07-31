/* Crimson Path — painted art layer.
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
      name: "Sunny Glade",
      sky: ["#6ec8e8", "#a8dff2", "#ffe4b8", "#ffcc7a"],
      sunPos: [0.72, 0.22],
      sunCore: "#fff8d8",
      sunGlow: "rgba(255,215,140,0.55)",
      far: "#7ab0a6",
      farMist: "rgba(220,240,230,0.85)",
      mid: "#3d7856",
      midDeep: "#2a5438",
      near: "#152818",
      rockDeep: "#3a2a1e",
      rockMid: "#7a5c40",
      rockLight: "#a08060",
      rockEdge: "#c8a878",
      capDark: "#2e7840",
      cap: "#4ca860",
      capLight: "#8cd080",
      blade: "#b0e878",
      bloomA: "#ffd4e0",
      bloomB: "#fff8a8",
      haze: "#d0f0e0",
      lightTint: "rgba(255,220,150,0.10)",
      rayColor: "rgba(255,230,170,0.14)",
      motes: "rgba(255,248,200,0.9)",
      moteKind: "pollen",
      fogTop: "rgba(20,36,24,0.0)",
      fogBot: "rgba(18,32,20,0.38)",
      gloom: ["#2a1820", "#4c2838"],
      vignette: "rgba(28,20,12,0.38)",
      hud: "#2e4030",
    },
    cavern: {
      name: "Dark Thicket",
      sky: ["#0c1418", "#141e28", "#1a3028", "#223820"],
      sunPos: [0.5, 0.85],
      sunCore: "#88ccaa",
      sunGlow: "rgba(100,200,150,0.30)",
      far: "#162820",
      farMist: "rgba(60,100,80,0.5)",
      mid: "#1e3828",
      midDeep: "#142418",
      near: "#0c1810",
      rockDeep: "#1a1410",
      rockMid: "#3a3028",
      rockLight: "#504838",
      rockEdge: "#786850",
      capDark: "#1a4030",
      cap: "#2a6040",
      capLight: "#48a060",
      blade: "#60e880",
      bloomA: "#80f0c0",
      bloomB: "#c0a0ff",
      haze: "#1a2820",
      lightTint: "rgba(120,200,160,0.08)",
      rayColor: "rgba(140,220,180,0.08)",
      motes: "rgba(150,255,180,0.9)",
      moteKind: "firefly",
      fogTop: "rgba(8,18,12,0.0)",
      fogBot: "rgba(6,14,8,0.55)",
      gloom: ["#1a0818", "#400830"],
      vignette: "rgba(8,14,10,0.55)",
      hud: "#1a2c20",
    },
    sky: {
      name: "Cottage Lane",
      sky: ["#4a2860", "#a05080", "#e88070", "#ffc878"],
      sunPos: [0.3, 0.58],
      sunCore: "#fff4c8",
      sunGlow: "rgba(255,180,100,0.5)",
      far: "#906898",
      farMist: "rgba(255,200,180,0.65)",
      mid: "#604060",
      midDeep: "#483050",
      near: "#1a1020",
      rockDeep: "#3a2820",
      rockMid: "#785840",
      rockLight: "#a88058",
      rockEdge: "#d8b880",
      capDark: "#2a7850",
      cap: "#40a870",
      capLight: "#80d89c",
      blade: "#c0f0b0",
      bloomA: "#ffc8d8",
      bloomB: "#fff0b0",
      haze: "#e8a080",
      lightTint: "rgba(255,170,110,0.14)",
      rayColor: "rgba(255,200,140,0.12)",
      motes: "rgba(255,220,190,0.9)",
      moteKind: "leaf",
      fogTop: "rgba(36,20,40,0.0)",
      fogBot: "rgba(30,16,36,0.40)",
      gloom: ["#201020", "#482040"],
      vignette: "rgba(20,12,24,0.45)",
      hud: "#382040",
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

  function bakeFar(biome) {
    const W = 1024;
    const H = 460;
    const c = surface(W, H);
    const ctx = c.getContext("2d");
    const p = PALETTES[biome];
    const rnd = mulberry32(1337);

    if (biome === "sky") {
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
      // Dark Thicket — dense canopy with moonlight shafts
      ctx.fillStyle = p.far;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let x = 0; x <= W; x += 4) {
        const y = 100 + wave(x, W, [[3, 30, 0.4], [7, 14, 1.2], [13, 6, 2.4]]);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, 0);
      ctx.closePath();
      ctx.fill();
      // dense tree silhouettes
      for (let i = 0; i < 30; i++) {
        const x = (i / 30) * W + rnd() * 18;
        const top = 100 + wave(x, W, [[3, 30, 0.4], [7, 14, 1.2], [13, 6, 2.4]]);
        const len = 40 + rnd() * 140;
        const wdt = 14 + rnd() * 24;
        ctx.beginPath();
        ctx.moveTo(x - wdt * 0.3, top - 2);
        ctx.lineTo(x + wdt * 0.3, top - 2);
        ctx.lineTo(x + rnd() * 4 - 2, top + len);
        ctx.closePath();
        ctx.fill();
      }
      // moonlight shafts
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 18; i++) {
        const x = rnd() * W;
        const y = 130 + rnd() * (H - 200);
        const r = 20 + rnd() * 40;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "rgba(140,230,200,0.14)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.globalCompositeOperation = "source-over";
      return c;
    }

    // moss (Sunny Glade): bright morning forest hills
    for (let layer = 0; layer < 3; layer++) {
      const base = 210 + layer * 46;
      ctx.fillStyle = ["#a8d8c0", "#88c0a8", "#68a890"][layer];
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
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "#508868";
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
      // Dark Thicket — gnarled trunks
      for (let i = 0; i < 9; i++) {
        const x = (i + 0.5) * (W / 9) + (rnd() - 0.5) * 40;
        const w = 22 + rnd() * 36;
        trunk(x, w, 50 + rnd() * 90, p.mid, p.midDeep);
      }
      // firefly spots
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 16; i++) {
        const x = rnd() * W;
        const y = H - 60 - rnd() * 240;
        const r = 18 + rnd() * 30;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "rgba(120,255,180,0.25)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.globalCompositeOperation = "source-over";
      return c;
    }

    const leafColor = biome === "sky" ? ["#4a9070", "#3a7858"] : ["#408860", "#306848"];
    for (let i = 0; i < 6; i++) {
      const x = (i + 0.5) * (W / 6) + (rnd() - 0.5) * 70;
      const w = 16 + rnd() * 22;
      const top = 96 + rnd() * 74;
      trunk(x, w, top, biome === "sky" ? "#6d5040" : "#4a3a2e", biome === "sky" ? "#4a3729" : "#33271f");
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
    const T = window.CrimsonLevels.T;
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

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!solid(x, y) || solid(x, y - 1)) continue;
        const px = x * TILE;
        const py = y * TILE;
        drawCap(ctx, biome, p, px, py, rnd, solid(x - 1, y - 1));
      }
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!solid(x, y) || solid(x, y + 1)) continue;
        if (rnd() > 0.42) continue;
        const px = x * TILE + rnd() * TILE;
        const py = y * TILE + TILE;
        const len = 10 + rnd() * 34;
        ctx.strokeStyle =
          biome === "cavern" ? "rgba(80,140,100,0.5)" : biome === "sky" ? "rgba(120,90,70,0.55)" : "rgba(80,60,44,0.6)";
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
        g.addColorStop(0, biome === "cavern" ? "#4a6050" : "#9a7350");
        g.addColorStop(1, biome === "cavern" ? "#283830" : "#5f452f");
        ctx.fillStyle = g;
        roundRect(ctx, px - (left ? 2 : 0), py, TILE + (left ? 2 : 0) + (right ? 2 : 0), 13, 5);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(px, py + 1.5, TILE, 2);
        ctx.fillStyle = p.cap;
        for (let i = 0; i < 5; i++) {
          const bx = px + 3 + i * 6 + rnd() * 3;
          ctx.beginPath();
          ctx.ellipse(bx, py + 1, 4.5, 3.2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = biome === "cavern" ? "rgba(100,180,140,0.5)" : "rgba(110,150,100,0.55)";
        ctx.lineWidth = 1.4;
        if ((x + y) % 2 === 0) {
          ctx.beginPath();
          ctx.moveTo(px + TILE * 0.5, py + 12);
          ctx.quadraticCurveTo(px + TILE * 0.5 + 6, py + 24, px + TILE * 0.5 - 3, py + 32);
          ctx.stroke();
        }
      }
    }

    // brambles (thorns)
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

    ctx.fillStyle = "rgba(255,255,255,0.20)";
    ctx.fillRect(px, py - 0.5, TILE, 2);

    if (biome === "cavern") {
      // glowing mushroom accents
      const n = rnd() > 0.6 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const x = px + 5 + rnd() * (TILE - 10);
        const hgt = 6 + rnd() * 12;
        ctx.fillStyle = "#f2e2cf";
        ctx.fillRect(x - 1.5, py - hgt + 2, 3, hgt);
        const cg = ctx.createLinearGradient(x, py - hgt - 6, x, py - hgt + 2);
        cg.addColorStop(0, "rgba(120,255,180,0.7)");
        cg.addColorStop(1, "rgba(40,120,80,0.3)");
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.ellipse(x, py - hgt + 2, 7, 5, 0, Math.PI, 0);
        ctx.fill();
      }
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = "rgba(110,230,180,0.30)";
        ctx.beginPath();
        ctx.arc(px + rnd() * TILE, py + 2 + rnd() * 8, 1 + rnd() * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

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
      ctx.fillStyle = "#e87060";
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
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const halo = ctx.createLinearGradient(0, baseY, 0, baseY - dir * TILE);
    halo.addColorStop(0, "rgba(180,60,40,0.22)");
    halo.addColorStop(1, "rgba(180,60,40,0)");
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
      g.addColorStop(0, "#2a1810");
      g.addColorStop(0.55, "#5a3020");
      g.addColorStop(1, "#804020");
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
    const g2 = ctx.createLinearGradient(0, baseY - dir * 6, 0, baseY);
    g2.addColorStop(0, "#3a2010");
    g2.addColorStop(1, "#1a0c04");
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

  /* -------------------------------------------------- Red Riding Hood hero */

  const SKINS = [
    { id: "crimson", name: "Crimson", cloak: "#cc2222", cloakDark: "#8a1414", dress: "#ffe8d0", hood: "#e03030", glow: "#ff6040", cost: 0 },
    { id: "rose", name: "Rose", cloak: "#e88090", cloakDark: "#c06070", dress: "#fff0f0", hood: "#f0a0b0", glow: "#ffc0d0", cost: 60 },
    { id: "midnight", name: "Midnight", cloak: "#2a3878", cloakDark: "#1a2450", dress: "#e8e8ff", hood: "#3848a0", glow: "#8090e0", cost: 130 },
    { id: "meadow", name: "Meadow", cloak: "#3a8848", cloakDark: "#286030", dress: "#f0ffe8", hood: "#48a858", glow: "#90e080", cost: 220 },
    { id: "goldstitch", name: "Goldstitch", cloak: "#c89020", cloakDark: "#a07010", dress: "#fff8e0", hood: "#e0a830", glow: "#ffe080", cost: 0, petals: 10 },
  ];

  /**
   * Draws Red Riding Hood. `f` carries pose state; origin is feet centre.
   * Cloak trail points simulated in game.js and passed in world space.
   */
  function drawRed(ctx, f, skin) {
    const s = skin || SKINS[0];
    const dir = f.facing;
    const sq = f.squash || 1;
    const st = 2 - sq;

    ctx.save();
    ctx.translate(f.x, f.y);

    // --- cloak trail (behind everything)
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
        ctx.strokeStyle = pass === 0 ? "rgba(0,0,0,0.20)" : s.cloak;
        ctx.lineWidth = pass === 0 ? 10 : 8;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      }
      const last = f.scarf[f.scarf.length - 1];
      const prev = f.scarf[f.scarf.length - 2];
      const ang = Math.atan2(last.y - prev.y, last.x - prev.x);
      ctx.save();
      ctx.translate(last.x, last.y);
      ctx.rotate(ang);
      ctx.fillStyle = s.cloak;
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

    // --- legs
    const run = f.grounded && Math.abs(f.vx) > 12 ? 1 : 0;
    const phase = f.animT * 15;
    const legs = [
      { x: -4, off: 0 },
      { x: 4, off: Math.PI },
    ];
    for (const L of legs) {
      const swing = run ? Math.sin(phase + L.off) * 4 : f.grounded ? 0 : -1.4;
      const lift = run ? Math.max(0, Math.cos(phase + L.off)) * 3 : f.grounded ? 0 : 2;
      ctx.fillStyle = "#6a5040";
      roundRect(ctx, L.x - 2.5 + swing, -8 * sq - lift, 5, 9 + lift, 2.5);
      ctx.fill();
      // shoes
      ctx.fillStyle = "#4a3020";
      roundRect(ctx, L.x - 3 + swing, -2.5 - lift * 0.4, 6, 3, 1.5);
      ctx.fill();
    }

    // --- dress / body
    const bodyG = ctx.createLinearGradient(0, -28 * sq, 0, -6);
    bodyG.addColorStop(0, s.dress);
    bodyG.addColorStop(1, "#e0c8b0");
    ctx.fillStyle = bodyG;
    ctx.beginPath();
    ctx.ellipse(0, -14 * sq, 9 * st, 10 * sq, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- cloak body (over dress)
    const cloakG = ctx.createLinearGradient(0, -28 * sq, 0, -4);
    cloakG.addColorStop(0, s.cloak);
    cloakG.addColorStop(1, s.cloakDark);
    ctx.fillStyle = cloakG;
    ctx.beginPath();
    ctx.moveTo(-8 * st, -8 * sq);
    ctx.quadraticCurveTo(-10 * st, -20 * sq, -3 * st, -26 * sq);
    ctx.lineTo(6 * st, -26 * sq);
    ctx.quadraticCurveTo(10 * st, -20 * sq, 9 * st, -8 * sq);
    ctx.quadraticCurveTo(6, -4 * sq, -6, -4 * sq);
    ctx.closePath();
    ctx.fill();

    // --- basket on arm (facing side)
    ctx.save();
    ctx.translate(7, -12 * sq);
    const basketBob = run ? Math.sin(phase * 0.8) * 1.5 : 0;
    ctx.translate(0, basketBob);
    ctx.fillStyle = "#a07840";
    roundRect(ctx, -5, -4, 10, 8, 3);
    ctx.fill();
    ctx.strokeStyle = "#805828";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -4, 5, Math.PI, 0);
    ctx.stroke();
    // cloth on top
    ctx.fillStyle = "#fff0e0";
    ctx.beginPath();
    ctx.ellipse(0, -4, 4.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- head
    const headY = -24 * sq;
    const headX = 2;
    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate((f.headTilt || 0) * 0.5);

    // hood
    const hoodG = ctx.createRadialGradient(0, -2, 2, 0, 0, 14);
    hoodG.addColorStop(0, s.hood);
    hoodG.addColorStop(1, s.cloakDark);
    ctx.fillStyle = hoodG;
    ctx.beginPath();
    ctx.ellipse(0, -2, 11, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // hood point on top
    ctx.fillStyle = s.hood;
    ctx.beginPath();
    ctx.moveTo(-3, -10);
    ctx.quadraticCurveTo(0, -16 - Math.sin(f.animT * 3) * 1.5, 4, -10);
    ctx.closePath();
    ctx.fill();

    // face (peeking from hood)
    ctx.fillStyle = "#ffe0c8";
    ctx.beginPath();
    ctx.ellipse(3, 1, 7, 7.5, 0.05, 0, Math.PI * 2);
    ctx.fill();

    // hair strands
    ctx.fillStyle = "#5a3020";
    ctx.beginPath();
    ctx.ellipse(7, -2, 3, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // eye
    const blink = f.blink > 0;
    if (blink) {
      ctx.strokeStyle = "#3a2018";
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(3, 0);
      ctx.lineTo(7.5, 0);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#fffaf0";
      ctx.beginPath();
      ctx.ellipse(5.5, -0.5, 3, f.squint ? 1.8 : 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2a1810";
      ctx.beginPath();
      ctx.ellipse(6.2 + (f.eyeDx || 0), 0, 1.8, f.squint ? 1.3 : 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath();
      ctx.arc(7, -1.4, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }

    // rosy cheek
    ctx.fillStyle = "rgba(255,140,120,0.35)";
    ctx.beginPath();
    ctx.ellipse(7.5, 3, 2.5, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // small smile
    ctx.strokeStyle = "#804030";
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(6, 3.5, 2.5, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.restore();

    ctx.restore();
  }

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

  window.CrimsonArt = {
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
    drawRed,
    drawEmber,
    mixHex,
  };
})();
