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

  function mixHex(a, b, t) {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, t));
    const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, t));
    const bl = Math.round(lerp(pa & 255, pb & 255, t));
    return `rgb(${r},${g},${bl})`;
  }

  function hexA(hex, a) {
    const v = parseInt(hex.slice(1), 16);
    return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${Math.min(1, a).toFixed(3)})`;
  }

  /* ------------------------------------------------------------- palettes */

  const PALETTES = {
    moss: {
      name: "Sunny Glade",
      sky: ["#e8f4ff", "#fdf6e0", "#fff0c0", "#ffe8a0"],
      sunPos: [0.72, 0.22],
      sunCore: "#fffde8",
      sunGlow: "rgba(255,230,140,0.55)",
      far: "#c8e8b8",
      farMist: "rgba(248,255,240,0.80)",
      mid: "#5a9848",
      midDeep: "#3a7030",
      near: "#1a3010",
      rockDeep: "#5a3a18",
      rockMid: "#9a7040",
      rockLight: "#c8a060",
      rockEdge: "#e0c888",
      capDark: "#3a8030",
      cap: "#58b848",
      capLight: "#90e070",
      blade: "#b8f078",
      bloomA: "#ff6060",
      bloomB: "#ffe040",
      haze: "#e8f8d8",
      lightTint: "rgba(255,240,150,0.10)",
      rayColor: "rgba(255,235,170,0.14)",
      motes: "rgba(255,248,200,0.9)",
      moteKind: "pollen",
      fogTop: "rgba(20,40,12,0.0)",
      fogBot: "rgba(18,36,10,0.30)",
      gloom: ["#2a1820", "#4c2838"],
      vignette: "rgba(28,20,12,0.32)",
      hud: "#2e4030",
    },
    cavern: {
      name: "Dark Thicket",
      sky: ["#080c14", "#0c1820", "#102418", "#182c20"],
      sunPos: [0.5, 0.18],
      sunCore: "#e8eeff",
      sunGlow: "rgba(180,200,255,0.30)",
      far: "#0c1a10",
      farMist: "rgba(30,60,40,0.5)",
      mid: "#1a2818",
      midDeep: "#101c10",
      near: "#080e08",
      rockDeep: "#1a0c18",
      rockMid: "#3a2038",
      rockLight: "#4a2848",
      rockEdge: "#5a3858",
      capDark: "#1a3828",
      cap: "#285038",
      capLight: "#40a060",
      blade: "#50e870",
      bloomA: "#80f0c0",
      bloomB: "#c0a0ff",
      haze: "#0c1810",
      lightTint: "rgba(100,200,150,0.06)",
      rayColor: "rgba(120,200,160,0.06)",
      motes: "rgba(140,255,170,0.9)",
      moteKind: "firefly",
      fogTop: "rgba(6,12,8,0.0)",
      fogBot: "rgba(4,10,6,0.55)",
      gloom: ["#1a0818", "#400830"],
      vignette: "rgba(4,8,4,0.55)",
      hud: "#1a2c20",
    },
    sky: {
      name: "Cottage Lane",
      sky: ["#382050", "#884868", "#e87858", "#ffc060"],
      sunPos: [0.3, 0.55],
      sunCore: "#fff8d0",
      sunGlow: "rgba(255,180,80,0.50)",
      far: "#a87080",
      farMist: "rgba(255,200,160,0.60)",
      mid: "#684050",
      midDeep: "#483040",
      near: "#201020",
      rockDeep: "#5a2818",
      rockMid: "#985838",
      rockLight: "#c07848",
      rockEdge: "#e0a060",
      capDark: "#286838",
      cap: "#409848",
      capLight: "#70c868",
      blade: "#a8e090",
      bloomA: "#ffc8d8",
      bloomB: "#fff0b0",
      haze: "#c87060",
      lightTint: "rgba(255,160,90,0.12)",
      rayColor: "rgba(255,190,120,0.10)",
      motes: "rgba(255,220,180,0.9)",
      moteKind: "leaf",
      fogTop: "rgba(30,16,30,0.0)",
      fogBot: "rgba(24,12,28,0.38)",
      gloom: ["#201020", "#482040"],
      vignette: "rgba(20,10,20,0.42)",
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

    if (biome === "cavern") {
      // moon disc
      const moonR = Math.min(w, h) * 0.07;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const mg = ctx.createRadialGradient(sx, sy, 0, sx, sy, moonR * 4);
      mg.addColorStop(0, "rgba(180,200,255,0.25)");
      mg.addColorStop(0.3, "rgba(100,140,200,0.10)");
      mg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = mg;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = p.sunCore;
      ctx.beginPath();
      ctx.arc(sx, sy, moonR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.sky[0];
      ctx.beginPath();
      ctx.arc(sx + moonR * 0.3, sy - moonR * 0.2, moonR * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // storybook sun — soft warm circle with radiating short rays
      const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(w, h) * 0.55);
      rg.addColorStop(0, p.sunGlow);
      rg.addColorStop(0.25, p.sunGlow.replace(/[\d.]+\)$/, "0.15)"));
      rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const sunR = Math.min(w, h) * 0.06;
      ctx.fillStyle = p.sunCore;
      ctx.beginPath();
      ctx.arc(sx, sy, sunR, 0, Math.PI * 2);
      ctx.fill();
      // short triangular rays
      ctx.fillStyle = "rgba(255,240,180,0.25)";
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(a) * sunR * 1.1, sy + Math.sin(a) * sunR * 1.1);
        ctx.lineTo(sx + Math.cos(a - 0.08) * sunR * 1.7, sy + Math.sin(a - 0.08) * sunR * 1.7);
        ctx.lineTo(sx + Math.cos(a + 0.08) * sunR * 1.7, sy + Math.sin(a + 0.08) * sunR * 1.7);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* ---- Far background layer */

  function bakeFar(biome) {
    const W = 1024;
    const H = 460;
    const c = surface(W, H);
    const ctx = c.getContext("2d");
    const p = PALETTES[biome];
    const rnd = mulberry32(1337);

    if (biome === "moss") {
      // Sunny Glade far: rolling meadow hills + tiny distant cottages + smoke curls
      const hillColors = ["#c8e8b0", "#a0d890", "#80c870"];
      for (let layer = 0; layer < 3; layer++) {
        const base = 260 + layer * 50;
        ctx.fillStyle = hillColors[layer];
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 4) {
          const y = base + wave(x, W, [[1 + layer, 40 - layer * 8, layer * 0.9], [3, 18, layer * 2.1]]);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // tiny cottages on the hills
      for (let i = 0; i < 5; i++) {
        const cx = 80 + i * 200 + rnd() * 60;
        const hillY = 270 + wave(cx, W, [[1, 40, 0], [3, 18, 0]]);
        const cw = 16 + rnd() * 10;
        const ch = 12 + rnd() * 8;
        // wall
        ctx.fillStyle = "#f8f0e0";
        ctx.fillRect(cx - cw / 2, hillY - ch, cw, ch);
        // red roof (triangle)
        ctx.fillStyle = "#c83020";
        ctx.beginPath();
        ctx.moveTo(cx - cw / 2 - 3, hillY - ch);
        ctx.lineTo(cx, hillY - ch - 10 - rnd() * 4);
        ctx.lineTo(cx + cw / 2 + 3, hillY - ch);
        ctx.closePath();
        ctx.fill();
        // chimney
        ctx.fillStyle = "#8a6040";
        ctx.fillRect(cx + cw * 0.2, hillY - ch - 10, 4, 8);
        // smoke curls
        ctx.strokeStyle = "rgba(200,200,200,0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const smokeX = cx + cw * 0.2 + 2;
        const smokeY = hillY - ch - 12;
        ctx.moveTo(smokeX, smokeY);
        ctx.quadraticCurveTo(smokeX + 4, smokeY - 8, smokeX - 2, smokeY - 16);
        ctx.quadraticCurveTo(smokeX + 6, smokeY - 22, smokeX + 1, smokeY - 30);
        ctx.stroke();
        // tiny window
        ctx.fillStyle = "#ffe880";
        ctx.fillRect(cx - 2, hillY - ch + 3, 4, 4);
      }
      return c;
    }

    if (biome === "cavern") {
      // Dark Thicket far: dense black-green canopy silhouette + moon disc + moonbeams
      // canopy mass at top
      ctx.fillStyle = "#081008";
      ctx.fillRect(0, 0, W, 180);
      // jagged canopy edge
      ctx.fillStyle = "#0a1a0c";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 200);
      for (let x = 0; x <= W; x += 6) {
        const y = 140 + wave(x, W, [[5, 30, 0.7], [11, 15, 2.1], [23, 7, 0.3]]) + rnd() * 8;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, 0);
      ctx.closePath();
      ctx.fill();

      // moon glow through canopy gap
      const moonX = W * 0.5;
      const moonY = 80;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const mg = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 120);
      mg.addColorStop(0, "rgba(180,210,255,0.20)");
      mg.addColorStop(0.4, "rgba(100,150,200,0.08)");
      mg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = mg;
      ctx.fillRect(0, 0, W, H);

      // moonbeams shafting down
      for (let i = 0; i < 5; i++) {
        const bx = moonX - 80 + i * 40 + rnd() * 20;
        ctx.fillStyle = "rgba(140,180,220,0.06)";
        ctx.beginPath();
        ctx.moveTo(bx - 3, 160);
        ctx.lineTo(bx + 8, 160);
        ctx.lineTo(bx + 30, H);
        ctx.lineTo(bx - 20, H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // sparse distant tree trunks below canopy
      for (let i = 0; i < 12; i++) {
        const tx = rnd() * W;
        const tw = 4 + rnd() * 8;
        ctx.fillStyle = hexA("#0a1a0c", 0.6 + rnd() * 0.3);
        ctx.fillRect(tx - tw / 2, 180 + rnd() * 40, tw, H - 180);
      }
      return c;
    }

    // sky (Cottage Lane) far: village rooftops + chimneys against peach dusk, warm windows
    // distant hill silhouette
    ctx.fillStyle = "#805868";
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 5) {
      const y = 300 + wave(x, W, [[2, 30, 0.5], [5, 15, 1.2]]);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // village rooftops
    for (let i = 0; i < 8; i++) {
      const bx = i * 130 + rnd() * 40;
      const bw = 40 + rnd() * 50;
      const bh = 50 + rnd() * 60;
      const baseY = 320 + rnd() * 30;
      // wall
      ctx.fillStyle = mixHex("#e8c8a0", "#c8a070", rnd());
      ctx.fillRect(bx, baseY - bh, bw, bh + (H - baseY));
      // roof
      const roofStyle = rnd();
      ctx.fillStyle = roofStyle > 0.5 ? "#8a3828" : "#5a4030";
      ctx.beginPath();
      if (roofStyle > 0.7) {
        // peaked roof
        ctx.moveTo(bx - 4, baseY - bh);
        ctx.lineTo(bx + bw / 2, baseY - bh - 20 - rnd() * 15);
        ctx.lineTo(bx + bw + 4, baseY - bh);
      } else {
        // flat sloped roof
        ctx.moveTo(bx - 3, baseY - bh);
        ctx.lineTo(bx + 3, baseY - bh - 10);
        ctx.lineTo(bx + bw - 3, baseY - bh - 12);
        ctx.lineTo(bx + bw + 3, baseY - bh);
      }
      ctx.closePath();
      ctx.fill();
      // chimney
      if (rnd() > 0.4) {
        const chX = bx + bw * (0.6 + rnd() * 0.3);
        ctx.fillStyle = "#6a4830";
        ctx.fillRect(chX, baseY - bh - 18, 6, 14);
      }
      // warm lit windows
      const winRows = Math.floor(bh / 22);
      const winCols = Math.floor(bw / 18);
      for (let wy = 0; wy < winRows; wy++) {
        for (let wx = 0; wx < winCols; wx++) {
          if (rnd() > 0.6) continue;
          const winX = bx + 8 + wx * 16;
          const winY = baseY - bh + 10 + wy * 20;
          ctx.fillStyle = "rgba(255,220,100,0.7)";
          ctx.fillRect(winX, winY, 6, 8);
        }
      }
    }
    return c;
  }

  /* ---- Mid background layer */

  function bakeMid(biome) {
    const W = 1024;
    const H = 520;
    const c = surface(W, H);
    const ctx = c.getContext("2d");
    const p = PALETTES[biome];
    const rnd = mulberry32(9021);

    if (biome === "moss") {
      // Storybook oak/birch trees with round leafy canopies + distant fence
      for (let i = 0; i < 7; i++) {
        const tx = (i + 0.5) * (W / 7) + (rnd() - 0.5) * 50;
        const trunkW = 10 + rnd() * 12;
        const trunkTop = 140 + rnd() * 80;
        // trunk — warm brown wood
        const tg = ctx.createLinearGradient(tx - trunkW, 0, tx + trunkW, 0);
        tg.addColorStop(0, "#5a3820");
        tg.addColorStop(0.5, "#8a6040");
        tg.addColorStop(1, "#4a2818");
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.moveTo(tx - trunkW * 0.6, H);
        ctx.lineTo(tx - trunkW * 0.4, trunkTop + 20);
        ctx.lineTo(tx + trunkW * 0.4, trunkTop + 20);
        ctx.lineTo(tx + trunkW * 0.6, H);
        ctx.closePath();
        ctx.fill();
        // round leafy canopy (cluster of circles)
        const canopyR = 40 + rnd() * 30;
        const cx = tx;
        const cy = trunkTop;
        const leafShade = ["#3a8830", "#4aa840", "#60c050"];
        for (let b = 0; b < 7; b++) {
          const bx = cx + (rnd() - 0.5) * canopyR * 1.2;
          const by = cy + (rnd() - 0.5) * canopyR * 0.8;
          const br = canopyR * (0.4 + rnd() * 0.35);
          ctx.fillStyle = leafShade[Math.floor(rnd() * 3)];
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fill();
        }
        // highlight blob
        ctx.fillStyle = "rgba(180,240,120,0.25)";
        ctx.beginPath();
        ctx.arc(cx - canopyR * 0.2, cy - canopyR * 0.3, canopyR * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      // distant wooden fence
      ctx.strokeStyle = "#8a6840";
      ctx.lineWidth = 2;
      const fenceY = H - 60;
      ctx.beginPath();
      ctx.moveTo(0, fenceY);
      ctx.lineTo(W, fenceY);
      ctx.stroke();
      for (let x = 20; x < W; x += 28 + rnd() * 10) {
        ctx.fillStyle = "#7a5830";
        ctx.fillRect(x - 2, fenceY - 14, 4, 18);
        ctx.beginPath();
        ctx.arc(x, fenceY - 14, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      return c;
    }

    if (biome === "cavern") {
      // Twisted gnarled trunks, hanging vines, sparse firefly dots
      for (let i = 0; i < 8; i++) {
        const tx = (i + 0.5) * (W / 8) + (rnd() - 0.5) * 40;
        const trunkW = 14 + rnd() * 26;
        const top = 60 + rnd() * 120;
        // gnarled trunk with curve
        const lean = (rnd() - 0.5) * 40;
        ctx.fillStyle = "#1a1410";
        ctx.beginPath();
        ctx.moveTo(tx - trunkW * 0.6, H);
        ctx.quadraticCurveTo(tx + lean - trunkW * 0.3, (H + top) / 2, tx + lean * 0.5 - trunkW * 0.2, top);
        ctx.lineTo(tx + lean * 0.5 + trunkW * 0.2, top);
        ctx.quadraticCurveTo(tx + lean + trunkW * 0.3, (H + top) / 2, tx + trunkW * 0.6, H);
        ctx.closePath();
        ctx.fill();
        // twisted branches at top
        for (let b = 0; b < 3; b++) {
          const bLen = 30 + rnd() * 50;
          const bDir = rnd() > 0.5 ? 1 : -1;
          ctx.strokeStyle = "#1a1410";
          ctx.lineWidth = 3 + rnd() * 4;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(tx + lean * 0.5, top + b * 15);
          ctx.quadraticCurveTo(
            tx + lean * 0.5 + bDir * bLen * 0.6,
            top - 10 + rnd() * 30,
            tx + lean * 0.5 + bDir * bLen,
            top - 20 + rnd() * 40,
          );
          ctx.stroke();
        }
        // hanging vines
        const vineCount = 2 + Math.floor(rnd() * 3);
        for (let v = 0; v < vineCount; v++) {
          const vx = tx + lean * 0.3 + (rnd() - 0.5) * trunkW * 2;
          const vy = top + rnd() * 40;
          const vLen = 40 + rnd() * 80;
          ctx.strokeStyle = "rgba(40,80,40,0.6)";
          ctx.lineWidth = 1.2 + rnd();
          ctx.beginPath();
          ctx.moveTo(vx, vy);
          ctx.quadraticCurveTo(vx + (rnd() - 0.5) * 20, vy + vLen * 0.5, vx + (rnd() - 0.5) * 8, vy + vLen);
          ctx.stroke();
        }
      }
      // sparse firefly dots
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 24; i++) {
        const fx = rnd() * W;
        const fy = 100 + rnd() * (H - 150);
        const fr = 2 + rnd() * 4;
        const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr * 4);
        fg.addColorStop(0, "rgba(120,255,150,0.4)");
        fg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(fx, fy, fr * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      return c;
    }

    // sky (Cottage Lane) mid: orchard trees + garden path posts / stone wall silhouette
    // stone wall base
    ctx.fillStyle = "#584038";
    const wallY = H - 80;
    ctx.fillRect(0, wallY, W, 20);
    // stone pattern on wall
    for (let x = 0; x < W; x += 14 + rnd() * 8) {
      const sw = 10 + rnd() * 8;
      const sh = 7 + rnd() * 5;
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, wallY + 2 + rnd() * 8, sw, sh);
    }

    // orchard trees (smaller, rounder, with fruit)
    for (let i = 0; i < 6; i++) {
      const tx = (i + 0.5) * (W / 6) + (rnd() - 0.5) * 60;
      const trunkW = 6 + rnd() * 6;
      const top = 180 + rnd() * 80;
      // trunk
      ctx.fillStyle = "#5a3828";
      ctx.fillRect(tx - trunkW / 2, top + 20, trunkW, wallY - top - 20);
      // round canopy
      const cr = 30 + rnd() * 20;
      const cg = ctx.createRadialGradient(tx - cr * 0.2, top - cr * 0.1, cr * 0.1, tx, top + 5, cr);
      cg.addColorStop(0, "#508838");
      cg.addColorStop(1, "#305020");
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(tx, top, cr, 0, Math.PI * 2);
      ctx.fill();
      // fruit dots
      for (let f = 0; f < 4; f++) {
        const fx = tx + (rnd() - 0.5) * cr * 1.4;
        const fy = top + (rnd() - 0.5) * cr * 1.0;
        ctx.fillStyle = rnd() > 0.5 ? "#e03030" : "#e08020";
        ctx.beginPath();
        ctx.arc(fx, fy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // garden path posts
    for (let x = 50; x < W; x += 80 + rnd() * 40) {
      ctx.fillStyle = "#6a4830";
      ctx.fillRect(x - 3, wallY - 24, 6, 28);
      // round top
      ctx.beginPath();
      ctx.arc(x, wallY - 24, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    return c;
  }

  /* ---- Near foreground layer */

  function bakeNear(biome) {
    const W = 1024;
    const H = 240;
    const c = surface(W, H);
    const ctx = c.getContext("2d");
    const p = PALETTES[biome];
    const rnd = mulberry32(4242);

    if (biome === "moss") {
      // tall grass blades + wildflower dots in crimson/yellow
      ctx.fillStyle = p.near;
      for (let i = 0; i < 180; i++) {
        const x = rnd() * W;
        const h = 40 + rnd() * 130;
        const lean = (rnd() - 0.5) * 30;
        ctx.strokeStyle = rnd() > 0.3 ? "#2a5018" : "#408028";
        ctx.lineWidth = 2 + rnd() * 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x, H);
        ctx.quadraticCurveTo(x + lean * 0.5, H - h * 0.6, x + lean, H - h);
        ctx.stroke();
      }
      // wildflower dots
      for (let i = 0; i < 30; i++) {
        const x = rnd() * W;
        const y = H - 30 - rnd() * 80;
        ctx.fillStyle = rnd() > 0.5 ? "#e83030" : "#ffe020";
        ctx.beginPath();
        ctx.arc(x, y, 2 + rnd() * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      return c;
    }

    if (biome === "cavern") {
      // thorny bush silhouettes + fern fronds
      // bush mounds
      for (let i = 0; i < 10; i++) {
        const bx = rnd() * W;
        const bw = 50 + rnd() * 80;
        const bh = 30 + rnd() * 40;
        ctx.fillStyle = "#0a0c08";
        ctx.beginPath();
        ctx.ellipse(bx, H - bh * 0.3, bw / 2, bh, 0, Math.PI, 0);
        ctx.fill();
        // thorny spikes on top
        for (let s = 0; s < 6; s++) {
          const sx = bx - bw / 2 + rnd() * bw;
          const sLen = 10 + rnd() * 18;
          ctx.strokeStyle = "#0c1408";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sx, H - bh * 0.3 - (bh - 10) * Math.sin((s / 6) * Math.PI));
          ctx.lineTo(sx + (rnd() - 0.5) * 8, H - bh * 0.3 - bh - sLen);
          ctx.stroke();
        }
      }
      // fern fronds
      for (let i = 0; i < 14; i++) {
        const fx = rnd() * W;
        const fh = 50 + rnd() * 80;
        const lean = (rnd() - 0.5) * 40;
        ctx.strokeStyle = "rgba(20,60,20,0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fx, H);
        ctx.quadraticCurveTo(fx + lean * 0.5, H - fh * 0.6, fx + lean, H - fh);
        ctx.stroke();
        // leaflets
        for (let l = 0; l < 5; l++) {
          const t = (l + 1) / 6;
          const lx = fx + lean * t;
          const ly = H - fh * t;
          const dir = l % 2 === 0 ? 1 : -1;
          ctx.strokeStyle = "rgba(30,80,30,0.6)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx + dir * 12, ly - 5);
          ctx.stroke();
        }
      }
      return c;
    }

    // sky (Cottage Lane) near: fence pickets + hanging laundry / flower boxes
    // picket fence
    const fenceBaseY = H - 30;
    ctx.fillStyle = "#f0e8d8";
    ctx.fillRect(0, fenceBaseY, W, 4);
    ctx.fillRect(0, fenceBaseY + 16, W, 4);
    for (let x = 10; x < W; x += 18 + rnd() * 6) {
      ctx.fillStyle = "#f0e8d8";
      ctx.fillRect(x - 3, fenceBaseY - 10, 6, 40);
      // pointed top
      ctx.beginPath();
      ctx.moveTo(x - 3, fenceBaseY - 10);
      ctx.lineTo(x, fenceBaseY - 16);
      ctx.lineTo(x + 3, fenceBaseY - 10);
      ctx.closePath();
      ctx.fill();
    }
    // flower boxes on some pickets
    for (let x = 50; x < W; x += 100 + rnd() * 80) {
      const boxW = 24;
      ctx.fillStyle = "#8a5030";
      ctx.fillRect(x - boxW / 2, fenceBaseY - 4, boxW, 8);
      // flowers
      for (let f = 0; f < 4; f++) {
        const ffx = x - boxW / 2 + 4 + f * 6;
        const ffy = fenceBaseY - 8 - rnd() * 8;
        ctx.fillStyle = "#30a030";
        ctx.fillRect(ffx, ffy, 1.5, fenceBaseY - 4 - ffy);
        ctx.fillStyle = rnd() > 0.5 ? "#ff5080" : "#ffe040";
        ctx.beginPath();
        ctx.arc(ffx, ffy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // hanging laundry lines
    for (let seg = 0; seg < 2; seg++) {
      const startX = 100 + seg * 500;
      const endX = startX + 200 + rnd() * 100;
      const lineY = H - 160 - rnd() * 30;
      ctx.strokeStyle = "rgba(80,60,40,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX, lineY);
      ctx.lineTo(endX, lineY + 3);
      ctx.stroke();
      // hanging items
      for (let lx = startX + 20; lx < endX - 20; lx += 30 + rnd() * 20) {
        const itemH = 15 + rnd() * 15;
        ctx.fillStyle = rnd() > 0.5 ? "rgba(255,240,220,0.6)" : "rgba(200,100,100,0.5)";
        ctx.fillRect(lx - 5, lineY + 2, 10, itemH);
      }
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

    // soft shadow beneath platforms
    const S = 4;
    const mask = surface(Math.ceil((w * TILE) / S), Math.ceil((h * TILE) / S));
    const mctx = mask.getContext("2d");
    mctx.fillStyle = "#000";
    for (let y2 = 0; y2 < h; y2++) {
      for (let x2 = 0; x2 < w; x2++) {
        if (solid(x2, y2)) mctx.fillRect((x2 * TILE) / S, (y2 * TILE) / S, TILE / S, TILE / S);
      }
    }
    ctx.save();
    ctx.globalAlpha = 0.30;
    if (typeof ctx.filter === "string") ctx.filter = "blur(3px)";
    ctx.drawImage(mask, -3, 5, w * TILE, h * TILE);
    ctx.restore();
    mask.width = 0;
    mask.height = 0;

    for (let y2 = 0; y2 < h; y2++) {
      for (let x2 = 0; x2 < w; x2++) {
        const v = at(x2, y2);
        if (v !== T.SOLID && v !== T.CRUMBLE) continue;
        const px = x2 * TILE;
        const py = y2 * TILE;
        const d = depthAbove(x2, y2);
        const openTop = !solid(x2, y2 - 1);
        const openL = !solid(x2 - 1, y2);
        const openR = !solid(x2 + 1, y2);
        const openB = !solid(x2, y2 + 1);
        const isCrumble = v === T.CRUMBLE;

        if (biome === "moss") {
          drawPlankTile(ctx, px, py, d, openTop, openL, openR, openB, isCrumble, p, rnd);
        } else if (biome === "cavern") {
          drawLogTile(ctx, px, py, d, openTop, openL, openR, openB, isCrumble, p, rnd);
        } else {
          drawCobbleTile(ctx, px, py, d, openTop, openL, openR, openB, isCrumble, p, rnd);
        }
      }
    }

    // draw caps on top surfaces
    for (let y2 = 0; y2 < h; y2++) {
      for (let x2 = 0; x2 < w; x2++) {
        if (!solid(x2, y2) || solid(x2, y2 - 1)) continue;
        const px = x2 * TILE;
        const py = y2 * TILE;
        drawCap(ctx, biome, p, px, py, rnd, solid(x2 - 1, y2 - 1));
      }
    }

    // hanging roots/vines from undersides
    for (let y2 = 0; y2 < h; y2++) {
      for (let x2 = 0; x2 < w; x2++) {
        if (!solid(x2, y2) || solid(x2, y2 + 1)) continue;
        if (rnd() > 0.38) continue;
        const px = x2 * TILE + rnd() * TILE;
        const py = y2 * TILE + TILE;
        const len = 10 + rnd() * 28;
        ctx.strokeStyle =
          biome === "cavern" ? "rgba(40,100,50,0.5)" : biome === "sky" ? "rgba(60,80,50,0.4)" : "rgba(60,40,20,0.5)";
        ctx.lineWidth = 1.4 + rnd() * 1.2;
        ctx.beginPath();
        ctx.moveTo(px, py - 2);
        ctx.quadraticCurveTo(px + (rnd() - 0.5) * 8, py + len * 0.6, px + (rnd() - 0.5) * 10, py + len);
        ctx.stroke();
      }
    }

    // ONEWAY platforms
    for (let y2 = 0; y2 < h; y2++) {
      for (let x2 = 0; x2 < w; x2++) {
        if (at(x2, y2) !== T.ONEWAY) continue;
        const px = x2 * TILE;
        const py = y2 * TILE;
        const left = at(x2 - 1, y2) !== T.ONEWAY;
        const right = at(x2 + 1, y2) !== T.ONEWAY;
        drawOneway(ctx, biome, p, px, py, left, right, rnd);
      }
    }

    // bramble thorns
    for (let y2 = 0; y2 < h; y2++) {
      for (let x2 = 0; x2 < w; x2++) {
        if (at(x2, y2) !== T.THORN) continue;
        const down = solid(x2, y2 - 1) && !solid(x2, y2 + 1);
        drawThorns(ctx, p, x2 * TILE, y2 * TILE, down, rnd);
      }
    }

    return c;
  }

  /* ---- Tile drawing per biome */

  function drawPlankTile(ctx, px, py, depth, openTop, openL, openR, openB, isCrumble, p, rnd) {
    // Wooden plank platforms: horizontal boards with grain
    const baseColor = isCrumble ? "#6a4020" : p.rockMid;
    const lightColor = isCrumble ? "#7a4828" : p.rockLight;
    const darkColor = isCrumble ? "#3a2010" : p.rockDeep;
    const t0 = Math.min(1, depth / 3.5);

    ctx.save();
    // base fill
    const g = ctx.createLinearGradient(px, py, px, py + TILE);
    g.addColorStop(0, mixHex(lightColor, darkColor, t0 * 0.5));
    g.addColorStop(1, mixHex(baseColor, darkColor, t0));
    ctx.fillStyle = g;
    ctx.fillRect(px, py, TILE, TILE);

    // plank seams (horizontal lines every ~8px)
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    for (let sy = 8; sy < TILE; sy += 8 + Math.floor(rnd() * 3)) {
      ctx.beginPath();
      ctx.moveTo(px, py + sy);
      ctx.lineTo(px + TILE, py + sy + (rnd() - 0.5) * 1.5);
      ctx.stroke();
    }

    // wood grain (subtle horizontal streaks)
    for (let i = 0; i < 6; i++) {
      const gy = py + rnd() * TILE;
      ctx.strokeStyle = rnd() > 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(px, gy);
      ctx.bezierCurveTo(px + TILE * 0.3, gy + (rnd() - 0.5) * 3, px + TILE * 0.7, gy + (rnd() - 0.5) * 3, px + TILE, gy);
      ctx.stroke();
    }

    // nail dots
    if (rnd() > 0.3) {
      ctx.fillStyle = "rgba(60,40,20,0.6)";
      const nx = px + 4 + rnd() * 4;
      const ny = py + 4 + rnd() * (TILE - 8);
      ctx.beginPath();
      ctx.arc(nx, ny, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + TILE - 5 - rnd() * 4, py + 4 + rnd() * (TILE - 8), 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // crumble: cracked/splintered wood (darker, broken edges)
    if (isCrumble) {
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const cx = px + rnd() * TILE;
        const cy = py + rnd() * TILE;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + (rnd() - 0.5) * 14, cy + (rnd() - 0.5) * 14);
        ctx.stroke();
      }
      // missing chunk
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.moveTo(px + TILE * 0.6, py + TILE);
      ctx.lineTo(px + TILE * 0.8, py + TILE - 6);
      ctx.lineTo(px + TILE, py + TILE);
      ctx.closePath();
      ctx.fill();
    }

    // edge highlights/shadows
    if (openL) {
      const lg = ctx.createLinearGradient(px, 0, px + 6, 0);
      lg.addColorStop(0, "rgba(255,255,255,0.12)");
      lg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = lg;
      ctx.fillRect(px, py, 6, TILE);
    }
    if (openR) {
      const rg = ctx.createLinearGradient(px + TILE - 6, 0, px + TILE, 0);
      rg.addColorStop(0, "rgba(0,0,0,0)");
      rg.addColorStop(1, "rgba(0,0,0,0.20)");
      ctx.fillStyle = rg;
      ctx.fillRect(px + TILE - 6, py, 6, TILE);
    }
    if (openB) {
      const bg = ctx.createLinearGradient(px, py + TILE - 6, px, py + TILE);
      bg.addColorStop(0, "rgba(0,0,0,0)");
      bg.addColorStop(1, "rgba(0,0,0,0.22)");
      ctx.fillStyle = bg;
      ctx.fillRect(px, py + TILE - 6, TILE, 6);
    }
    ctx.restore();
  }

  function drawLogTile(ctx, px, py, depth, openTop, openL, openR, openB, isCrumble, p, rnd) {
    // Cylindrical log / bark platforms
    const baseColor = isCrumble ? "#1a0a14" : p.rockMid;
    const lightColor = isCrumble ? "#2a1020" : p.rockLight;
    const darkColor = isCrumble ? "#0c0408" : p.rockDeep;
    const t0 = Math.min(1, depth / 3.5);

    ctx.save();
    // base — cylindrical gradient (lighter in center for log roundness)
    const g = ctx.createLinearGradient(px, py, px, py + TILE);
    g.addColorStop(0, mixHex(darkColor, baseColor, 0.3 + t0 * 0.3));
    g.addColorStop(0.3, mixHex(lightColor, baseColor, 0.5));
    g.addColorStop(0.7, mixHex(lightColor, baseColor, 0.5));
    g.addColorStop(1, mixHex(darkColor, baseColor, 0.6 + t0 * 0.2));
    ctx.fillStyle = g;
    ctx.fillRect(px, py, TILE, TILE);

    // bark texture — vertical irregular lines
    for (let i = 0; i < 5; i++) {
      const bx = px + rnd() * TILE;
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 0.8 + rnd();
      ctx.beginPath();
      ctx.moveTo(bx, py);
      ctx.lineTo(bx + (rnd() - 0.5) * 4, py + TILE);
      ctx.stroke();
    }

    // bark rings on open sides (circular arcs)
    if (openL || openR) {
      const side = openL ? px + 3 : px + TILE - 3;
      ctx.strokeStyle = "rgba(80,50,40,0.35)";
      ctx.lineWidth = 0.8;
      for (let ring = 0; ring < 4; ring++) {
        const ry = py + TILE / 2;
        const r = 4 + ring * 4;
        ctx.beginPath();
        ctx.arc(side, ry, r, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();
      }
    }

    // dark moss patches
    for (let i = 0; i < 3; i++) {
      if (rnd() > 0.5) continue;
      const mx = px + rnd() * TILE;
      const my = py + rnd() * TILE;
      ctx.fillStyle = "rgba(20,60,30,0.3)";
      ctx.beginPath();
      ctx.ellipse(mx, my, 4 + rnd() * 5, 3 + rnd() * 3, rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // crumble: rotten crumbling bark
    if (isCrumble) {
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      for (let i = 0; i < 4; i++) {
        const hx = px + rnd() * TILE;
        const hy = py + rnd() * TILE;
        ctx.beginPath();
        ctx.ellipse(hx, hy, 3 + rnd() * 4, 2 + rnd() * 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(px + 4, py + TILE * 0.3);
      ctx.lineTo(px + TILE * 0.6, py + TILE * 0.7);
      ctx.stroke();
    }

    // edge shadow/highlight
    if (openB) {
      const bg = ctx.createLinearGradient(px, py + TILE - 5, px, py + TILE);
      bg.addColorStop(0, "rgba(0,0,0,0)");
      bg.addColorStop(1, "rgba(0,0,0,0.25)");
      ctx.fillStyle = bg;
      ctx.fillRect(px, py + TILE - 5, TILE, 5);
    }
    ctx.restore();
  }

  function drawCobbleTile(ctx, px, py, depth, openTop, openL, openR, openB, isCrumble, p, rnd) {
    // Cobblestone / brick pattern
    const t0 = Math.min(1, depth / 3.5);
    const baseColor = isCrumble ? "#6a3828" : p.rockMid;
    const lightColor = isCrumble ? "#7a4030" : p.rockLight;
    const darkColor = isCrumble ? "#3a1810" : p.rockDeep;

    ctx.save();
    // base fill
    const mortarColor = "#e8d8c0";
    ctx.fillStyle = mixHex(mortarColor, "#a08060", t0 * 0.5);
    ctx.fillRect(px, py, TILE, TILE);

    // brick/cobble pattern
    const brickH = 7;
    const brickW = 10;
    for (let row = 0; row < Math.ceil(TILE / brickH); row++) {
      const offset = row % 2 === 0 ? 0 : brickW * 0.5;
      for (let col = -1; col < Math.ceil(TILE / brickW) + 1; col++) {
        const bx = px + col * brickW + offset + rnd() * 1.5;
        const by = py + row * brickH + rnd() * 0.8;
        const bw = brickW - 2 + rnd();
        const bh = brickH - 2 + rnd() * 0.5;
        if (bx + bw < px || bx > px + TILE) continue;
        // brick color variation
        const brickColor = mixHex(lightColor, baseColor, rnd() * 0.6 + t0 * 0.3);
        ctx.fillStyle = brickColor;
        const br = 1.5 + rnd();
        roundRect(ctx, Math.max(px, bx), Math.max(py, by),
          Math.min(bw, px + TILE - Math.max(px, bx)),
          Math.min(bh, py + TILE - Math.max(py, by)), br);
        ctx.fill();
      }
    }

    // crumble: cracked cobble with missing stones
    if (isCrumble) {
      // missing stones (dark holes)
      for (let i = 0; i < 2; i++) {
        const hx = px + 4 + rnd() * (TILE - 8);
        const hy = py + 4 + rnd() * (TILE - 8);
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        roundRect(ctx, hx, hy, 6 + rnd() * 4, 5 + rnd() * 3, 2);
        ctx.fill();
      }
      // cracks
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(px + rnd() * TILE, py);
      ctx.lineTo(px + rnd() * TILE, py + TILE);
      ctx.stroke();
    }

    // edge shadows
    if (openL) {
      const lg = ctx.createLinearGradient(px, 0, px + 5, 0);
      lg.addColorStop(0, "rgba(255,255,255,0.10)");
      lg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = lg;
      ctx.fillRect(px, py, 5, TILE);
    }
    if (openR) {
      const rg = ctx.createLinearGradient(px + TILE - 5, 0, px + TILE, 0);
      rg.addColorStop(0, "rgba(0,0,0,0)");
      rg.addColorStop(1, "rgba(0,0,0,0.18)");
      ctx.fillStyle = rg;
      ctx.fillRect(px + TILE - 5, py, 5, TILE);
    }
    if (openB) {
      const bg = ctx.createLinearGradient(px, py + TILE - 5, px, py + TILE);
      bg.addColorStop(0, "rgba(0,0,0,0)");
      bg.addColorStop(1, "rgba(0,0,0,0.22)");
      ctx.fillStyle = bg;
      ctx.fillRect(px, py + TILE - 5, TILE, 5);
    }
    ctx.restore();
  }

  /* ---- ONEWAY platform drawing */

  function drawOneway(ctx, biome, p, px, py, left, right, rnd) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.30)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;

    if (biome === "moss") {
      // wooden garden bridge planks with rope rail hints
      const g = ctx.createLinearGradient(0, py, 0, py + 12);
      g.addColorStop(0, "#c89050");
      g.addColorStop(1, "#8a5828");
      ctx.fillStyle = g;
      roundRect(ctx, px - (left ? 2 : 0), py + 2, TILE + (left ? 2 : 0) + (right ? 2 : 0), 10, 3);
      ctx.fill();
      // plank lines
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 0.8;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(px + i * 8, py + 3);
        ctx.lineTo(px + i * 8, py + 11);
        ctx.stroke();
      }
      // rope rail hints
      if (left) {
        ctx.strokeStyle = "#a08040";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py - 4);
        ctx.lineTo(px, py + 2);
        ctx.stroke();
      }
      if (right) {
        ctx.strokeStyle = "#a08040";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + TILE, py - 4);
        ctx.lineTo(px + TILE, py + 2);
        ctx.stroke();
      }
    } else if (biome === "cavern") {
      // vine/rope bridge (green twisted cords)
      ctx.strokeStyle = "#2a5030";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(px - (left ? 2 : 0), py + 6);
      ctx.quadraticCurveTo(px + TILE / 2, py + 9, px + TILE + (right ? 2 : 0), py + 6);
      ctx.stroke();
      // thinner vine overlay
      ctx.strokeStyle = "#48a050";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px - (left ? 2 : 0), py + 6);
      ctx.quadraticCurveTo(px + TILE / 2, py + 8, px + TILE + (right ? 2 : 0), py + 6);
      ctx.stroke();
      // vine wrapping texture
      ctx.strokeStyle = "rgba(30,70,30,0.5)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const wx = px + 3 + i * 6 + rnd() * 3;
        ctx.beginPath();
        ctx.moveTo(wx, py + 4);
        ctx.lineTo(wx + 2, py + 9);
        ctx.stroke();
      }
      // dangling vine bits
      if (rnd() > 0.5) {
        ctx.strokeStyle = "rgba(40,90,40,0.5)";
        ctx.lineWidth = 1;
        const dx = px + TILE * 0.5 + (rnd() - 0.5) * 10;
        ctx.beginPath();
        ctx.moveTo(dx, py + 9);
        ctx.lineTo(dx + (rnd() - 0.5) * 6, py + 20 + rnd() * 8);
        ctx.stroke();
      }
    } else {
      // white picket fence tops / garden ledges
      const g = ctx.createLinearGradient(0, py, 0, py + 12);
      g.addColorStop(0, "#f8f4e8");
      g.addColorStop(1, "#d0c8b8");
      ctx.fillStyle = g;
      roundRect(ctx, px - (left ? 1 : 0), py + 1, TILE + (left ? 1 : 0) + (right ? 1 : 0), 10, 3);
      ctx.fill();
      // picket tops poking up
      for (let i = 0; i < 4; i++) {
        const fx = px + 4 + i * 7;
        ctx.fillStyle = "#f0ece0";
        ctx.fillRect(fx - 2, py - 3, 4, 6);
        ctx.beginPath();
        ctx.moveTo(fx - 2, py - 3);
        ctx.lineTo(fx, py - 6);
        ctx.lineTo(fx + 2, py - 3);
        ctx.closePath();
        ctx.fill();
      }
      // garden moss on ledge
      ctx.fillStyle = "rgba(80,140,60,0.4)";
      for (let i = 0; i < 3; i++) {
        const mx = px + 2 + rnd() * (TILE - 4);
        ctx.beginPath();
        ctx.ellipse(mx, py + 2, 3, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /* ---- Cap (top surface decoration) */

  function drawCap(ctx, biome, p, px, py, rnd, capL) {
    if (biome === "moss") {
      // grass sod cap + wildflowers
      const capH = 8 + rnd() * 3;
      const g = ctx.createLinearGradient(0, py - 2, 0, py + capH);
      g.addColorStop(0, p.capLight);
      g.addColorStop(0.5, p.cap);
      g.addColorStop(1, p.capDark);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(px - (capL ? 1 : 0), py + capH);
      ctx.lineTo(px, py + 1);
      for (let i = 0; i < 5; i++) {
        const x0 = px + (i * TILE) / 5;
        const x1 = px + ((i + 1) * TILE) / 5;
        ctx.quadraticCurveTo((x0 + x1) / 2, py - 2 - rnd() * 3, x1, py + rnd() * 2);
      }
      ctx.lineTo(px + TILE, py + capH);
      ctx.closePath();
      ctx.fill();

      // grass blades
      for (let i = 0; i < 7; i++) {
        const x = px + rnd() * TILE;
        const hgt = 6 + rnd() * 10;
        const lean = (rnd() - 0.5) * 8;
        ctx.strokeStyle = rnd() > 0.4 ? p.blade : p.capLight;
        ctx.lineWidth = 1.2 + rnd() * 0.8;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x, py + 2);
        ctx.quadraticCurveTo(x + lean * 0.4, py - hgt * 0.5, x + lean, py - hgt);
        ctx.stroke();
      }
      // wildflower dots
      if (rnd() > 0.6) {
        const fx = px + 4 + rnd() * (TILE - 8);
        const fy = py - 4 - rnd() * 5;
        ctx.fillStyle = rnd() > 0.5 ? p.bloomA : p.bloomB;
        ctx.beginPath();
        ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (rnd() > 0.82) {
        // daisy
        const dx = px + 6 + rnd() * (TILE - 12);
        const dy = py - 6 - rnd() * 4;
        ctx.fillStyle = "#fff8f0";
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(dx + Math.cos(a) * 2.8, dy + Math.sin(a) * 2.8, 2, 1.4, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#ffe040";
        ctx.beginPath();
        ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (biome === "cavern") {
      // glow mushroom caps + bioluminescent spots
      const capH = 5 + rnd() * 2;
      ctx.fillStyle = p.capDark;
      ctx.fillRect(px, py, TILE, capH);

      // glowing mushrooms
      const n = rnd() > 0.5 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const x = px + 6 + rnd() * (TILE - 12);
        const hgt = 7 + rnd() * 10;
        // stem
        ctx.fillStyle = "#d8c8a0";
        ctx.fillRect(x - 1.2, py - hgt + 3, 2.4, hgt);
        // glowing cap
        const cg = ctx.createRadialGradient(x, py - hgt, 1, x, py - hgt + 2, 8);
        cg.addColorStop(0, "rgba(120,255,160,0.8)");
        cg.addColorStop(0.5, "rgba(60,200,100,0.5)");
        cg.addColorStop(1, "rgba(20,80,40,0)");
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.ellipse(x, py - hgt + 3, 7, 5, 0, Math.PI, 0);
        ctx.fill();
        // solid cap shape
        ctx.fillStyle = "rgba(80,220,120,0.6)";
        ctx.beginPath();
        ctx.ellipse(x, py - hgt + 3, 5.5, 3.5, 0, Math.PI, 0);
        ctx.fill();
      }
      // bioluminescent spots on surface
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = "rgba(100,230,160,0.35)";
        ctx.beginPath();
        ctx.arc(px + rnd() * TILE, py + 1 + rnd() * 4, 1 + rnd() * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Cottage Lane: cobble moss + daisies in mortar cracks
      const capH = 6 + rnd() * 2;
      // thin moss line
      const g = ctx.createLinearGradient(0, py - 1, 0, py + capH);
      g.addColorStop(0, p.capLight);
      g.addColorStop(0.6, p.cap);
      g.addColorStop(1, p.capDark);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(px, py + capH);
      for (let i = 0; i <= 6; i++) {
        const x = px + (i * TILE) / 6;
        const y = py + (i % 2 === 0 ? 0 : 1 + rnd() * 2);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(px + TILE, py + capH);
      ctx.closePath();
      ctx.fill();

      // tiny grass tufts
      for (let i = 0; i < 4; i++) {
        const x = px + rnd() * TILE;
        const hgt = 3 + rnd() * 5;
        ctx.strokeStyle = p.blade;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, py + 1);
        ctx.lineTo(x + (rnd() - 0.5) * 4, py - hgt);
        ctx.stroke();
      }
      // tiny daisies
      if (rnd() > 0.7) {
        const dx = px + 5 + rnd() * (TILE - 10);
        const dy = py - 3;
        ctx.fillStyle = "#fff8f0";
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(dx + Math.cos(a) * 2, dy + Math.sin(a) * 2, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#ffe848";
        ctx.beginPath();
        ctx.arc(dx, dy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /* ---- Bramble thorns with rose buds */

  function drawThorns(ctx, p, px, py, hangDown, rnd) {
    const n = 4;
    const dir = hangDown ? -1 : 1;
    const baseY = hangDown ? py : py + TILE;
    // danger halo
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const halo = ctx.createLinearGradient(0, baseY, 0, baseY - dir * TILE);
    halo.addColorStop(0, "rgba(180,40,40,0.18)");
    halo.addColorStop(1, "rgba(180,40,40,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(px - 2, Math.min(baseY, baseY - dir * TILE), TILE + 4, TILE);
    ctx.restore();

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 4;
    // bramble stems
    for (let i = 0; i < n; i++) {
      const x = px + (i + 0.5) * (TILE / n);
      const hgt = (TILE - 6) * (0.7 + rnd() * 0.3);
      const wdt = TILE / n / 2 - 1;
      // stem
      ctx.strokeStyle = "#3a2010";
      ctx.lineWidth = 2.5 + rnd();
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.quadraticCurveTo(x + (rnd() - 0.5) * 6, baseY - dir * hgt * 0.5, x + (rnd() - 0.5) * 3, baseY - dir * hgt);
      ctx.stroke();
      // thorns (small spikes along stem)
      for (let t = 0; t < 3; t++) {
        const tt = (t + 1) / 4;
        const tx = x + (rnd() - 0.5) * 3;
        const ty = baseY - dir * hgt * tt;
        const thornDir = rnd() > 0.5 ? 1 : -1;
        ctx.strokeStyle = "#5a3018";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + thornDir * 4, ty - dir * 3);
        ctx.stroke();
      }
      // rose bud at tip
      if (rnd() > 0.4) {
        const tipX = x + (rnd() - 0.5) * 3;
        const tipY = baseY - dir * hgt;
        ctx.fillStyle = "#d03040";
        ctx.beginPath();
        ctx.arc(tipX, tipY, 3, 0, Math.PI * 2);
        ctx.fill();
        // petal detail
        ctx.fillStyle = "#ff5060";
        ctx.beginPath();
        ctx.arc(tipX - 1, tipY - 1, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    // base bar
    const g2 = ctx.createLinearGradient(0, baseY - dir * 5, 0, baseY);
    g2.addColorStop(0, "#3a2010");
    g2.addColorStop(1, "#1a0c04");
    ctx.fillStyle = g2;
    ctx.fillRect(px, hangDown ? py : py + TILE - 6, TILE, 6);
  }

  /* -------------------------------------------------- Red Riding Hood hero */

  const SKINS = [
    { id: "crimson", name: "Crimson", cloak: "#cc2222", cloakDark: "#8a1414", dress: "#ffe8d0", hood: "#e03030", glow: "#ff6040", cost: 0 },
    { id: "rose", name: "Rose", cloak: "#e88090", cloakDark: "#c06070", dress: "#fff0f0", hood: "#f0a0b0", glow: "#ffc0d0", cost: 60 },
    { id: "midnight", name: "Midnight", cloak: "#2a3878", cloakDark: "#1a2450", dress: "#e8e8ff", hood: "#3848a0", glow: "#8090e0", cost: 130 },
    { id: "meadow", name: "Meadow", cloak: "#3a8848", cloakDark: "#286030", dress: "#f0ffe8", hood: "#48a858", glow: "#90e080", cost: 220 },
    { id: "goldstitch", name: "Goldstitch", cloak: "#c89020", cloakDark: "#a07010", dress: "#fff8e0", hood: "#e0a830", glow: "#ffe080", cost: 0, petals: 10 },
  ];

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
    ctx.fillStyle = s.hood;
    ctx.beginPath();
    ctx.moveTo(-3, -10);
    ctx.quadraticCurveTo(0, -16 - Math.sin(f.animT * 3) * 1.5, 4, -10);
    ctx.closePath();
    ctx.fill();

    // face
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
