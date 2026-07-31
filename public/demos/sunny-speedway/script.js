(() => {
  "use strict";

  const STORAGE_KEY = "baiolo.sunny-speedway.v1";
  const LANES = 3;
  const PAINTS = [
    { id: "coral", name: "Coral Pop", body: "#ff6b5a", accent: "#ffd166", cost: 0 },
    { id: "sky", name: "Sky Smile", body: "#4dabf7", accent: "#ffe066", cost: 40 },
    { id: "mint", name: "Mint Zoom", body: "#38d9a9", accent: "#fff3bf", cost: 90 },
    { id: "violet", name: "Violet Bolt", body: "#9775fa", accent: "#ffc9c9", cost: 150 },
    { id: "gold", name: "Sunset Gold", body: "#fab005", accent: "#fff9db", cost: 220 },
  ];

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const frame = document.getElementById("frame");
  const hud = document.getElementById("hud");
  const progress = document.getElementById("progress");
  const overlay = document.getElementById("overlay");
  const pauseCard = document.getElementById("pauseCard");
  const endCard = document.getElementById("endCard");
  const comboEl = document.getElementById("combo");
  const toastEl = document.getElementById("toast");
  const unlockBar = document.getElementById("unlockBar");
  const bestLine = document.getElementById("bestLine");

  const ui = {
    stage: document.getElementById("stage"),
    score: document.getElementById("score"),
    coins: document.getElementById("coins"),
    comboN: document.getElementById("comboN"),
    endEyebrow: document.getElementById("endEyebrow"),
    endTitle: document.getElementById("endTitle"),
    endBody: document.getElementById("endBody"),
    endStats: document.getElementById("endStats"),
  };

  let W = canvas.width;
  let H = canvas.height;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  const state = {
    mode: "menu", // menu | play | pause | end
    daily: false,
    seed: 1,
    rng: null,
    t: 0,
    score: 0,
    coinsRun: 0,
    distance: 0,
    stage: 1,
    speed: 5.2,
    baseSpeed: 5.2,
    nitro: 0,
    shield: 0,
    lane: 1,
    targetLane: 1,
    carX: 0,
    carY: 0,
    bounce: 0,
    invuln: 0,
    nearMiss: 0,
    nearMissTimer: 0,
    maxCombo: 0,
    objects: [],
    particles: [],
    pops: [],
    hills: [],
    clouds: [],
    roadOffset: 0,
    spawnTimer: 0,
    stageDist: 0,
    stageGoal: 1800,
    bossActive: false,
    shake: 0,
    pointerId: null,
    pointerX: 0,
    holdNitro: false,
    lastLaneSwipeX: null,
  };

  let meta = loadMeta();

  function loadMeta() {
    const fallback = {
      best: 0,
      coins: 0,
      unlocked: ["coral"],
      paint: "coral",
      dailyDate: "",
      dailyBest: 0,
      runs: 0,
    };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fallback;
      return { ...fallback, ...JSON.parse(raw) };
    } catch {
      return fallback;
    }
  }

  function saveMeta() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
    } catch {
      /* ignore */
    }
  }

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function resize() {
    const rect = frame.getBoundingClientRect();
    W = Math.max(320, Math.floor(rect.width));
    H = Math.max(520, Math.floor(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.carY = H * 0.78;
    state.carX = laneX(state.lane);
  }

  function laneX(lane) {
    const roadL = W * 0.16;
    const roadW = W * 0.68;
    const laneW = roadW / LANES;
    return roadL + laneW * (lane + 0.5);
  }

  function refreshBestLine() {
    const paint = PAINTS.find((p) => p.id === meta.paint)?.name || "Coral Pop";
    bestLine.textContent = `Best ${meta.best} · Coins ${meta.coins} · ${paint}`;
  }

  function nextUnlockProgress() {
    const locked = PAINTS.filter((p) => !meta.unlocked.includes(p.id));
    if (!locked.length) return 1;
    const next = locked[0];
    return Math.min(1, meta.coins / next.cost);
  }

  function tryUnlockPaints() {
    let unlockedSomething = false;
    for (const p of PAINTS) {
      if (!meta.unlocked.includes(p.id) && meta.coins >= p.cost) {
        meta.unlocked.push(p.id);
        unlockedSomething = true;
        showToast(`Unlocked ${p.name}!`);
      }
    }
    if (unlockedSomething) saveMeta();
  }

  function showToast(msg) {
    toastEl.hidden = false;
    toastEl.textContent = msg;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toastEl.hidden = true;
    }, 900);
  }

  function showCombo(n) {
    comboEl.hidden = false;
    ui.comboN.textContent = String(n);
    clearTimeout(showCombo._t);
    showCombo._t = setTimeout(() => {
      comboEl.hidden = true;
    }, 700);
  }

  function resetRun(daily) {
    state.mode = "play";
    state.daily = !!daily;
    state.seed = daily ? hashStr(`sunny-${todayKey()}`) : (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    state.rng = mulberry32(state.seed);
    state.t = 0;
    state.score = 0;
    state.coinsRun = 0;
    state.distance = 0;
    state.stage = 1;
    state.baseSpeed = 5.2;
    state.speed = 5.2;
    state.nitro = 0;
    state.shield = 0;
    state.lane = 1;
    state.targetLane = 1;
    state.carX = laneX(1);
    state.bounce = 0;
    state.invuln = 0;
    state.nearMiss = 0;
    state.nearMissTimer = 0;
    state.maxCombo = 0;
    state.objects = [];
    state.particles = [];
    state.pops = [];
    state.roadOffset = 0;
    state.spawnTimer = 40;
    state.stageDist = 0;
    state.stageGoal = 1800;
    state.bossActive = false;
    state.shake = 0;
    state._freeze = false;
    state.hills = [];
    state.clouds = [];
    for (let i = 0; i < 6; i++) {
      state.hills.push({
        x: state.rng() * W,
        y: H * (0.28 + state.rng() * 0.12),
        r: 80 + state.rng() * 120,
        hue: 95 + state.rng() * 40,
      });
    }
    for (let i = 0; i < 5; i++) {
      state.clouds.push({
        x: state.rng() * W,
        y: 40 + state.rng() * H * 0.22,
        s: 0.6 + state.rng() * 0.8,
        v: 0.15 + state.rng() * 0.25,
      });
    }
    overlay.hidden = true;
    pauseCard.hidden = true;
    endCard.hidden = true;
    hud.hidden = false;
    progress.hidden = false;
    comboEl.hidden = true;
    updateHud();
  }

  function updateHud() {
    ui.stage.textContent = String(state.stage);
    ui.score.textContent = String(Math.floor(state.score));
    ui.coins.textContent = String(meta.coins + state.coinsRun);
    unlockBar.style.width = `${Math.floor(nextUnlockProgress() * 100)}%`;
  }

  function spawnObject(forceType) {
    const r = state.rng();
    let type = forceType;
    if (!type) {
      if (r < 0.42) type = "cone";
      else if (r < 0.68) type = "rival";
      else if (r < 0.82) type = "barrel";
      else if (r < 0.92) type = "coin";
      else if (r < 0.97) type = "nitro";
      else type = "shield";
    }

    // Prefer empty-ish lanes; avoid stacking three blockers on same row
    let lane = (state.rng() * LANES) | 0;
    if (type !== "coin" && type !== "nitro" && type !== "shield") {
      const blocked = new Set(
        state.objects
          .filter((o) => o.y < 120 && o.type !== "coin" && o.type !== "nitro" && o.type !== "shield")
          .map((o) => o.lane),
      );
      if (blocked.size >= 2) {
        const free = [0, 1, 2].filter((l) => !blocked.has(l));
        if (free.length) lane = free[(state.rng() * free.length) | 0];
      }
    }

    const obj = {
      type,
      lane,
      x: laneX(lane),
      y: -80 - state.rng() * 40,
      w: 46,
      h: 54,
      passed: false,
      nearMissed: false,
      hp: 1,
      bob: state.rng() * Math.PI * 2,
    };

    if (type === "rival") {
      obj.w = 52;
      obj.h = 70;
      obj.color = ["#74c0fc", "#b197fc", "#63e6be", "#ffa94d"][(state.rng() * 4) | 0];
    } else if (type === "barrel") {
      obj.w = 42;
      obj.h = 48;
    } else if (type === "cone") {
      obj.w = 36;
      obj.h = 42;
    } else if (type === "boss") {
      obj.w = 78;
      obj.h = 110;
      obj.hp = 1;
      obj.lane = 1;
      obj.x = laneX(1);
      obj.sway = 0;
    } else if (type === "coin" || type === "nitro" || type === "shield") {
      obj.w = 28;
      obj.h = 28;
    }

    state.objects.push(obj);
  }

  function spawnBoss() {
    state.bossActive = true;
    showToast("Big Rig incoming!");
    spawnObject("boss");
  }

  function addScore(n, x, y, label) {
    state.score += n;
    if (x != null) {
      state.pops.push({
        x,
        y,
        text: label || `+${Math.floor(n)}`,
        life: 1,
        color: "#fff8ef",
      });
    }
  }

  function burst(x, y, color, n = 12) {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const sp = 1.5 + Math.random() * 3.5;
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 1,
        life: 0.7 + Math.random() * 0.5,
        color,
        r: 3 + Math.random() * 4,
      });
    }
  }

  function endRun(reason) {
    state.mode = "end";
    meta.runs += 1;
    meta.coins += state.coinsRun;
    const total = Math.floor(state.score);
    if (total > meta.best) meta.best = total;
    if (state.daily) {
      const dk = todayKey();
      if (meta.dailyDate !== dk) {
        meta.dailyDate = dk;
        meta.dailyBest = total;
      } else if (total > meta.dailyBest) {
        meta.dailyBest = total;
      }
    }
    tryUnlockPaints();
    // Auto-equip newest unlock if still on default and more paints exist
    saveMeta();
    refreshBestLine();

    const crash = reason === "crash";
    ui.endEyebrow.textContent = crash ? "Crash!" : "Finish!";
    ui.endTitle.textContent = crash
      ? state.nearMiss >= 3
        ? "So close!"
        : "Oops — try again"
      : "Stage clear!";
    ui.endBody.textContent = `Score ${total}${total >= meta.best ? " · New best!" : ""}`;
    ui.endStats.innerHTML = `
      <span>Stage ${state.stage}</span>
      <span>Coins +${state.coinsRun}</span>
      <span>Max combo ×${state.maxCombo}</span>
      <span>${state.daily ? "Daily route" : "Classic"}</span>
    `;
    endCard.hidden = false;
    hud.hidden = true;
    progress.hidden = true;
    comboEl.hidden = true;
  }

  function setLane(lane) {
    state.targetLane = Math.max(0, Math.min(LANES - 1, lane));
    state.bounce = 1;
  }

  function update(dt) {
    if (state.mode !== "play") return;
    state.t += dt;
    const nitroBoost = state.holdNitro || state.nitro > 0 ? 1.55 : 1;
    if (state.nitro > 0) state.nitro -= dt;
    if (state.shield > 0) state.shield -= dt;
    if (state.invuln > 0) state.invuln -= dt;
    if (state.nearMissTimer > 0) {
      state.nearMissTimer -= dt;
      if (state.nearMissTimer <= 0) state.nearMiss = 0;
    }
    if (state.shake > 0) state.shake *= 0.86;

    if (state._freeze) {
      state.speed = 0;
      updateHud();
      return;
    }

    state.speed = state.baseSpeed * nitroBoost + state.stage * 0.35;
    const scroll = state.speed * 60 * dt;
    state.roadOffset = (state.roadOffset + scroll) % 80;
    state.distance += scroll;
    state.stageDist += scroll;
    addScore(scroll * 0.04 * (1 + state.nearMiss * 0.08));

    // Lane lerp with squash bounce
    const tx = laneX(state.targetLane);
    state.carX += (tx - state.carX) * Math.min(1, 14 * dt);
    state.lane = state.targetLane;
    if (state.bounce > 0) state.bounce = Math.max(0, state.bounce - dt * 4);

    // Stage progression
    if (!state.bossActive && state.stageDist >= state.stageGoal) {
      if (state.stage % 3 === 0) {
        spawnBoss();
      } else {
        advanceStage();
      }
    }

    // Spawn cadence
    state.spawnTimer -= scroll;
    if (state.spawnTimer <= 0 && !state.bossActive) {
      spawnObject();
      // Occasional twin hazard for pressure
      if (state.rng() < 0.22 + state.stage * 0.03) spawnObject();
      const gap = Math.max(55, 150 - state.stage * 8 - (nitroBoost > 1 ? 20 : 0));
      state.spawnTimer = gap + state.rng() * 40;
    }

    // Clouds drift
    for (const c of state.clouds) {
      c.x -= c.v * scroll * 0.15;
      if (c.x < -80) c.x = W + 40;
    }

    // Objects
    const carHit = { x: state.carX, y: state.carY, w: 44, h: 58 };
    for (let i = state.objects.length - 1; i >= 0; i--) {
      const o = state.objects[i];
      o.y += scroll;
      o.bob += dt * 6;
      if (o.type === "boss") {
        o.sway += dt * 1.6;
        o.lane = Math.round(1 + Math.sin(o.sway) * 0.95);
        o.x += (laneX(o.lane) - o.x) * Math.min(1, 6 * dt);
      } else {
        o.x = laneX(o.lane);
      }

      // Near miss
      if (
        !o.nearMissed &&
        (o.type === "cone" || o.type === "rival" || o.type === "barrel" || o.type === "boss") &&
        Math.abs(o.y - carHit.y) < 55 &&
        Math.abs(o.lane - state.targetLane) === 1
      ) {
        o.nearMissed = true;
        state.nearMiss = Math.min(12, state.nearMiss + 1);
        state.nearMissTimer = 1.4;
        state.maxCombo = Math.max(state.maxCombo, state.nearMiss);
        const bonus = 25 * state.nearMiss;
        addScore(bonus, state.carX, state.carY - 50, `NEAR +${bonus}`);
        showCombo(state.nearMiss);
        burst(state.carX, state.carY - 30, "#ffd43b", 8);
      }

      // Collectibles
      if (o.type === "coin" || o.type === "nitro" || o.type === "shield") {
        if (overlap(carHit, o)) {
          if (o.type === "coin") {
            state.coinsRun += 1;
            addScore(15, o.x, o.y, "+1💎");
            burst(o.x, o.y, "#ffd43b", 10);
          } else if (o.type === "nitro") {
            state.nitro = 2.2;
            showToast("Nitro!");
            burst(o.x, o.y, "#74c0fc", 14);
          } else {
            state.shield = 3.5;
            showToast("Shield!");
            burst(o.x, o.y, "#69db7c", 14);
          }
          state.objects.splice(i, 1);
          continue;
        }
      }

      // Hazards
      if (o.type === "cone" || o.type === "rival" || o.type === "barrel" || o.type === "boss") {
        if (state.invuln <= 0 && overlap(carHit, { x: o.x, y: o.y, w: o.w * 0.72, h: o.h * 0.72 })) {
          if (state.shield > 0) {
            state.shield = 0;
            state.invuln = 1.1;
            state.shake = 10;
            burst(o.x, o.y, "#69db7c", 16);
            state.objects.splice(i, 1);
            if (o.type === "boss") {
              state.bossActive = false;
              advanceStage();
            }
            showToast("Shield saved you!");
            continue;
          }
          state.shake = 14;
          burst(state.carX, state.carY, "#ff6b5a", 22);
          endRun("crash");
          return;
        }
      }

      // Boss passed = stage clear
      if (o.type === "boss" && o.y > H + 60) {
        state.objects.splice(i, 1);
        state.bossActive = false;
        addScore(400, state.carX, state.carY - 80, "BOSS +400");
        burst(state.carX, H * 0.4, "#ff922b", 28);
        advanceStage();
        continue;
      }

      if (o.y > H + 100) state.objects.splice(i, 1);
    }

    // Particles / pops
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.pops.length - 1; i >= 0; i--) {
      const p = state.pops[i];
      p.y -= 40 * dt;
      p.life -= dt;
      if (p.life <= 0) state.pops.splice(i, 1);
    }

    updateHud();
  }

  function advanceStage() {
    state.stage += 1;
    state.stageDist = 0;
    state.stageGoal = 1600 + state.stage * 120;
    state.baseSpeed = 5.2 + state.stage * 0.28;
    state.coinsRun += 3;
    addScore(100 * state.stage, state.carX, state.carY - 70, `STAGE ${state.stage}`);
    showToast(`Stage ${state.stage}!`);
    burst(W * 0.5, H * 0.35, "#fff", 20);
  }

  function overlap(a, b) {
    return (
      Math.abs(a.x - b.x) < (a.w + b.w) * 0.45 &&
      Math.abs(a.y - b.y) < (a.h + b.h) * 0.42
    );
  }

  function draw() {
    ctx.save();
    if (state.shake > 0.4) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }

    drawSky();
    drawHills();
    drawRoad();
    for (const o of state.objects) drawObject(o);
    if (state.mode !== "menu") drawCar(state.carX, state.carY);
    else drawCar(laneX(1), H * 0.72);

    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const p of state.pops) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.font = "800 16px Nunito, Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    // Soft vignette
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.85);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(30,40,60,0.18)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.restore();

    if (state.mode === "menu") drawMenuBackdropExtras();
  }

  function drawMenuBackdropExtras() {
    // idle rival cars for menu ambience
  }

  function drawSky() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#6ec1ff");
    sky.addColorStop(0.35, "#b6e3ff");
    sky.addColorStop(0.62, "#ffe7b5");
    sky.addColorStop(1, "#ffc894");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Sun
    const sx = W * 0.78;
    const sy = H * 0.14;
    const sun = ctx.createRadialGradient(sx, sy, 8, sx, sy, 70);
    sun.addColorStop(0, "#fff6c2");
    sun.addColorStop(0.4, "#ffd43b");
    sun.addColorStop(1, "rgba(255, 180, 80, 0)");
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(sx, sy, 70, 0, Math.PI * 2);
    ctx.fill();

    for (const c of state.clouds.length ? state.clouds : [{ x: 60, y: 70, s: 1 }, { x: 220, y: 110, s: 0.8 }]) {
      drawCloud(c.x, c.y, c.s || 1);
    }
  }

  function drawCloud(x, y, s) {
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.beginPath();
    ctx.ellipse(x, y, 28 * s, 16 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 22 * s, y + 4 * s, 20 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 20 * s, y + 6 * s, 18 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHills() {
    const hills = state.hills.length
      ? state.hills
      : [
          { x: W * 0.2, y: H * 0.36, r: 140, hue: 110 },
          { x: W * 0.7, y: H * 0.34, r: 160, hue: 100 },
        ];
    for (const h of hills) {
      const grd = ctx.createRadialGradient(h.x, h.y, 10, h.x, h.y, h.r);
      grd.addColorStop(0, `hsla(${h.hue}, 55%, 62%, 0.95)`);
      grd.addColorStop(1, `hsla(${h.hue - 15}, 45%, 42%, 0.9)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(h.x, h.y + 40, h.r, h.r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawRoad() {
    const roadL = W * 0.16;
    const roadW = W * 0.68;

    // Soft grass shoulders
    ctx.fillStyle = "#7bc47f";
    ctx.fillRect(0, H * 0.32, W, H);
    ctx.fillStyle = "#8fd18a";
    ctx.beginPath();
    ctx.moveTo(0, H * 0.32);
    ctx.quadraticCurveTo(W * 0.1, H * 0.4, 0, H * 0.5);
    ctx.fill();

    // Road body with rounded perspective feel
    const roadGrad = ctx.createLinearGradient(roadL, 0, roadL + roadW, 0);
    roadGrad.addColorStop(0, "#3d4658");
    roadGrad.addColorStop(0.5, "#556074");
    roadGrad.addColorStop(1, "#3d4658");
    ctx.fillStyle = roadGrad;
    roundRect(roadL, H * 0.3, roadW, H * 0.75, 28);
    ctx.fill();

    // Edge lines
    ctx.strokeStyle = "#fff6de";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(roadL + 10, H * 0.32);
    ctx.lineTo(roadL + 10, H);
    ctx.moveTo(roadL + roadW - 10, H * 0.32);
    ctx.lineTo(roadL + roadW - 10, H);
    ctx.stroke();

    // Lane dashes
    const laneW = roadW / LANES;
    ctx.strokeStyle = "rgba(255,246,222,0.75)";
    ctx.lineWidth = 4;
    ctx.setLineDash([22, 28]);
    ctx.lineDashOffset = -state.roadOffset;
    for (let i = 1; i < LANES; i++) {
      const x = roadL + laneW * i;
      ctx.beginPath();
      ctx.moveTo(x, H * 0.32);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Horizon glow on road
    const hg = ctx.createLinearGradient(0, H * 0.28, 0, H * 0.45);
    hg.addColorStop(0, "rgba(255, 214, 140, 0.35)");
    hg.addColorStop(1, "rgba(255,214,140,0)");
    ctx.fillStyle = hg;
    ctx.fillRect(roadL, H * 0.3, roadW, H * 0.2);
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

  function drawObject(o) {
    const x = o.x;
    const y = o.y + Math.sin(o.bob || 0) * (o.type === "coin" ? 4 : 0);
    if (o.type === "cone") drawCone(x, y);
    else if (o.type === "barrel") drawBarrel(x, y);
    else if (o.type === "rival") drawRival(x, y, o.color);
    else if (o.type === "boss") drawBoss(x, y);
    else if (o.type === "coin") drawCoin(x, y);
    else if (o.type === "nitro") drawPickup(x, y, "#4dabf7", "N");
    else if (o.type === "shield") drawPickup(x, y, "#51cf66", "S");
  }

  function drawCone(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 18, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createLinearGradient(0, -22, 0, 18);
    g.addColorStop(0, "#ff922b");
    g.addColorStop(1, "#e8590c");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(16, 16);
    ctx.lineTo(-16, 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff4e0";
    ctx.fillRect(-10, -2, 20, 6);
    ctx.fillRect(-12, 8, 24, 5);
    ctx.restore();
  }

  function drawBarrel(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 20, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createLinearGradient(-16, 0, 16, 0);
    g.addColorStop(0, "#c92a2a");
    g.addColorStop(0.5, "#fa5252");
    g.addColorStop(1, "#c92a2a");
    ctx.fillStyle = g;
    roundRect(-16, -20, 32, 40, 10);
    ctx.fill();
    ctx.fillStyle = "#fff4e0";
    ctx.fillRect(-16, -6, 32, 7);
    ctx.fillStyle = "#212529";
    ctx.fillRect(-16, 6, 32, 4);
    ctx.restore();
  }

  function drawRival(x, y, color) {
    drawCuteCar(x, y, color || "#74c0fc", "#ffe066", 0.92, false);
  }

  function drawBoss(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(0, 52, 40, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cab
    const g = ctx.createLinearGradient(-36, -50, 36, 40);
    g.addColorStop(0, "#868e96");
    g.addColorStop(0.5, "#495057");
    g.addColorStop(1, "#343a40");
    ctx.fillStyle = g;
    roundRect(-36, -48, 72, 90, 16);
    ctx.fill();
    // Trailer bit
    ctx.fillStyle = "#adb5bd";
    roundRect(-42, -10, 84, 50, 12);
    ctx.fill();
    // Eyes
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(-14, -18, 10, 12, 0, 0, Math.PI * 2);
    ctx.ellipse(14, -18, 10, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#212529";
    ctx.beginPath();
    ctx.arc(-12, -16, 4, 0, Math.PI * 2);
    ctx.arc(16, -16, 4, 0, Math.PI * 2);
    ctx.fill();
    // Grille frown
    ctx.strokeStyle = "#ff6b6b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 8, 12, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    // Horns lights
    ctx.fillStyle = "#ffd43b";
    ctx.beginPath();
    ctx.arc(-28, -40, 5, 0, Math.PI * 2);
    ctx.arc(28, -40, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCoin(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(255, 212, 59, 0.35)";
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, 14);
    g.addColorStop(0, "#fff3bf");
    g.addColorStop(0.5, "#ffd43b");
    g.addColorStop(1, "#f59f00");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f08c00";
    ctx.font = "800 12px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("★", 0, 1);
    ctx.restore();
  }

  function drawPickup(x, y, color, letter) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    roundRect(-14, -14, 28, 28, 10);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "800 14px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, 0, 1);
    ctx.restore();
  }

  function currentPaint() {
    return PAINTS.find((p) => p.id === meta.paint) || PAINTS[0];
  }

  function drawCar(x, y) {
    const paint = currentPaint();
    const squash = 1 + state.bounce * 0.08;
    const stretch = 1 - state.bounce * 0.06;
    const nitroOn = state.nitro > 0 || state.holdNitro;
    drawCuteCar(x, y, paint.body, paint.accent, 1, true, squash, stretch, nitroOn);
    if (state.shield > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(105, 219, 124, ${0.45 + Math.sin(state.t * 8) * 0.2})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(x, y, 42, 48, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (state.invuln > 0 && Math.floor(state.t * 20) % 2 === 0) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.restore();
    }
  }

  function drawCuteCar(x, y, body, accent, scale, hero, squash = 1, stretch = 1, nitro = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale * stretch, scale * squash);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 34, 28, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nitro flames
    if (nitro) {
      const flick = 0.8 + Math.sin(state.t * 30) * 0.2;
      ctx.fillStyle = "#ffa94d";
      ctx.beginPath();
      ctx.moveTo(-10, 30);
      ctx.quadraticCurveTo(0, 30 + 28 * flick, 10, 30);
      ctx.quadraticCurveTo(0, 30 + 14 * flick, -10, 30);
      ctx.fill();
      ctx.fillStyle = "#fff3bf";
      ctx.beginPath();
      ctx.moveTo(-5, 30);
      ctx.quadraticCurveTo(0, 30 + 16 * flick, 5, 30);
      ctx.fill();
    }

    // Body
    const g = ctx.createLinearGradient(-30, -30, 30, 30);
    g.addColorStop(0, shade(body, 25));
    g.addColorStop(0.45, body);
    g.addColorStop(1, shade(body, -25));
    ctx.fillStyle = g;
    roundRect(-28, -30, 56, 58, 18);
    ctx.fill();

    // Hood smile plate
    ctx.fillStyle = accent;
    roundRect(-18, 6, 36, 14, 8);
    ctx.fill();

    // Windshield
    const glass = ctx.createLinearGradient(0, -28, 0, -2);
    glass.addColorStop(0, "#e7f5ff");
    glass.addColorStop(1, "#74c0fc");
    ctx.fillStyle = glass;
    roundRect(-18, -26, 36, 22, 10);
    ctx.fill();

    // Eyes (Pixar expressive)
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(-10, -14, 8, 9, 0, 0, Math.PI * 2);
    ctx.ellipse(10, -14, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#212529";
    const look = hero ? (state.targetLane - 1) * 1.5 : 0;
    ctx.beginPath();
    ctx.arc(-10 + look, -13, 3.2, 0, Math.PI * 2);
    ctx.arc(10 + look, -13, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-11 + look, -15, 1.1, 0, Math.PI * 2);
    ctx.arc(9 + look, -15, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = "#212529";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 12, 7, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // Wheels
    ctx.fillStyle = "#212529";
    roundRect(-30, 8, 10, 18, 4);
    roundRect(20, 8, 10, 18, 4);
    ctx.fillStyle = "#868e96";
    roundRect(-28, 12, 6, 8, 2);
    roundRect(22, 12, 6, 8, 2);

    // Headlights
    ctx.fillStyle = "#fff9db";
    ctx.beginPath();
    ctx.ellipse(-16, -28, 5, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(16, -28, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (hero) {
      // Roof fin
      ctx.fillStyle = shade(body, -15);
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(6, -22);
      ctx.lineTo(-6, -22);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  function shade(hex, amt) {
    const n = hex.replace("#", "");
    const num = parseInt(n, 16);
    let r = (num >> 16) + amt;
    let g = ((num >> 8) & 0xff) + amt;
    let b = (num & 0xff) + amt;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  }

  // Input — pointer on canvas with capture (iframe-safe)
  function onPointerDown(e) {
    if (state.mode !== "play") return;
    canvas.setPointerCapture(e.pointerId);
    state.pointerId = e.pointerId;
    state.pointerX = e.clientX;
    state.lastLaneSwipeX = e.clientX;
    state.holdNitro = true;
  }

  function onPointerMove(e) {
    if (state.mode !== "play" || state.pointerId !== e.pointerId) return;
    const dx = e.clientX - state.lastLaneSwipeX;
    if (Math.abs(dx) > 28) {
      setLane(state.targetLane + (dx > 0 ? 1 : -1));
      state.lastLaneSwipeX = e.clientX;
    }
    state.pointerX = e.clientX;
  }

  function onPointerUp(e) {
    if (state.pointerId !== e.pointerId) return;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    state.pointerId = null;
    state.holdNitro = false;
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      if (state.mode === "play") setLane(state.targetLane - 1);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      if (state.mode === "play") setLane(state.targetLane + 1);
    } else if (e.key === " " || e.key === "Shift") {
      e.preventDefault();
      if (state.mode === "play") state.holdNitro = true;
    } else if (e.key === "p" || e.key === "P" || e.key === "Escape") {
      if (state.mode === "play") {
        state.mode = "pause";
        pauseCard.hidden = false;
      } else if (state.mode === "pause") {
        state.mode = "play";
        pauseCard.hidden = true;
      }
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === " " || e.key === "Shift") state.holdNitro = false;
  });

  document.getElementById("startBtn").addEventListener("click", () => {
    // Cycle paint among unlocked on each menu start for variety feel
    resetRun(false);
  });
  document.getElementById("dailyBtn").addEventListener("click", () => resetRun(true));
  document.getElementById("againBtn").addEventListener("click", () => resetRun(state.daily));
  document.getElementById("menuBtn").addEventListener("click", () => {
    state.mode = "menu";
    endCard.hidden = true;
    overlay.hidden = false;
    hud.hidden = true;
    progress.hidden = true;
    refreshBestLine();
  });
  document.getElementById("resumeBtn").addEventListener("click", () => {
    state.mode = "play";
    pauseCard.hidden = true;
  });

  // Tap edges on canvas without swipe still changes lane toward pointer
  canvas.addEventListener("pointerdown", (e) => {
    if (state.mode !== "play") return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    if (Math.abs(e.clientX - (state.lastLaneSwipeX || e.clientX)) < 8) {
      // quick tap: jump toward side
      if (x < W * 0.33) setLane(state.targetLane - 1);
      else if (x > W * 0.66) setLane(state.targetLane + 1);
    }
  });

  window.addEventListener("resize", resize);
  resize();
  refreshBestLine();

  // Ensure menu has ambient hills/clouds
  state.rng = mulberry32(42);
  state.hills = [
    { x: W * 0.25, y: H * 0.34, r: 130, hue: 108 },
    { x: W * 0.75, y: H * 0.32, r: 150, hue: 98 },
  ];
  state.clouds = [
    { x: 70, y: 80, s: 1, v: 0.2 },
    { x: 200, y: 120, s: 0.75, v: 0.15 },
    { x: 320, y: 60, s: 0.9, v: 0.18 },
  ];

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Dev helper for Baiolo card captures (safe no-op in normal play)
  window.__sunnyShot = function () {
    resetRun(false);
    state.stage = 2;
    state.score = 1840;
    state.coinsRun = 12;
    state.nearMiss = 3;
    state.nearMissTimer = 3;
    state.nitro = 1.5;
    state.objects = [];
    const mk = (type, lane, y, extra = {}) => {
      const o = {
        type,
        lane,
        x: laneX(lane),
        y,
        w: 46,
        h: 54,
        passed: false,
        nearMissed: false,
        hp: 1,
        bob: 0,
        ...extra,
      };
      if (type === "rival") {
        o.w = 52;
        o.h = 70;
        o.color = extra.color || "#74c0fc";
      } else if (type === "boss") {
        o.w = 78;
        o.h = 110;
      } else if (type === "cone") {
        o.w = 36;
        o.h = 42;
      } else if (type === "barrel") {
        o.w = 42;
        o.h = 48;
      } else {
        o.w = 28;
        o.h = 28;
      }
      return o;
    };
    state.objects.push(
      mk("cone", 0, H * 0.36),
      mk("rival", 2, H * 0.3, { color: "#74c0fc" }),
      mk("barrel", 0, H * 0.52),
      mk("coin", 1, H * 0.4),
      mk("coin", 2, H * 0.5),
      mk("nitro", 0, H * 0.22),
      mk("boss", 1, H * 0.14, { sway: 0 }),
    );
    state.bossActive = true;
    state.targetLane = 2;
    state.lane = 2;
    state.carX = laneX(2);
    state.baseSpeed = 0;
    state.speed = 0;
    state.spawnTimer = 99999;
    state._freeze = true;
    showCombo(3);
    updateHud();
    return true;
  };
})();
