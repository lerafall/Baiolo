(() => {
  "use strict";

  const W = 360;
  const H = 640;
  const STORAGE_KEY = "baiolo.spark-nest.v1";

  const TRAILS = [
    { id: "ember", name: "Ember", cost: 0, colors: ["#fde68a", "#fb923c"] },
    { id: "mint", name: "Mint Mist", cost: 25, colors: ["#6ee7b7", "#34d399"] },
    { id: "lilac", name: "Lilac Dust", cost: 60, colors: ["#c4b5fd", "#a78bfa"] },
    { id: "rose", name: "Rose Storm", cost: 100, colors: ["#f9a8d4", "#fb7185"] },
    { id: "aurora", name: "Aurora", cost: 150, colors: ["#67e8f9", "#a5f3fc", "#fde68a"] },
  ];

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const els = {
    hud: document.getElementById("hud"),
    wave: document.getElementById("wave"),
    score: document.getElementById("score"),
    stars: document.getElementById("stars"),
    combo: document.getElementById("combo"),
    comboN: document.getElementById("comboN"),
    toast: document.getElementById("toast"),
    progress: document.getElementById("progress"),
    unlockBar: document.getElementById("unlockBar"),
    overlay: document.getElementById("overlay"),
    bestLine: document.getElementById("bestLine"),
    startBtn: document.getElementById("startBtn"),
    dailyBtn: document.getElementById("dailyBtn"),
    endCard: document.getElementById("endCard"),
    endEyebrow: document.getElementById("endEyebrow"),
    endTitle: document.getElementById("endTitle"),
    endBody: document.getElementById("endBody"),
    endStats: document.getElementById("endStats"),
    againBtn: document.getElementById("againBtn"),
    menuBtn: document.getElementById("menuBtn"),
    pauseCard: document.getElementById("pauseCard"),
    resumeBtn: document.getElementById("resumeBtn"),
  };

  function loadMeta() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) throw new Error("empty");
      const data = JSON.parse(raw);
      return {
        best: Number(data.best) || 0,
        stars: Number(data.stars) || 0,
        unlocked: Array.isArray(data.unlocked) ? data.unlocked : ["ember"],
        trail: data.trail || "ember",
        dailyBest: Number(data.dailyBest) || 0,
        dailyKey: data.dailyKey || "",
      };
    } catch {
      return {
        best: 0,
        stars: 0,
        unlocked: ["ember"],
        trail: "ember",
        dailyBest: 0,
        dailyKey: "",
      };
    }
  }

  function saveMeta(meta) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
    } catch {
      /* ignore quota / private mode */
    }
  }

  function dayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function mulberry32(a) {
    return function rand() {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  let meta = loadMeta();
  let mode = "title"; // title | play | pause | end
  let daily = false;
  let rng = Math.random;
  let score = 0;
  let wave = 1;
  let combo = 0;
  let bestCombo = 0;
  let caught = 0;
  let lives = 3;
  let nestX = W / 2;
  let nestTarget = W / 2;
  let pointerId = null;
  let falling = [];
  let particles = [];
  let popups = [];
  let spawnAcc = 0;
  let waveGoal = 8;
  let waveCaught = 0;
  let storm = false;
  let stormTimer = 0;
  let time = 0;
  let shake = 0;
  let invuln = 0;
  let runStarsEarned = 0;

  function trailColors() {
    const t = TRAILS.find((x) => x.id === meta.trail) || TRAILS[0];
    return t.colors;
  }

  function nextUnlock() {
    return TRAILS.find((t) => !meta.unlocked.includes(t.id));
  }

  function updateUnlockBar() {
    const n = nextUnlock();
    if (!n) {
      els.unlockBar.style.width = "100%";
      return;
    }
    const prev = TRAILS.filter((t) => t.cost < n.cost).pop();
    const base = prev ? prev.cost : 0;
    const pct = Math.min(100, ((meta.stars - base) / (n.cost - base)) * 100);
    els.unlockBar.style.width = `${Math.max(0, pct)}%`;
  }

  function refreshMenu() {
    const dk = dayKey();
    if (meta.dailyKey !== dk) {
      meta.dailyKey = dk;
      meta.dailyBest = 0;
      saveMeta(meta);
    }
    els.bestLine.textContent = `Best ${meta.best} · Stars ${meta.stars} · Daily ${meta.dailyBest}`;
    updateUnlockBar();
  }

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(els.toast._t);
    els.toast._t = setTimeout(() => {
      els.toast.hidden = true;
    }, 1400);
  }

  function showCombo() {
    if (combo < 2) return;
    els.comboN.textContent = String(combo);
    els.combo.hidden = false;
    clearTimeout(els.combo._t);
    els.combo._t = setTimeout(() => {
      els.combo.hidden = true;
    }, 700);
  }

  function burst(x, y, color, n = 10) {
    for (let i = 0; i < n; i += 1) {
      const a = rng() * Math.PI * 2;
      const sp = 1 + rng() * 3;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.5 + rng() * 0.5,
        color,
        size: 2 + rng() * 2,
      });
    }
  }

  function popup(x, y, text, color) {
    popups.push({ x, y, text, color, life: 0.9 });
  }

  function waveParams(w) {
    const speed = 1.4 + w * 0.18;
    const mothChance = Math.min(0.42, 0.12 + w * 0.035);
    const spawnMs = Math.max(280, 720 - w * 35);
    const goal = 6 + w * 2;
    return { speed, mothChance, spawnMs, goal };
  }

  function spawnFalling() {
    const p = waveParams(wave);
    const isMoth = storm ? rng() < 0.55 : rng() < p.mothChance;
    const isGold = !isMoth && rng() < 0.12;
    falling.push({
      x: 28 + rng() * (W - 56),
      y: -20,
      r: isMoth ? 14 : isGold ? 12 : 9,
      vy: p.speed * (0.85 + rng() * 0.4) * (storm ? 1.35 : 1),
      vx: (rng() - 0.5) * (storm ? 1.4 : 0.6),
      kind: isMoth ? "moth" : isGold ? "gold" : "spark",
      spin: rng() * Math.PI * 2,
    });
  }

  function startRun(isDaily) {
    daily = Boolean(isDaily);
    rng = daily ? mulberry32(hashDay(dayKey())) : Math.random;
    score = 0;
    wave = 1;
    combo = 0;
    bestCombo = 0;
    caught = 0;
    lives = 3;
    nestX = W / 2;
    nestTarget = W / 2;
    falling = [];
    particles = [];
    popups = [];
    spawnAcc = 0;
    waveCaught = 0;
    waveGoal = waveParams(1).goal;
    storm = false;
    stormTimer = 0;
    invuln = 0;
    runStarsEarned = 0;
    mode = "play";
    els.overlay.hidden = true;
    els.endCard.hidden = true;
    els.pauseCard.hidden = true;
    els.hud.hidden = false;
    els.progress.hidden = false;
    updateHud();
    toast(daily ? "Daily sky pattern" : "Catch the sparks!");
  }

  function hashDay(key) {
    let h = 2166136261;
    for (let i = 0; i < key.length; i += 1) {
      h ^= key.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function updateHud() {
    els.wave.textContent = String(wave);
    els.score.textContent = String(score);
    els.stars.textContent = String(meta.stars);
    updateUnlockBar();
  }

  function tryUnlocks() {
    let unlockedAny = false;
    for (const t of TRAILS) {
      if (meta.stars >= t.cost && !meta.unlocked.includes(t.id)) {
        meta.unlocked.push(t.id);
        unlockedAny = true;
        toast(`Unlocked: ${t.name}`);
        burst(W / 2, H * 0.4, t.colors[0], 24);
      }
    }
    if (unlockedAny) saveMeta(meta);
  }

  function endRun(wonWaveClear) {
    mode = "end";
    const earned = Math.max(1, Math.floor(score / 120) + (bestCombo >= 8 ? 2 : 0) + (wave >= 5 ? 1 : 0));
    runStarsEarned = earned;
    meta.stars += earned;
    if (score > meta.best) meta.best = score;
    if (daily && score > meta.dailyBest) meta.dailyBest = score;
    // auto-equip newest affordable trail if still on ember and unlocked more
    const newest = [...TRAILS].reverse().find((t) => meta.unlocked.includes(t.id));
    if (newest) meta.trail = newest.id;
    tryUnlocks();
    saveMeta(meta);
    updateHud();

    els.endEyebrow.textContent = wonWaveClear ? "Nest thriving" : "Nest cracked";
    els.endTitle.textContent =
      combo >= 10 ? "Legendary combo!" : score > meta.best * 0.9 ? "Sky streak!" : "Nice nest!";
    els.endBody.textContent = `Score ${score}`;
    els.endStats.innerHTML = `
      <span>Wave ${wave}</span>
      <span>Best combo ×${bestCombo}</span>
      <span>+${earned} stars</span>
      <span>Caught ${caught}</span>
    `;
    els.endCard.hidden = false;
    els.hud.hidden = false;
  }

  function damage() {
    if (invuln > 0) return;
    lives -= 1;
    combo = 0;
    shake = 10;
    invuln = 1.1;
    burst(nestX, H - 70, "#fb7185", 16);
    popup(nestX, H - 110, "Ouch!", "#fb7185");
    if (lives <= 0) endRun(false);
  }

  function onCatch(item) {
    if (item.kind === "moth") {
      damage();
      return;
    }
    const base = item.kind === "gold" ? 40 : 10;
    combo += 1;
    bestCombo = Math.max(bestCombo, combo);
    const gain = base + Math.min(combo, 12) * 3;
    score += gain;
    caught += 1;
    waveCaught += 1;
    burst(item.x, item.y, item.kind === "gold" ? "#fde68a" : "#c4b5fd", 12);
    popup(item.x, item.y - 10, `+${gain}`, item.kind === "gold" ? "#fde68a" : "#fff");
    showCombo();

    if (waveCaught >= waveGoal) {
      wave += 1;
      waveCaught = 0;
      waveGoal = waveParams(wave).goal;
      score += 50 + wave * 10;
      toast(`Wave ${wave}`);
      burst(W / 2, H * 0.35, "#6ee7b7", 20);
      // Boss spike every 3 waves
      if (wave % 3 === 0) {
        storm = true;
        stormTimer = 5200;
        toast("Storm Moth incoming!");
        for (let i = 0; i < 4; i += 1) {
          falling.push({
            x: 40 + i * 80,
            y: -30 - i * 40,
            r: 16,
            vy: 2.2 + wave * 0.08,
            vx: Math.sin(i) * 0.8,
            kind: "moth",
            spin: 0,
            boss: true,
          });
        }
      }
      if (wave > 12) {
        // Soft win milestone then continue endless pressure
        if (wave === 13) toast("Endless sky unlocked this run!");
      }
    }
    updateHud();
  }

  // Pointer on canvas (iframe-safe)
  function clientToGameX(clientX) {
    const rect = canvas.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * W;
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (mode !== "play") return;
    pointerId = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    nestTarget = clientToGameX(e.clientX);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (mode !== "play") return;
    if (pointerId !== null && e.pointerId !== pointerId) return;
    if (pointerId === null && e.buttons === 0) return;
    nestTarget = clientToGameX(e.clientX);
  });

  function releasePointer(e) {
    if (pointerId !== null && e.pointerId === pointerId) {
      try {
        canvas.releasePointerCapture(pointerId);
      } catch {
        /* ignore */
      }
      pointerId = null;
    }
  }

  canvas.addEventListener("pointerup", releasePointer);
  canvas.addEventListener("pointercancel", releasePointer);

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mode === "play") {
      mode = "pause";
      els.pauseCard.hidden = false;
    } else if (e.key === "ArrowLeft" && mode === "play") {
      nestTarget = Math.max(30, nestTarget - 28);
    } else if (e.key === "ArrowRight" && mode === "play") {
      nestTarget = Math.min(W - 30, nestTarget + 28);
    }
  });

  els.startBtn.addEventListener("click", () => startRun(false));
  els.dailyBtn.addEventListener("click", () => startRun(true));
  els.againBtn.addEventListener("click", () => startRun(daily));
  els.menuBtn.addEventListener("click", () => {
    mode = "title";
    els.endCard.hidden = true;
    els.overlay.hidden = false;
    els.hud.hidden = true;
    els.progress.hidden = true;
    refreshMenu();
  });
  els.resumeBtn.addEventListener("click", () => {
    mode = "play";
    els.pauseCard.hidden = true;
  });

  function tick(dt) {
    time += dt;
    if (shake > 0) shake *= 0.86;
    if (invuln > 0) invuln -= dt / 1000;

    particles = particles.filter((p) => {
      p.life -= dt / 900;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      return p.life > 0;
    });
    popups = popups.filter((p) => {
      p.life -= dt / 900;
      p.y -= 0.4;
      return p.life > 0;
    });

    if (mode !== "play") return;

    nestX += (nestTarget - nestX) * 0.28;
    nestX = Math.max(28, Math.min(W - 28, nestX));

    if (storm) {
      stormTimer -= dt;
      if (stormTimer <= 0) storm = false;
    }

    const p = waveParams(wave);
    spawnAcc += dt;
    if (spawnAcc >= p.spawnMs) {
      spawnAcc = 0;
      spawnFalling();
      if (storm && rng() < 0.5) spawnFalling();
    }

    for (const item of falling) {
      item.y += item.vy;
      item.x += item.vx;
      item.spin += 0.08;
      if (item.x < 16 || item.x > W - 16) item.vx *= -1;
    }

    // collisions with nest
    const nestY = H - 78;
    const nestR = 34;
    for (const item of falling) {
      if (item.dead) continue;
      const dy = item.y - nestY;
      const dx = item.x - nestX;
      if (dy > -8 && dy < 28 && Math.abs(dx) < nestR + item.r * 0.4) {
        item.dead = true;
        onCatch(item);
      } else if (item.y > H + 30) {
        item.dead = true;
        if (item.kind !== "moth") {
          combo = 0;
        }
      }
    }
    falling = falling.filter((f) => !f.dead);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBg() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, storm ? "#2a1048" : "#1a1240");
    g.addColorStop(0.55, "#24185a");
    g.addColorStop(1, "#0f0a1f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 28; i += 1) {
      const x = (i * 53 + time * 0.02) % W;
      const y = (i * 41) % (H * 0.7);
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${0.15 + Math.sin(time * 0.01 + i) * 0.1})`;
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // moon
    const mx = 290;
    const my = 70;
    const moon = ctx.createRadialGradient(mx, my, 4, mx, my, 40);
    moon.addColorStop(0, "rgba(253,230,138,0.55)");
    moon.addColorStop(1, "transparent");
    ctx.fillStyle = moon;
    ctx.beginPath();
    ctx.arc(mx, my, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff7ed";
    ctx.beginPath();
    ctx.arc(mx, my, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawNest() {
    const y = H - 78;
    const colors = trailColors();
    // trail
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.globalAlpha = 0.15;
      ctx.arc(nestX - i * 3, y + 8, 10 - i, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = invuln > 0 && Math.floor(time / 80) % 2 === 0 ? 0.45 : 1;

    const glow = ctx.createRadialGradient(nestX, y, 4, nestX, y, 50);
    glow.addColorStop(0, "rgba(253,230,138,0.45)");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(nestX, y, 50, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#78350f";
    roundRect(nestX - 36, y - 8, 72, 22, 10);
    ctx.fill();
    ctx.fillStyle = "#92400e";
    roundRect(nestX - 30, y - 14, 60, 14, 8);
    ctx.fill();
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.ellipse(nestX, y - 6, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // lives as tiny sparks on nest
    for (let i = 0; i < lives; i += 1) {
      ctx.beginPath();
      ctx.fillStyle = "#fbbf24";
      ctx.arc(nestX - 16 + i * 16, y + 18, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawItem(item) {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.spin);
    if (item.kind === "moth") {
      ctx.fillStyle = item.boss ? "#c4b5fd" : "#94a3b8";
      ctx.beginPath();
      ctx.ellipse(-8, 0, 10, 6, -0.4, 0, Math.PI * 2);
      ctx.ellipse(8, 0, 10, 6, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const color = item.kind === "gold" ? "#fde68a" : "#c4b5fd";
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, item.r * 2);
      g.addColorStop(0, color);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, item.r * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 4; i += 1) {
        const a = -Math.PI / 2 + (i * Math.PI) / 2;
        const r = i % 2 === 0 ? item.r : item.r * 0.4;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
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
    for (const p of popups) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.font = "bold 14px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawTitleIdle() {
    drawBg();
    // floating sparks
    for (let i = 0; i < 8; i += 1) {
      const x = 50 + i * 35;
      const y = 220 + Math.sin(time * 0.003 + i) * 24;
      drawItem({ x, y, r: 8, spin: time * 0.01 + i, kind: i % 3 === 0 ? "gold" : "spark" });
    }
    nestTarget = W / 2 + Math.sin(time * 0.002) * 20;
    nestX = nestTarget;
    drawNest();
  }

  function render() {
    ctx.save();
    if (shake > 0.5) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }
    if (mode === "title") {
      drawTitleIdle();
      ctx.restore();
      return;
    }
    drawBg();
    for (const item of falling) drawItem(item);
    drawNest();
    drawParticles();
    // wave progress chips
    ctx.fillStyle = "rgba(12,6,24,0.55)";
    roundRect(16, H - 118, W - 32, 8, 4);
    ctx.fill();
    ctx.fillStyle = "#6ee7b7";
    const pct = Math.min(1, waveCaught / waveGoal);
    roundRect(16, H - 118, (W - 32) * pct, 8, 4);
    ctx.fill();
    ctx.restore();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(40, now - last);
    last = now;
    tick(dt);
    render();
    requestAnimationFrame(frame);
  }

  refreshMenu();
  requestAnimationFrame(frame);
})();
