/* Foxfire Hollow — engine.
 *
 * A precision platformer: run, variable jump, wall jump and an 8-way ember
 * dash. Instant respawns, generous coyote time and jump buffering keep the
 * feel forgiving; the levels do the teaching.
 */
(() => {
  "use strict";

  const Art = window.FoxfireArt;
  const Levels = window.FoxfireLevels;
  const T = Levels.T;
  const TILE = Art.TILE;

  /* ------------------------------------------------------------ constants */

  const GRAVITY = 1650;
  const MAX_FALL = 660;
  const RUN_SPEED = 215;
  const ACCEL_GROUND = 2300;
  const ACCEL_AIR = 1500;
  const FRICTION_GROUND = 2600;
  const FRICTION_AIR = 520;
  const JUMP_VEL = 600;
  const JUMP_CUT = 0.42;
  const COYOTE = 0.1;
  const BUFFER = 0.13;
  const WALL_SLIDE_MAX = 120;
  const WALL_JUMP_X = 265;
  const WALL_JUMP_Y = 560;
  const WALL_LOCK = 0.14;
  const DASH_SPEED = 470;
  const DASH_TIME = 0.15;
  const DASH_END_SPEED = 250;
  const STOMP_VEL = 470;
  const SHROOM_VEL = 800;
  const PW = 18;
  const PH = 26;

  const STORAGE_KEY = "baiolo.foxfire-hollow.v1";

  /* ----------------------------------------------------------------- dom */

  const $ = (id) => document.getElementById(id);
  const frame = $("frame");
  const canvas = $("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const els = {
    hud: $("hud"),
    levelName: $("levelName"),
    timer: $("timer"),
    seeds: $("seeds"),
    petal: $("petalPip"),
    deaths: $("deaths"),
    emberPip: $("emberPip"),
    title: $("titleCard"),
    titleBest: $("titleBest"),
    map: $("mapCard"),
    grid: $("levelGrid"),
    mapTotals: $("mapTotals"),
    skinRow: $("skinRow"),
    pause: $("pauseCard"),
    win: $("winCard"),
    winTitle: $("winTitle"),
    winTime: $("winTime"),
    winStats: $("winStats"),
    winMedal: $("winMedal"),
    nextBtn: $("nextBtn"),
    banner: $("banner"),
    touch: $("touch"),
    soundBtn: $("soundBtn"),
    soundBtn2: $("soundBtn2"),
  };

  /* ---------------------------------------------------------------- save */

  const defaultSave = () => ({
    v: 1,
    levels: {},
    skin: "ember",
    sound: true,
    lastIndex: 0,
  });

  let save = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSave();
      return { ...defaultSave(), ...JSON.parse(raw) };
    } catch {
      return defaultSave();
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    } catch {
      /* private mode — play on, just don't remember */
    }
  }

  function levelSave(id) {
    if (!save.levels[id]) save.levels[id] = { done: false, best: 0, seeds: 0, petal: false, deaths: 0 };
    return save.levels[id];
  }

  const totalSeeds = () =>
    Object.values(save.levels).reduce((n, l) => n + (l.seeds || 0), 0);
  const totalPetals = () =>
    Object.values(save.levels).reduce((n, l) => n + (l.petal ? 1 : 0), 0);
  const clearedCount = () => Object.values(save.levels).filter((l) => l.done).length;

  function skinUnlocked(skin) {
    if (skin.petals) return totalPetals() >= skin.petals;
    return totalSeeds() >= skin.cost;
  }

  function isLevelUnlocked(i) {
    if (i === 0) return true;
    const prev = Levels.LEVELS[i - 1];
    return !!save.levels[prev.id]?.done;
  }

  /* --------------------------------------------------------------- audio */

  const audio = {
    ac: null,
    master: null,
    musicGain: null,
    musicTimer: 0,
    chord: 0,
  };

  function audioReady() {
    if (audio.ac) {
      if (audio.ac.state === "suspended") audio.ac.resume();
      return audio.ac;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audio.ac = new AC();
    audio.master = audio.ac.createGain();
    audio.master.gain.value = save.sound ? 0.5 : 0;
    audio.master.connect(audio.ac.destination);
    audio.musicGain = audio.ac.createGain();
    audio.musicGain.gain.value = 0.14;
    audio.musicGain.connect(audio.master);
    return audio.ac;
  }

  function tone(freq, dur, type, vol, slideTo, delay = 0) {
    const ac = audio.ac;
    if (!ac || !save.sound) return;
    const t0 = ac.currentTime + delay;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol ?? 0.18, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(audio.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, filterFrom, filterTo) {
    const ac = audio.ac;
    if (!ac || !save.sound) return;
    const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(filterFrom, ac.currentTime);
    bp.frequency.exponentialRampToValueAtTime(filterTo, ac.currentTime + dur);
    const g = ac.createGain();
    g.gain.value = vol;
    src.connect(bp);
    bp.connect(g);
    g.connect(audio.master);
    src.start();
  }

  const SFX = {
    jump: () => tone(340, 0.16, "triangle", 0.16, 620),
    land: () => noise(0.1, 0.1, 700, 180),
    dash: () => {
      noise(0.22, 0.16, 1800, 300);
      tone(520, 0.18, "sawtooth", 0.06, 180);
    },
    seed: (n) => tone(660 * Math.pow(1.0595, Math.min(14, n % 15)), 0.16, "triangle", 0.12, null),
    petal: () => {
      [0, 0.09, 0.18, 0.3].forEach((d, i) => tone([784, 988, 1175, 1568][i], 0.5, "sine", 0.13, null, d));
    },
    bloom: () => tone(880, 0.14, "sine", 0.1, 1320),
    check: () => {
      tone(523, 0.4, "sine", 0.12);
      tone(784, 0.5, "sine", 0.09, null, 0.06);
    },
    stomp: () => {
      noise(0.14, 0.14, 500, 120);
      tone(180, 0.16, "square", 0.1, 90);
    },
    bounce: () => tone(280, 0.22, "sine", 0.16, 700),
    die: () => {
      tone(320, 0.5, "sawtooth", 0.12, 70);
      noise(0.3, 0.1, 900, 120);
    },
    win: () => {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.8, "sine", 0.14, null, i * 0.1));
    },
    unlock: () => {
      [659, 880, 1319].forEach((f, i) => tone(f, 0.6, "triangle", 0.12, null, i * 0.08));
    },
    ui: () => tone(520, 0.08, "sine", 0.08, 660),
  };

  const MUSIC_SCALE = [0, 3, 5, 7, 10, 12, 15];
  const MUSIC_ROOT = { moss: 220, cavern: 164.81, sky: 196 };

  function musicStep(dt) {
    if (!audio.ac || !save.sound || state.mode !== "play") return;
    audio.musicTimer -= dt;
    if (audio.musicTimer > 0) return;
    audio.musicTimer = 1.1 + Math.random() * 1.3;
    const root = MUSIC_ROOT[level?.def.biome || "moss"];
    const ac = audio.ac;
    const note = MUSIC_SCALE[Math.floor(Math.random() * MUSIC_SCALE.length)];
    const freq = root * Math.pow(2, note / 12) * (Math.random() > 0.7 ? 2 : 1);
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.05, ac.currentTime + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 2.2);
    o.connect(g);
    g.connect(audio.musicGain);
    o.start();
    o.stop(ac.currentTime + 2.4);
  }

  function setSound(on) {
    save.sound = on;
    persist();
    if (audio.master) audio.master.gain.value = on ? 0.5 : 0;
    const label = on ? "🔊 Sound on" : "🔇 Sound off";
    if (els.soundBtn) els.soundBtn.textContent = label;
    if (els.soundBtn2) els.soundBtn2.textContent = label;
  }

  /* --------------------------------------------------------------- input */

  const input = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    jumpPressed: false,
    dash: false,
    dashPressed: false,
  };

  const KEYS = {
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
    ArrowUp: "up",
    KeyW: "up",
    ArrowDown: "down",
    KeyS: "down",
    Space: "jump",
    KeyZ: "jump",
    KeyJ: "jump",
    ShiftLeft: "dash",
    ShiftRight: "dash",
    KeyX: "dash",
    KeyK: "dash",
  };

  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape" || e.code === "KeyP") {
      if (state.mode === "play") pause();
      else if (state.mode === "pause") resume();
      e.preventDefault();
      return;
    }
    if (e.code === "KeyR" && (state.mode === "play" || state.mode === "pause")) {
      startLevel(state.index);
      e.preventDefault();
      return;
    }
    const k = KEYS[e.code];
    if (!k) return;
    e.preventDefault();
    if (k === "jump" && !input.jump) input.jumpPressed = true;
    if (k === "dash" && !input.dash) input.dashPressed = true;
    if (k === "up" && !input.up && !input.jump) input.jumpPressed = true;
    input[k] = true;
  });

  window.addEventListener("keyup", (e) => {
    const k = KEYS[e.code];
    if (!k) return;
    e.preventDefault();
    input[k] = false;
  });

  window.addEventListener("blur", () => {
    for (const k of Object.keys(input)) input[k] = false;
    if (state.mode === "play") pause();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.mode === "play") pause();
  });

  function bindTouch(el, key) {
    const on = (e) => {
      e.preventDefault();
      document.body.classList.add("touch");
      if (key === "jump" && !input.jump) input.jumpPressed = true;
      if (key === "dash" && !input.dash) input.dashPressed = true;
      input[key] = true;
      el.classList.add("down");
      audioReady();
    };
    const off = (e) => {
      e.preventDefault();
      input[key] = false;
      el.classList.remove("down");
    };
    el.addEventListener("pointerdown", on);
    el.addEventListener("pointerup", off);
    el.addEventListener("pointercancel", off);
    el.addEventListener("pointerleave", off);
  }

  bindTouch($("padLeft"), "left");
  bindTouch($("padRight"), "right");
  bindTouch($("padUp"), "up");
  bindTouch($("padDown"), "down");
  bindTouch($("btnJump"), "jump");
  bindTouch($("btnDash"), "dash");

  // show the thumb controls up front on touch devices — waiting for the first
  // touch leaves a phone player looking at a game with no visible controls
  if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
    document.body.classList.add("touch");
  }
  window.addEventListener(
    "touchstart",
    () => {
      document.body.classList.add("touch");
    },
    { once: true, passive: true },
  );

  /* --------------------------------------------------------------- state */

  const state = {
    mode: "title", // title | map | play | pause | win
    index: 0,
    time: 0,
    deaths: 0,
    seeds: 0,
    petal: false,
    shake: 0,
    flash: 0,
    fade: 0,
    respawnT: 0,
    chaseX: -Infinity,
    hintAlpha: 0,
    hintLines: null,
    banner: 0,
  };

  let level = null;
  let terrain = null;
  let ents = [];
  let particles = [];
  let ghosts = [];
  const camera = { x: 0, y: 0, tx: 0, ty: 0, scale: 1, w: 0, h: 0 };

  const fox = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: false,
    groundedT: 0,
    jumpBufferT: 0,
    wall: 0,
    wallT: 0,
    lockT: 0,
    dashT: 0,
    dashDx: 0,
    dashDy: 0,
    dashReady: true,
    dashCool: 0,
    animT: 0,
    squash: 1,
    blink: 0,
    blinkT: 2,
    squint: false,
    earBack: false,
    headTilt: 0,
    eyeDx: 0,
    alive: true,
    scarf: [],
    respawnX: 0,
    respawnY: 0,
    platform: null,
  };

  const skin = () => Art.SKINS.find((s) => s.id === save.skin) || Art.SKINS[0];

  /* ------------------------------------------------------------- helpers */

  const reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function tileAt(tx, ty) {
    if (!level) return T.EMPTY;
    if (tx < 0 || tx >= level.w) return T.SOLID;
    if (ty < 0) return T.EMPTY;
    if (ty >= level.h) return T.EMPTY;
    return level.tiles[ty * level.w + tx];
  }

  function isSolid(tx, ty) {
    const v = tileAt(tx, ty);
    if (v === T.SOLID) return true;
    if (v === T.CRUMBLE) {
      const c = crumbles.get(ty * level.w + tx);
      return !c || !c.gone;
    }
    return false;
  }

  const crumbles = new Map();

  function addParticles(kind, x, y, n, opts = {}) {
    if (reduceMotion) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const a = opts.angle != null ? opts.angle + (Math.random() - 0.5) * (opts.spread ?? 1) : Math.random() * Math.PI * 2;
      const sp = (opts.speed ?? 90) * (0.4 + Math.random() * 0.9);
      particles.push({
        kind,
        x: x + (Math.random() - 0.5) * (opts.jitter ?? 6),
        y: y + (Math.random() - 0.5) * (opts.jitter ?? 6),
        vx: Math.cos(a) * sp + (opts.vx || 0),
        vy: Math.sin(a) * sp + (opts.vy || 0),
        life: (opts.life ?? 0.5) * (0.6 + Math.random() * 0.8),
        max: opts.life ?? 0.5,
        size: (opts.size ?? 3) * (0.6 + Math.random() * 0.9),
        grav: opts.grav ?? 260,
        color: opts.color || "#ffd9a0",
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 8,
      });
    }
  }

  function shake(v) {
    if (reduceMotion) return;
    state.shake = Math.min(18, state.shake + v);
  }

  function toast(text, sub) {
    els.banner.innerHTML = `<strong>${text}</strong>${sub ? `<span>${sub}</span>` : ""}`;
    els.banner.hidden = false;
    els.banner.classList.remove("show");
    void els.banner.offsetWidth;
    els.banner.classList.add("show");
    state.banner = 2.6;
  }

  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s - m * 60;
    return `${m}:${sec.toFixed(2).padStart(5, "0")}`;
  };

  /* ---------------------------------------------------------- level load */

  /** iOS caps total canvas memory; a dropped reference is not enough. */
  function releaseTerrain() {
    if (!terrain) return;
    terrain.width = 0;
    terrain.height = 0;
    terrain = null;
  }

  function startLevel(index, keepStats) {
    try {
      loadLevel(index, keepStats);
    } catch (err) {
      // baking a level is the heaviest thing the game does — if it fails on a
      // low-memory device, say so instead of leaving the start fade on screen
      state.fade = 0;
      crash(err);
    }
  }

  function loadLevel(index, keepStats) {
    const def = Levels.LEVELS[index];
    if (!def) return;
    state.index = index;
    save.lastIndex = index;
    level = Levels.buildLevel(def);
    releaseTerrain();
    terrain = Art.bakeTerrain(level, def.biome);
    crumbles.clear();
    ents = [];
    particles = [];
    ghosts = [];

    for (const e of level.entities) {
      const base = {
        ...e,
        px: e.x * TILE + TILE / 2,
        py: e.y * TILE + TILE / 2,
        t: Math.random() * 6,
        bob: Math.random() * 6,
      };
      switch (e.type) {
        case "seed":
        case "petal":
          ents.push({ ...base, taken: false });
          break;
        case "bloom":
          ents.push({ ...base, cool: 0 });
          break;
        case "shroom":
          ents.push({ ...base, py: e.y * TILE + TILE, squash: 1 });
          break;
        case "check":
          ents.push({ ...base, py: e.y * TILE + TILE, lit: false });
          break;
        case "bug":
          ents.push({ ...base, py: e.y * TILE + TILE, dir: -1, dead: 0, walk: 0 });
          break;
        case "wisp":
          ents.push({ ...base, home: e.y * TILE + TILE / 2, dead: 0 });
          break;
        case "mover":
          ents.push({
            ...base,
            px: e.x * TILE,
            py: e.y * TILE,
            ox: e.x * TILE,
            oy: e.y * TILE,
            w: e.len * TILE,
            h: 14,
            phase: 0,
            vx: 0,
            vy: 0,
          });
          break;
        case "hint":
          ents.push({ ...base, py: e.y * TILE + TILE });
          break;
        default:
          break;
      }
    }
    ents.push({
      type: "exit",
      px: level.exit.x * TILE + TILE / 2,
      py: level.exit.y * TILE + TILE,
      t: 0,
      lit: false,
    });

    fox.respawnX = level.spawn.x * TILE + TILE / 2;
    fox.respawnY = level.spawn.y * TILE + TILE;
    placeFox(true);

    if (!keepStats) {
      state.time = 0;
      state.deaths = 0;
      state.seeds = 0;
      state.petal = false;
    }
    state.chaseX = def.chase ? def.chase.start * TILE : -Infinity;
    state.fade = 1;
    state.mode = "play";
    state.hintAlpha = 0;
    hideCards();
    els.hud.hidden = false;
    els.levelName.textContent = `${index + 1}. ${def.name}`;
    updateHud();
    resize();
    camera.x = clampCamX(fox.x - camera.w / 2);
    camera.y = clampCamY(fox.y - camera.h * 0.6);
    audioReady();
  }

  function placeFox(full) {
    fox.x = fox.respawnX;
    fox.y = fox.respawnY;
    fox.vx = 0;
    fox.vy = 0;
    fox.grounded = false;
    fox.dashT = 0;
    fox.dashReady = true;
    fox.lockT = 0;
    fox.alive = true;
    fox.squash = 1;
    fox.platform = null;
    fox.scarf = [];
    for (let i = 0; i < 6; i++) fox.scarf.push({ x: fox.x, y: fox.y - 24, px: fox.x, py: fox.y - 24 });
    if (full) fox.facing = 1;
    addParticles("spark", fox.x, fox.y - PH / 2, 18, {
      color: skin().glow,
      speed: 150,
      life: 0.5,
      grav: -40,
      size: 3,
    });
  }

  /* -------------------------------------------------------------- physics */

  function boxTiles(x, y, w, h) {
    return {
      x0: Math.floor(x / TILE),
      x1: Math.floor((x + w - 0.001) / TILE),
      y0: Math.floor(y / TILE),
      y1: Math.floor((y + h - 0.001) / TILE),
    };
  }

  function moveX(dx) {
    fox.x += dx;
    const left = fox.x - PW / 2;
    const b = boxTiles(left, fox.y - PH, PW, PH);
    for (let ty = b.y0; ty <= b.y1; ty++) {
      for (let tx = b.x0; tx <= b.x1; tx++) {
        if (!isSolid(tx, ty)) continue;
        if (dx > 0) fox.x = tx * TILE - PW / 2 - 0.01;
        else fox.x = (tx + 1) * TILE + PW / 2 + 0.01;
        fox.vx = 0;
        return true;
      }
    }
    return false;
  }

  function moveY(dy) {
    const prevBottom = fox.y;
    fox.y += dy;
    const left = fox.x - PW / 2;
    const b = boxTiles(left, fox.y - PH, PW, PH);
    for (let ty = b.y0; ty <= b.y1; ty++) {
      for (let tx = b.x0; tx <= b.x1; tx++) {
        const v = tileAt(tx, ty);
        const solid = isSolid(tx, ty);
        const oneway =
          v === T.ONEWAY && dy > 0 && prevBottom <= ty * TILE + 2 && !input.down;
        if (!solid && !oneway) continue;
        if (dy > 0) {
          fox.y = ty * TILE;
          land();
        } else {
          fox.y = (ty + 1) * TILE + PH;
          fox.vy = Math.max(0, fox.vy);
        }
        return true;
      }
    }
    return false;
  }

  function land() {
    if (!fox.grounded && !fox.wasGrounded) {
      const impact = Math.min(1, fox.vy / 700);
      fox.squash = 1 - impact * 0.28;
      if (fox.vy > 180) {
        addParticles("dust", fox.x, fox.y, 5 + impact * 8, {
          color: "rgba(255,246,224,0.85)",
          speed: 60 + impact * 90,
          life: 0.4,
          grav: 40,
          size: 3.4,
          angle: -Math.PI / 2,
          spread: 2.6,
        });
        SFX.land();
        if (impact > 0.7) shake(3);
      }
    }
    fox.grounded = true;
    fox.vy = 0;
    fox.dashReady = true;
  }

  function wallCheck() {
    const yTop = fox.y - PH + 3;
    const yBot = fox.y - 3;
    const check = (px) => {
      for (let y = yTop; y <= yBot; y += 6) {
        if (isSolid(Math.floor(px / TILE), Math.floor(y / TILE))) return true;
      }
      return false;
    };
    if (check(fox.x - PW / 2 - 2)) return -1;
    if (check(fox.x + PW / 2 + 2)) return 1;
    return 0;
  }

  function hasAbility(name) {
    // an ability is yours from the level that teaches it — and stays yours on replays
    const idx = Levels.LEVELS.findIndex((l) => l.unlocks === name);
    if (idx < 0) return false;
    return state.index >= idx || !!save.levels[Levels.LEVELS[idx].id]?.done;
  }

  function updateFox(dt) {
    if (!fox.alive) return;
    const canDash = hasAbility("dash");
    const canWall = hasAbility("wall");

    fox.animT += dt;
    fox.blinkT -= dt;
    if (fox.blinkT <= 0) {
      fox.blink = 0.12;
      fox.blinkT = 1.6 + Math.random() * 3.4;
    }
    fox.blink = Math.max(0, fox.blink - dt);
    fox.squash += (1 - fox.squash) * Math.min(1, dt * 12);

    if (input.jumpPressed) {
      fox.jumpBufferT = BUFFER;
      input.jumpPressed = false;
    }
    fox.jumpBufferT -= dt;
    fox.lockT -= dt;
    fox.dashCool -= dt;

    const dirIn = (input.right ? 1 : 0) - (input.left ? 1 : 0);

    // --- dash
    if (fox.dashT > 0) {
      fox.dashT -= dt;
      fox.vx = fox.dashDx * DASH_SPEED;
      fox.vy = fox.dashDy * DASH_SPEED;
      if (fox.dashT <= 0) {
        fox.vx = fox.dashDx * DASH_END_SPEED;
        fox.vy = fox.dashDy < 0 ? fox.vy * 0.42 : fox.vy * 0.2;
      }
      if (Math.random() < 0.8) {
        addParticles("ember", fox.x, fox.y - PH / 2, 1, {
          color: skin().glow,
          speed: 30,
          life: 0.45,
          grav: -20,
          size: 3.6,
        });
      }
    } else if (input.dashPressed && canDash && fox.dashReady && fox.dashCool <= 0) {
      let dx = dirIn;
      let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      if (!dx && !dy) dx = fox.facing;
      const len = Math.hypot(dx, dy) || 1;
      fox.dashDx = dx / len;
      fox.dashDy = dy / len;
      fox.dashT = DASH_TIME;
      fox.dashCool = 0.18;
      fox.dashReady = false;
      fox.lockT = 0;
      if (dx) fox.facing = Math.sign(dx);
      SFX.dash();
      shake(2.5);
      state.flash = Math.max(state.flash, 0.18);
      addParticles("spark", fox.x, fox.y - PH / 2, 16, {
        color: skin().glow,
        speed: 200,
        life: 0.4,
        grav: 0,
        size: 3,
        angle: Math.atan2(fox.dashDy, fox.dashDx) + Math.PI,
        spread: 1.4,
      });
    }
    input.dashPressed = false;

    const dashing = fox.dashT > 0;

    // --- horizontal
    if (!dashing && fox.lockT <= 0) {
      const accel = fox.grounded ? ACCEL_GROUND : ACCEL_AIR;
      if (dirIn) {
        // dash and wall-jump momentum is kept, then bled back down to run speed
        const carrying = Math.abs(fox.vx) > RUN_SPEED && Math.sign(fox.vx) === dirIn;
        if (carrying) {
          fox.vx -= Math.sign(fox.vx) * 900 * dt;
        } else {
          fox.vx += dirIn * accel * dt;
          if (Math.abs(fox.vx) > RUN_SPEED) fox.vx = dirIn * RUN_SPEED;
        }
        fox.facing = dirIn;
      } else {
        const fr = (fox.grounded ? FRICTION_GROUND : FRICTION_AIR) * dt;
        fox.vx = Math.abs(fox.vx) <= fr ? 0 : fox.vx - Math.sign(fox.vx) * fr;
      }
    }

    // --- walls
    const wall = canWall ? wallCheck() : 0;
    const pressingWall = wall !== 0 && dirIn === wall && !fox.grounded;
    const sliding = pressingWall && fox.vy > 0 && !dashing;

    // --- vertical
    if (!dashing) {
      fox.vy += GRAVITY * (fox.vy < 0 && input.jump ? 0.9 : 1) * dt;
      if (sliding) {
        fox.vy = Math.min(fox.vy, WALL_SLIDE_MAX);
        if (Math.random() < 0.35)
          addParticles("dust", fox.x + wall * 10, fox.y - PH / 2, 1, {
            color: "rgba(255,240,214,0.6)",
            speed: 20,
            life: 0.35,
            grav: 90,
            size: 2.4,
          });
      }
      fox.vy = Math.min(fox.vy, MAX_FALL);
    }

    // --- jump
    if (fox.grounded) fox.groundedT = COYOTE;
    else fox.groundedT -= dt;
    if (wall !== 0 && !fox.grounded) fox.wallT = 0.1;
    else fox.wallT -= dt;

    if (fox.jumpBufferT > 0 && !dashing) {
      if (fox.groundedT > 0) {
        fox.vy = -JUMP_VEL;
        fox.cutArmed = true;
        fox.grounded = false;
        fox.groundedT = 0;
        fox.jumpBufferT = 0;
        fox.squash = 1.22;
        SFX.jump();
        addParticles("dust", fox.x, fox.y, 7, {
          color: "rgba(255,246,224,0.8)",
          speed: 80,
          life: 0.35,
          grav: 60,
          size: 3,
          angle: -Math.PI / 2,
          spread: 2.4,
        });
      } else if (canWall && fox.wallT > 0 && wall !== 0) {
        fox.vy = -WALL_JUMP_Y;
        fox.cutArmed = true;
        fox.vx = -wall * WALL_JUMP_X;
        fox.facing = -wall;
        fox.lockT = WALL_LOCK;
        fox.jumpBufferT = 0;
        fox.wallT = 0;
        fox.squash = 1.2;
        SFX.jump();
        addParticles("dust", fox.x + wall * 9, fox.y - PH / 2, 9, {
          color: "rgba(255,246,224,0.8)",
          speed: 110,
          life: 0.4,
          grav: 120,
          size: 3,
          angle: wall > 0 ? Math.PI : 0,
          spread: 1.6,
        });
      }
    }
    // releasing the button clips the jump short — but only a jump, never a
    // mushroom bounce or an updraft
    if (fox.cutArmed && !input.jump && !dashing) {
      if (fox.vy < -140) fox.vy *= JUMP_CUT;
      fox.cutArmed = false;
    }
    if (fox.vy >= 0) fox.cutArmed = false;

    // --- integrate
    const wasGrounded = fox.grounded;
    fox.wasGrounded = wasGrounded;
    fox.grounded = false;
    const steps = Math.max(1, Math.ceil((Math.abs(fox.vx) + Math.abs(fox.vy)) * dt / 8));
    for (let i = 0; i < steps; i++) {
      moveX((fox.vx * dt) / steps);
      moveY((fox.vy * dt) / steps);
    }

    // --- updraft
    const b = boxTiles(fox.x - PW / 2, fox.y - PH, PW, PH);
    let inDraft = false;
    for (let ty = b.y0; ty <= b.y1; ty++)
      for (let tx = b.x0; tx <= b.x1; tx++) if (tileAt(tx, ty) === T.UPDRAFT) inDraft = true;
    if (inDraft && !dashing) {
      // has to comfortably beat gravity or the vent just slows your fall
      fox.vy = Math.max(-330, fox.vy - 3800 * dt);
      fox.dashReady = true;
      if (Math.random() < 0.4)
        addParticles("spark", fox.x + (Math.random() - 0.5) * 22, fox.y, 1, {
          color: "rgba(255,214,150,0.9)",
          speed: 10,
          life: 0.6,
          grav: -240,
          size: 2.6,
        });
    }

    if (wasGrounded && !fox.grounded && fox.vy >= 0) fox.groundedT = Math.max(fox.groundedT, COYOTE);

    // --- hazards
    checkHazards();

    // --- expression
    fox.squint = dashing;
    fox.earBack = dashing || fox.vy < -260;
    fox.headTilt = Math.max(-0.25, Math.min(0.25, fox.vy * 0.0004)) * fox.facing;
    fox.eyeDx = fox.grounded ? 0 : Math.max(-1, Math.min(1, fox.vy * 0.004));

    // --- scarf verlet
    const anchorX = fox.x - fox.facing * 5;
    const anchorY = fox.y - 22 * fox.squash;
    const wind = (level?.def.biome === "sky" ? -60 : -44) - fox.vx * 0.55;
    for (let i = 0; i < fox.scarf.length; i++) {
      const p = fox.scarf[i];
      if (i === 0) {
        p.x = anchorX;
        p.y = anchorY;
        p.px = anchorX;
        p.py = anchorY;
        continue;
      }
      const vx = (p.x - p.px) * 0.86;
      const vy = (p.y - p.py) * 0.86;
      p.px = p.x;
      p.py = p.y;
      p.x += vx + (wind - fox.vx * 0.08) * dt;
      p.y += vy + (230 - Math.abs(fox.vy) * 0.3) * dt;
    }
    for (let k = 0; k < 3; k++) {
      for (let i = 1; i < fox.scarf.length; i++) {
        const a = fox.scarf[i - 1];
        const p = fox.scarf[i];
        const dx = p.x - a.x;
        const dy = p.y - a.y;
        const d = Math.hypot(dx, dy) || 0.001;
        const diff = (d - 4.2) / d;
        p.x -= dx * diff * (i === 1 ? 1 : 0.55);
        p.y -= dy * diff * (i === 1 ? 1 : 0.55);
      }
    }

    // --- dash afterimages
    if (dashing && ghosts.length < 40) ghosts.push({ x: fox.x, y: fox.y, f: fox.facing, t: 0.28 });
  }

  function checkHazards() {
    if (!fox.alive) return;
    const inset = 5;
    const b = boxTiles(fox.x - PW / 2 + inset, fox.y - PH + inset, PW - inset * 2, PH - inset * 2);
    for (let ty = b.y0; ty <= b.y1; ty++) {
      for (let tx = b.x0; tx <= b.x1; tx++) {
        const v = tileAt(tx, ty);
        if (v === T.THORN || v === T.GLOOM) return die();
      }
    }
    if (fox.y > level.h * TILE + 80) return die();
    if (fox.x - PW / 2 < state.chaseX) return die();
  }

  function die() {
    if (!fox.alive) return;
    fox.alive = false;
    state.deaths++;
    state.respawnT = 0.55;
    SFX.die();
    shake(9);
    state.flash = 0.35;
    addParticles("ember", fox.x, fox.y - PH / 2, 34, {
      color: skin().fur,
      speed: 220,
      life: 0.8,
      grav: 120,
      size: 4,
    });
    addParticles("spark", fox.x, fox.y - PH / 2, 18, {
      color: "#fff3d0",
      speed: 300,
      life: 0.5,
      grav: 0,
      size: 3,
    });
    updateHud();
  }

  /* ------------------------------------------------------------- entities */

  function overlapsFox(x, y, w, h) {
    return (
      fox.x + PW / 2 > x - w / 2 &&
      fox.x - PW / 2 < x + w / 2 &&
      fox.y > y - h / 2 &&
      fox.y - PH < y + h / 2
    );
  }

  function updateEntities(dt) {
    for (const e of ents) {
      e.t += dt;
      switch (e.type) {
        case "seed": {
          if (e.taken) break;
          if (fox.alive && overlapsFox(e.px, e.py, 26, 26)) {
            e.taken = true;
            state.seeds++;
            SFX.seed(state.seeds);
            addParticles("spark", e.px, e.py, 12, {
              color: "#ffe6a8",
              speed: 130,
              life: 0.45,
              grav: -40,
              size: 2.6,
            });
            updateHud();
          }
          break;
        }
        case "petal": {
          if (e.taken) break;
          if (fox.alive && overlapsFox(e.px, e.py, 30, 30)) {
            e.taken = true;
            state.petal = true;
            SFX.petal();
            state.flash = 0.3;
            addParticles("spark", e.px, e.py, 40, {
              color: "#dff2ff",
              speed: 200,
              life: 0.9,
              grav: -30,
              size: 3.4,
            });
            toast("Moonpetal found", "A rare bloom for your collection");
            updateHud();
          }
          break;
        }
        case "bloom": {
          e.cool = Math.max(0, e.cool - dt);
          if (!e.cool && fox.alive && !fox.dashReady && overlapsFox(e.px, e.py, 30, 30)) {
            fox.dashReady = true;
            e.cool = 1.6;
            SFX.bloom();
            addParticles("spark", e.px, e.py, 14, {
              color: "#ffd08a",
              speed: 150,
              life: 0.5,
              grav: -30,
              size: 2.8,
            });
          }
          break;
        }
        case "shroom": {
          e.squash += (1 - e.squash) * Math.min(1, dt * 9);
          if (
            fox.alive &&
            fox.vy >= 0 &&
            fox.y <= e.py - 6 + fox.vy * dt + 8 &&
            overlapsFox(e.px, e.py - 12, 34, 26)
          ) {
            fox.y = e.py - 16;
            fox.vy = -SHROOM_VEL;
            fox.grounded = false;
            fox.dashReady = true;
            fox.squash = 1.3;
            e.squash = 0.5;
            SFX.bounce();
            shake(3);
            addParticles("spark", e.px, e.py - 14, 14, {
              color: "#ffd6f0",
              speed: 160,
              life: 0.5,
              grav: 200,
              size: 3,
              angle: -Math.PI / 2,
              spread: 2,
            });
          }
          break;
        }
        case "check": {
          if (!e.lit && fox.alive && overlapsFox(e.px, e.py - 20, 40, 44)) {
            e.lit = true;
            fox.respawnX = e.px;
            fox.respawnY = e.py;
            SFX.check();
            addParticles("spark", e.px, e.py - 26, 22, {
              color: "#ffe9b0",
              speed: 120,
              life: 0.8,
              grav: -60,
              size: 3,
            });
            toast("Shrine lit", "You'll wake up here");
          }
          break;
        }
        case "bug": {
          if (e.dead) {
            e.dead += dt;
            break;
          }
          e.walk += dt;
          const speed = 42;
          const nx = e.px + e.dir * speed * dt;
          const aheadX = Math.floor((nx + e.dir * 11) / TILE);
          const footY = Math.floor((e.py + 4) / TILE);
          const wallAhead = isSolid(aheadX, Math.floor((e.py - 8) / TILE));
          const groundAhead = isSolid(aheadX, footY) || tileAt(aheadX, footY) === T.ONEWAY;
          if (wallAhead || !groundAhead) e.dir *= -1;
          else e.px = nx;
          if (fox.alive && overlapsFox(e.px, e.py - 11, 30, 22)) {
            const stomping = fox.vy > 60 && fox.y < e.py - 8;
            if (stomping) {
              e.dead = 0.001;
              fox.vy = -STOMP_VEL;
              fox.dashReady = true;
              fox.squash = 1.25;
              SFX.stomp();
              shake(4);
              addParticles("ember", e.px, e.py - 10, 16, {
                color: "#b6f0a0",
                speed: 160,
                life: 0.5,
                grav: 300,
                size: 3,
              });
            } else die();
          }
          break;
        }
        case "wisp": {
          if (e.dead) {
            e.dead += dt;
            break;
          }
          e.py = e.home + Math.sin(e.t * e.speed) * e.amp * TILE;
          e.px = e.x * TILE + TILE / 2 + Math.cos(e.t * e.speed * 0.6) * TILE * 0.8;
          if (fox.alive && overlapsFox(e.px, e.py, 26, 26)) {
            if (fox.dashT > 0) {
              e.dead = 0.001;
              fox.dashReady = true;
              SFX.stomp();
              shake(4);
              state.flash = Math.max(state.flash, 0.2);
              addParticles("ember", e.px, e.py, 24, {
                color: "#c9a6ff",
                speed: 200,
                life: 0.6,
                grav: 60,
                size: 3.4,
              });
            } else die();
          }
          break;
        }
        case "mover": {
          e.phase += dt * (e.speed / (e.dist * TILE)) * Math.PI;
          const off = (1 - Math.cos(e.phase)) / 2;
          const nx = e.ox + (e.axis === "x" ? off * e.dist * TILE : 0);
          const ny = e.oy - (e.axis === "y" ? off * e.dist * TILE : 0);
          e.vx = (nx - e.px) / dt;
          e.vy = (ny - e.py) / dt;
          e.px = nx;
          e.py = ny;
          if (fox.alive) ridePlatform(e, dt);
          break;
        }
        case "hint": {
          if (fox.alive && Math.abs(fox.x - e.px) < 110 && Math.abs(fox.y - e.py) < 120) {
            state.hintAlpha = Math.min(1, state.hintAlpha + dt * 3);
            state.hintLines = e.lines;
            state.hintAt = e;
          } else if (state.hintAt === e) {
            state.hintAlpha = Math.max(0, state.hintAlpha - dt * 3);
          }
          break;
        }
        case "exit": {
          if (fox.alive && overlapsFox(e.px, e.py - 26, 46, 56)) winLevel(e);
          break;
        }
        default:
          break;
      }
    }

    // crumbling platforms
    for (const [key, c] of crumbles) {
      if (c.gone) {
        c.respawn -= dt;
        if (c.respawn <= 0) {
          c.gone = false;
          c.t = 0;
        }
      } else if (c.t > 0) {
        c.t -= dt;
        if (c.t <= 0) {
          c.gone = true;
          c.respawn = 2.2;
          const tx = key % level.w;
          const ty = Math.floor(key / level.w);
          addParticles("rock", tx * TILE + TILE / 2, ty * TILE + TILE / 2, 10, {
            color: "#8d6a50",
            speed: 70,
            life: 0.7,
            grav: 520,
            size: 4,
          });
        }
      }
    }
    // stepping on a crumble tile starts its timer
    if (fox.alive && fox.grounded) {
      const ty = Math.floor((fox.y + 2) / TILE);
      for (let tx = Math.floor((fox.x - PW / 2) / TILE); tx <= Math.floor((fox.x + PW / 2) / TILE); tx++) {
        if (tileAt(tx, ty) === T.CRUMBLE) {
          const key = ty * level.w + tx;
          if (!crumbles.has(key)) crumbles.set(key, { t: 0.42, gone: false, respawn: 0 });
          else if (!crumbles.get(key).gone && crumbles.get(key).t <= 0)
            crumbles.set(key, { t: 0.42, gone: false, respawn: 0 });
        }
      }
    }
  }

  function ridePlatform(e, dt) {
    const px = e.px;
    const py = e.py;
    const overlapX = fox.x + PW / 2 > px && fox.x - PW / 2 < px + e.w;
    if (!overlapX) return;
    const feet = fox.y;
    if (feet >= py - 12 && feet <= py + 14 && fox.vy >= -10) {
      fox.y = py;
      fox.vy = 0;
      fox.grounded = true;
      fox.dashReady = true;
      fox.x += e.vx * dt;
      if (e.vy < 0) fox.y += e.vy * dt;
    }
  }

  function winLevel(exitEnt) {
    if (state.mode !== "play") return;
    exitEnt.lit = true;
    state.mode = "win";
    SFX.win();
    state.flash = 0.5;
    addParticles("spark", exitEnt.px, exitEnt.py - 34, 60, {
      color: "#ffe6a8",
      speed: 260,
      life: 1.1,
      grav: -40,
      size: 3.6,
    });

    const def = Levels.LEVELS[state.index];
    const ls = levelSave(def.id);
    const time = state.time;
    const first = !ls.done;
    const improved = !ls.best || time < ls.best;
    const beforeSeeds = totalSeeds();
    const beforePetals = totalPetals();
    ls.done = true;
    if (improved) ls.best = time;
    ls.seeds = Math.max(ls.seeds, state.seeds);
    ls.petal = ls.petal || state.petal;
    ls.deaths = (ls.deaths || 0) + state.deaths;
    persist();

    const medal = medalFor(time, def.par);
    els.winTitle.textContent = first ? "Lantern lit!" : improved ? "New best time!" : "Lantern lit!";
    els.winTime.textContent = fmtTime(time);
    els.winMedal.textContent = medal.icon;
    els.winMedal.title = medal.label;
    els.winStats.innerHTML = `
      <span>🌰 ${state.seeds}/${level.seedTotal}</span>
      <span>🌙 ${state.petal ? "found" : "—"}</span>
      <span>💀 ${state.deaths}</span>
      <span>⏱ best ${fmtTime(ls.best)}</span>
      <span class="medal-label">${medal.label} · par ${def.par}s</span>`;
    els.nextBtn.textContent = state.index + 1 < Levels.LEVELS.length ? "Next hollow →" : "Level select";
    els.win.hidden = false;
    els.hud.hidden = true;

    // skin unlocks
    for (const s of Art.SKINS) {
      const wasLocked = s.petals ? beforePetals < s.petals : beforeSeeds < s.cost;
      if (wasLocked && skinUnlocked(s)) {
        SFX.unlock();
        toast(`${s.name} unlocked`, "Change coat in Level select");
      }
    }
  }

  function medalFor(time, par) {
    if (time <= par) return { icon: "🥇", label: "Gold" };
    if (time <= par * 1.4) return { icon: "🥈", label: "Silver" };
    return { icon: "🥉", label: "Bronze" };
  }

  /* --------------------------------------------------------------- camera */

  function clampCamX(x) {
    const worldW = level.w * TILE;
    if (worldW <= camera.w) return (worldW - camera.w) / 2;
    return Math.max(0, Math.min(worldW - camera.w, x));
  }

  function clampCamY(y) {
    const worldH = level.h * TILE;
    if (worldH <= camera.h) return (worldH - camera.h) / 2;
    return Math.max(0, Math.min(worldH - camera.h, y));
  }

  function updateCamera(dt) {
    const lookX = fox.facing * 44 + fox.vx * 0.16;
    const lookY = Math.max(-40, Math.min(70, fox.vy * 0.1));
    camera.tx = clampCamX(fox.x + lookX - camera.w / 2);
    camera.ty = clampCamY(fox.y - PH / 2 + lookY - camera.h * 0.52);
    const k = Math.min(1, dt * (fox.grounded ? 7 : 5));
    camera.x += (camera.tx - camera.x) * k;
    camera.y += (camera.ty - camera.y) * k;
  }

  /* --------------------------------------------------------------- resize */

  function resize() {
    const rect = frame.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false; // laid out but not visible yet
    const fw = Math.max(280, Math.floor(rect.width));
    const fh = Math.max(240, Math.floor(rect.height));

    // On a tall phone screen a full-height canvas would show ~35 tiles of world,
    // shrinking the fox to a speck. Play in a band up top; thumbs get the rest.
    const portrait = fh / fw > 1.15;
    const cw = fw;
    const ch = portrait ? Math.round(Math.min(fh * 0.68, fw * 1.3)) : fh;

    // keep the backing store inside a sane pixel budget — blowing past it makes
    // mobile Safari hand back a blank (black) canvas
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    while (dpr > 1 && cw * ch * dpr * dpr > 2.6e6) dpr -= 0.25;

    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;
    frame.classList.toggle("portrait", portrait);

    // aim for ~13 tiles of height, but keep a workable slice of the world in view
    let scale = ch / 420;
    const minWorldW = portrait ? 460 : 520;
    if (cw / scale < minWorldW) scale = cw / minWorldW;
    if (cw / scale > 900) scale = cw / 900;
    camera.scale = scale;
    camera.w = cw / scale;
    camera.h = ch / scale;
    camera.dpr = dpr;
    camera.cw = cw;
    camera.ch = ch;
    camera.fw = frame.clientWidth;
    camera.fh = frame.clientHeight;
    if (level) {
      camera.x = clampCamX(camera.x);
      camera.y = clampCamY(camera.y);
    }
    return true;
  }

  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 120));
  if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(frame);

  // Phones drop the 2D context when memory gets tight: the canvas goes black
  // with no error at all. Ask for it back, then rebuild everything baked.
  canvas.addEventListener("contextlost", (e) => {
    e.preventDefault();
    console.warn("[Foxfire Hollow] canvas context lost");
  });
  canvas.addEventListener("contextrestored", () => {
    Art.forgetBackgrounds();
    if (level) {
      releaseTerrain();
      terrain = Art.bakeTerrain(level, level.def.biome);
    }
    resize();
  });

  /* ---------------------------------------------------------------- render */

  function render() {
    const p = Art.PALETTES[level ? level.def.biome : "moss"];
    const dpr = camera.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cw = camera.cw;
    const ch = camera.ch;

    Art.paintSky(ctx, level ? level.def.biome : "moss", cw, ch, camera.y);

    const bg = Art.backgrounds(level ? level.def.biome : "moss");
    const shakeX = state.shake ? (Math.random() - 0.5) * state.shake : 0;
    const shakeY = state.shake ? (Math.random() - 0.5) * state.shake : 0;
    const camX = camera.x + shakeX;
    const camY = camera.y + shakeY;

    drawStrip(bg.far, camX * 0.14, -camY * 0.06, 0.95, "far");
    drawStrip(bg.mid, camX * 0.34, -camY * 0.14, 1, "mid");
    drawRays(p, cw, ch);

    // --- world space
    ctx.save();
    ctx.scale(camera.scale, camera.scale);
    ctx.translate(-camX, -camY);

    drawGloom(p);
    drawUpdrafts();

    // terrain (only the visible slice)
    const sx = Math.max(0, Math.floor(camX));
    const sy = Math.max(0, Math.floor(camY));
    const sw = Math.min(terrain.width - sx, Math.ceil(camera.w) + 2);
    const sh = Math.min(terrain.height - sy, Math.ceil(camera.h) + 2);
    if (sw > 0 && sh > 0) ctx.drawImage(terrain, sx, sy, sw, sh, sx, sy, sw, sh);

    drawCrumbles();
    drawEntities();
    drawParticles();
    drawFoxLayer();
    drawChase();

    ctx.restore();

    const worldBottom = level.h * TILE;
    const nearAlpha = 0.82 * Math.max(0, Math.min(1, 1 - (worldBottom - (camera.y + camera.h)) / 260));
    if (nearAlpha > 0.01) drawStrip(bg.near, camX * 1.25, 0, nearAlpha, "near");
    drawAtmosphere(p, cw, ch);
    drawHint();

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,244,220,${state.flash * 0.55})`;
      ctx.fillRect(0, 0, cw, ch);
    }
    if (state.fade > 0) {
      ctx.fillStyle = `rgba(10,8,14,${state.fade})`;
      ctx.fillRect(0, 0, cw, ch);
    }
  }

  const wrap = (v, m) => ((v % m) + m) % m;

  function drawStrip(img, offX, offY, alpha, mode) {
    const cw = camera.cw;
    const ch = camera.ch;
    // far and mid must always overshoot the viewport height, or their top edge
    // shows up as a hard horizontal cut across the sky
    const scale = (ch / img.height) * (mode === "near" ? 0.28 : 1.14);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = -wrap(offX * camera.scale, w);
    const shift = mode === "near" ? 0 : Math.max(-100, Math.min(0, offY * camera.scale * 0.3));
    const y = ch - h + shift;
    ctx.globalAlpha = alpha;
    for (let dx = x; dx < cw + 1; dx += w - 1) ctx.drawImage(img, dx, y, w, h);
    ctx.globalAlpha = 1;
  }

  function drawRays(p, cw, ch) {
    if (reduceMotion) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const t = performance.now() / 1000;
    const ox = cw * p.sunPos[0];
    for (let i = 0; i < 5; i++) {
      const a = -0.9 + i * 0.16 + Math.sin(t * 0.12 + i) * 0.03;
      const wdt = 40 + i * 26;
      ctx.save();
      ctx.translate(ox, -60);
      ctx.rotate(a);
      const g = ctx.createLinearGradient(0, 0, 0, ch * 1.6);
      g.addColorStop(0, p.rayColor);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-wdt * 0.3, 0);
      ctx.lineTo(wdt * 0.3, 0);
      ctx.lineTo(wdt * 1.4, ch * 1.6);
      ctx.lineTo(-wdt * 1.1, ch * 1.6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawGloom(p) {
    const t = performance.now() / 1000;
    const x0 = Math.max(0, Math.floor(camera.x / TILE) - 1);
    const x1 = Math.min(level.w - 1, Math.ceil((camera.x + camera.w) / TILE) + 1);
    const y0 = Math.max(0, Math.floor(camera.y / TILE) - 1);
    const y1 = Math.min(level.h - 1, Math.ceil((camera.y + camera.h) / TILE) + 1);
    for (let x = x0; x <= x1; x++) {
      let top = -1;
      for (let y = y0; y <= y1; y++) {
        if (tileAt(x, y) === T.GLOOM) {
          top = y;
          break;
        }
      }
      if (top < 0) continue;
      const surfaceY = top * TILE + Math.sin(t * 2 + x * 0.5) * 3;
      const g = ctx.createLinearGradient(0, surfaceY, 0, surfaceY + 200);
      g.addColorStop(0, p.gloom[1]);
      g.addColorStop(1, p.gloom[0]);
      ctx.fillStyle = g;
      ctx.fillRect(x * TILE, surfaceY, TILE + 1, level.h * TILE - surfaceY);
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillRect(x * TILE, surfaceY, TILE + 1, 2.5);
      if ((x + Math.floor(t * 2)) % 7 === 0) {
        const by = surfaceY + 12 + ((t * 30 + x * 13) % 60);
        ctx.fillStyle = "rgba(255,255,255,0.10)";
        ctx.beginPath();
        ctx.arc(x * TILE + 16, by, 3 + Math.sin(t * 3 + x) * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawUpdrafts() {
    const t = performance.now() / 1000;
    const x0 = Math.max(0, Math.floor(camera.x / TILE) - 1);
    const x1 = Math.min(level.w - 1, Math.ceil((camera.x + camera.w) / TILE) + 1);
    for (let x = x0; x <= x1; x++) {
      let top = -1;
      let bot = -1;
      for (let y = 0; y < level.h; y++) {
        if (tileAt(x, y) === T.UPDRAFT) {
          if (top < 0) top = y;
          bot = y;
        }
      }
      if (top < 0) continue;
      const gy0 = top * TILE;
      const gy1 = (bot + 1) * TILE;
      const g = ctx.createLinearGradient(0, gy1, 0, gy0);
      g.addColorStop(0, "rgba(255,214,150,0.24)");
      g.addColorStop(1, "rgba(255,214,150,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x * TILE + 2, gy0, TILE - 4, gy1 - gy0);
      ctx.strokeStyle = "rgba(255,240,200,0.4)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const off = ((t * 190 + i * 90 + x * 37) % (gy1 - gy0));
        const y = gy1 - off;
        ctx.globalAlpha = Math.min(1, off / 60) * 0.7;
        ctx.beginPath();
        ctx.moveTo(x * TILE + 8 + Math.sin(y * 0.08 + i) * 5, y);
        ctx.lineTo(x * TILE + 8 + Math.sin(y * 0.08 + i) * 5, y - 16);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x * TILE + 22 + Math.cos(y * 0.07 + i) * 5, y + 10);
        ctx.lineTo(x * TILE + 22 + Math.cos(y * 0.07 + i) * 5, y - 6);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawCrumbles() {
    for (const [key, c] of crumbles) {
      const tx = key % level.w;
      const ty = Math.floor(key / level.w);
      if (!c.gone) continue;
      // faint outline of where the stone will return
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(tx * TILE + 2, ty * TILE + 2, TILE - 4, TILE - 4);
      ctx.setLineDash([]);
    }
    // shake the ones about to go
    for (const [key, c] of crumbles) {
      if (c.gone || c.t <= 0) continue;
      const tx = key % level.w;
      const ty = Math.floor(key / level.w);
      const j = (1 - c.t / 0.42) * 2.2;
      ctx.save();
      ctx.translate((Math.random() - 0.5) * j, (Math.random() - 0.5) * j);
      ctx.fillStyle = "rgba(255,150,110,0.22)";
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      ctx.restore();
    }
  }

  function drawEntities() {
    const t = performance.now() / 1000;
    const vx0 = camera.x - 60;
    const vx1 = camera.x + camera.w + 60;

    for (const e of ents) {
      if (e.px < vx0 || e.px > vx1) continue;
      switch (e.type) {
        case "seed": {
          if (e.taken) break;
          const bob = Math.sin(t * 2.4 + e.bob) * 3;
          ctx.save();
          ctx.translate(e.px, e.py + bob);
          ctx.globalCompositeOperation = "lighter";
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 16);
          g.addColorStop(0, "rgba(255,220,140,0.55)");
          g.addColorStop(1, "rgba(255,200,100,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = "source-over";
          const sg = ctx.createLinearGradient(0, -7, 0, 7);
          sg.addColorStop(0, "#fff3c4");
          sg.addColorStop(1, "#f0a84a");
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.ellipse(0, 0, 5, 6.6, Math.sin(t + e.bob) * 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.beginPath();
          ctx.ellipse(-1.6, -2.4, 1.5, 2.1, -0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#8a5a2c";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(0, -6.4);
          ctx.quadraticCurveTo(2.5, -10, 5, -10.5);
          ctx.stroke();
          ctx.restore();
          break;
        }
        case "petal": {
          if (e.taken) break;
          const bob = Math.sin(t * 1.6 + e.bob) * 4;
          ctx.save();
          ctx.translate(e.px, e.py + bob);
          ctx.globalCompositeOperation = "lighter";
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
          g.addColorStop(0, "rgba(200,230,255,0.6)");
          g.addColorStop(1, "rgba(160,200,255,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, 30, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = "source-over";
          ctx.rotate(t * 0.6);
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const pg = ctx.createLinearGradient(0, 0, Math.cos(a) * 12, Math.sin(a) * 12);
            pg.addColorStop(0, "#ffffff");
            pg.addColorStop(1, "#a9d4ff");
            ctx.fillStyle = pg;
            ctx.beginPath();
            ctx.ellipse(Math.cos(a) * 7, Math.sin(a) * 7, 6.5, 3.6, a, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = "#fff6c8";
          ctx.beginPath();
          ctx.arc(0, 0, 3.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          for (let i = 0; i < 3; i++) {
            const a = t * 1.4 + (i / 3) * Math.PI * 2;
            ctx.fillStyle = "rgba(230,244,255,0.9)";
            ctx.beginPath();
            ctx.arc(e.px + Math.cos(a) * 22, e.py + bob + Math.sin(a) * 14, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case "bloom": {
          const active = e.cool <= 0;
          const pulse = active ? 1 + Math.sin(t * 4 + e.bob) * 0.08 : 0.55;
          ctx.save();
          ctx.translate(e.px, e.py);
          ctx.scale(pulse, pulse);
          ctx.globalAlpha = active ? 1 : 0.35;
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + t * 0.4;
            ctx.fillStyle = i % 2 ? "#ff9f5a" : "#ffd76b";
            ctx.beginPath();
            ctx.ellipse(Math.cos(a) * 8, Math.sin(a) * 8, 6, 4, a, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          if (active) Art.drawEmber(ctx, e.px, e.py, 4.5, t + e.bob, "rgba(255,240,200,0.9)", "rgba(255,140,60,0.5)");
          break;
        }
        case "shroom": {
          ctx.save();
          ctx.translate(e.px, e.py);
          ctx.scale(1 / e.squash, e.squash);
          ctx.fillStyle = "#f2e2cf";
          Art.roundRect(ctx, -5, -14, 10, 15, 4);
          ctx.fill();
          const cg = ctx.createLinearGradient(0, -30, 0, -10);
          cg.addColorStop(0, "#ff8fb8");
          cg.addColorStop(1, "#d8467d");
          ctx.fillStyle = cg;
          ctx.beginPath();
          ctx.ellipse(0, -14, 19, 13, 0, Math.PI, 0);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          for (const s of [
            [-8, -18, 3],
            [4, -21, 2.4],
            [10, -16, 2],
          ]) {
            ctx.beginPath();
            ctx.arc(s[0], s[1], s[2], 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          break;
        }
        case "check": {
          ctx.save();
          ctx.translate(e.px, e.py);
          ctx.fillStyle = "#5b4b52";
          Art.roundRect(ctx, -11, -34, 22, 34, 6);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.14)";
          Art.roundRect(ctx, -8, -31, 6, 28, 3);
          ctx.fill();
          ctx.fillStyle = e.lit ? "#ffd98a" : "#6d5c63";
          ctx.beginPath();
          ctx.arc(0, -38, 7, 0, Math.PI * 2);
          ctx.fill();
          if (e.lit) {
            Art.drawEmber(ctx, 0, -42, 6, t, "rgba(255,246,214,0.95)", "rgba(255,170,70,0.5)");
            ctx.globalCompositeOperation = "lighter";
            const g = ctx.createRadialGradient(0, -38, 0, 0, -38, 46);
            g.addColorStop(0, "rgba(255,214,140,0.30)");
            g.addColorStop(1, "rgba(255,180,90,0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, -38, 46, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          break;
        }
        case "bug": {
          if (e.dead > 0.5) break;
          ctx.save();
          ctx.translate(e.px, e.py);
          if (e.dead) {
            ctx.globalAlpha = Math.max(0, 1 - e.dead * 2);
            ctx.scale(1 + e.dead, Math.max(0.1, 1 - e.dead * 2.4));
          }
          const wob = Math.sin(e.walk * 9) * 1.4;
          // legs
          ctx.strokeStyle = "#3f5a34";
          ctx.lineWidth = 2;
          for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 7, -5);
            ctx.lineTo(i * 9 + Math.sin(e.walk * 12 + i) * 3, 0);
            ctx.stroke();
          }
          const bg = ctx.createLinearGradient(0, -22, 0, -2);
          bg.addColorStop(0, "#a8d86a");
          bg.addColorStop(1, "#5d9440");
          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.ellipse(0, -11 + wob * 0.3, 13, 10.5, 0, 0, Math.PI * 2);
          ctx.fill();
          // thistle spines on the sides
          ctx.fillStyle = "#3d6b2c";
          for (const sx of [-13, 13]) {
            ctx.beginPath();
            ctx.moveTo(sx * 0.72, -16);
            ctx.lineTo(sx * 1.25, -12);
            ctx.lineTo(sx * 0.72, -8);
            ctx.closePath();
            ctx.fill();
          }
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.beginPath();
          ctx.ellipse(-4, -15, 5, 3.2, -0.5, 0, Math.PI * 2);
          ctx.fill();
          // face
          ctx.fillStyle = "#26331f";
          ctx.beginPath();
          ctx.arc(e.dir * 5, -12, 2.2, 0, Math.PI * 2);
          ctx.arc(e.dir * 9, -13.5, 1.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        }
        case "wisp": {
          if (e.dead > 0.6) break;
          ctx.save();
          ctx.translate(e.px, e.py);
          if (e.dead) {
            ctx.globalAlpha = Math.max(0, 1 - e.dead * 1.6);
            ctx.scale(1 + e.dead * 1.4, 1 + e.dead * 1.4);
          }
          ctx.globalCompositeOperation = "lighter";
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
          g.addColorStop(0, "rgba(160,110,255,0.45)");
          g.addColorStop(1, "rgba(90,50,160,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, 26, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = "source-over";
          const flick = 1 + Math.sin(t * 8 + e.bob) * 0.1;
          const bg = ctx.createLinearGradient(0, -16 * flick, 0, 12);
          bg.addColorStop(0, "#7b4fd0");
          bg.addColorStop(1, "#2a1140");
          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.moveTo(0, -16 * flick);
          ctx.quadraticCurveTo(11, -2, 6, 8);
          ctx.quadraticCurveTo(0, 13, -6, 8);
          ctx.quadraticCurveTo(-11, -2, 0, -16 * flick);
          ctx.fill();
          ctx.fillStyle = "#ffe9a8";
          ctx.beginPath();
          ctx.arc(-3.4, -2, 1.9, 0, Math.PI * 2);
          ctx.arc(3.4, -2, 1.9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,233,168,0.85)";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(0, 3.5, 3, 0.2, Math.PI - 0.2);
          ctx.stroke();
          ctx.restore();
          break;
        }
        case "mover": {
          ctx.save();
          ctx.translate(e.px, e.py);
          ctx.fillStyle = "rgba(0,0,0,0.28)";
          Art.roundRect(ctx, 2, 4, e.w, 14, 6);
          ctx.fill();
          const g = ctx.createLinearGradient(0, 0, 0, 16);
          g.addColorStop(0, "#8d7ba8");
          g.addColorStop(1, "#40304f");
          ctx.fillStyle = g;
          Art.roundRect(ctx, 0, 0, e.w, 15, 6);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.22)";
          ctx.fillRect(3, 2, e.w - 6, 2.4);
          // runes
          ctx.fillStyle = `rgba(255,206,130,${0.5 + Math.sin(t * 3) * 0.25})`;
          for (let i = 0; i < Math.max(1, Math.floor(e.w / 32)); i++) {
            ctx.beginPath();
            ctx.arc(20 + i * 32, 8, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          break;
        }
        case "hint": {
          ctx.save();
          ctx.translate(e.px, e.py);
          ctx.fillStyle = "#6b4a33";
          Art.roundRect(ctx, -2.5, -26, 5, 26, 2);
          ctx.fill();
          const g = ctx.createLinearGradient(0, -44, 0, -24);
          g.addColorStop(0, "#c69a66");
          g.addColorStop(1, "#8a6640");
          ctx.fillStyle = g;
          Art.roundRect(ctx, -17, -44, 34, 20, 4);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.25)";
          ctx.fillRect(-15, -42, 30, 2);
          Art.drawEmber(ctx, 0, -50, 4, t, "rgba(255,240,200,0.9)", "rgba(255,150,60,0.4)");
          ctx.restore();
          break;
        }
        case "exit": {
          ctx.save();
          ctx.translate(e.px, e.py);
          // stone base
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.beginPath();
          ctx.ellipse(0, 2, 26, 7, 0, 0, Math.PI * 2);
          ctx.fill();
          const sg = ctx.createLinearGradient(-14, 0, 14, 0);
          sg.addColorStop(0, "#6a5b63");
          sg.addColorStop(0.5, "#9a8a92");
          sg.addColorStop(1, "#5a4c54");
          ctx.fillStyle = sg;
          Art.roundRect(ctx, -13, -30, 26, 30, 5);
          ctx.fill();
          Art.roundRect(ctx, -18, -38, 36, 10, 4);
          ctx.fill();
          // lantern glass
          const lit = e.lit || state.mode === "win";
          const lg = ctx.createLinearGradient(0, -74, 0, -38);
          lg.addColorStop(0, lit ? "#fff5cf" : "#5f5a68");
          lg.addColorStop(1, lit ? "#ffb45c" : "#43404d");
          ctx.fillStyle = lg;
          ctx.beginPath();
          ctx.moveTo(-15, -38);
          ctx.lineTo(-11, -70);
          ctx.lineTo(11, -70);
          ctx.lineTo(15, -38);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#4a3f46";
          ctx.lineWidth = 2.6;
          ctx.stroke();
          ctx.fillStyle = "#4a3f46";
          Art.roundRect(ctx, -14, -78, 28, 9, 3);
          ctx.fill();
          if (lit) {
            Art.drawEmber(ctx, 0, -54, 9, t, "rgba(255,250,230,0.95)", "rgba(255,160,60,0.55)");
            ctx.globalCompositeOperation = "lighter";
            const g = ctx.createRadialGradient(0, -54, 0, 0, -54, 150);
            g.addColorStop(0, "rgba(255,214,140,0.34)");
            g.addColorStop(1, "rgba(255,180,90,0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, -54, 150, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.globalAlpha = 0.5 + Math.sin(t * 2) * 0.2;
            Art.drawEmber(ctx, 0, -54, 4, t, "rgba(200,210,255,0.5)", "rgba(120,140,255,0.25)");
          }
          ctx.restore();
          break;
        }
        default:
          break;
      }
    }
  }

  function drawParticles() {
    for (const q of particles) {
      const a = Math.max(0, Math.min(1, q.life / (q.max || 0.5)));
      ctx.globalAlpha = a;
      if (q.kind === "spark" || q.kind === "ember") {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = q.color;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.size * a, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
      } else if (q.kind === "rock") {
        ctx.fillStyle = q.color;
        ctx.save();
        ctx.translate(q.x, q.y);
        ctx.rotate(q.rot);
        ctx.fillRect(-q.size / 2, -q.size / 2, q.size, q.size);
        ctx.restore();
      } else {
        ctx.fillStyle = q.color;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.size * (0.4 + a * 0.9), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawFoxLayer() {
    const s = skin();
    // ground shadow
    if (fox.alive) {
      let gy = fox.y;
      for (let i = 0; i < 8; i++) {
        const ty = Math.floor((fox.y + i * TILE) / TILE);
        if (isSolid(Math.floor(fox.x / TILE), ty)) {
          gy = ty * TILE;
          break;
        }
      }
      const dist = Math.max(0, Math.min(1, (gy - fox.y) / 160));
      ctx.fillStyle = `rgba(0,0,0,${0.3 * (1 - dist)})`;
      ctx.beginPath();
      ctx.ellipse(fox.x, gy - 2, 12 * (1 - dist * 0.5), 4.5 * (1 - dist * 0.5), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // dash afterimages
    for (const g of ghosts) {
      ctx.globalAlpha = Math.max(0, g.t / 0.28) * 0.35;
      ctx.fillStyle = s.glow;
      ctx.beginPath();
      ctx.ellipse(g.x, g.y - PH / 2, 11, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (!fox.alive) return;

    // ember charge mote
    if (fox.dashReady && hasAbility("dash")) {
      const t = performance.now() / 1000;
      Art.drawEmber(
        ctx,
        fox.x - fox.facing * 15,
        fox.y - 34 + Math.sin(t * 3) * 2,
        3.4,
        t,
        "rgba(255,248,220,0.95)",
        s.glow,
      );
    }

    Art.drawFox(
      ctx,
      {
        x: fox.x,
        y: fox.y,
        vx: fox.vx,
        vy: fox.vy,
        facing: fox.facing,
        grounded: fox.grounded,
        squash: fox.squash,
        animT: fox.animT,
        blink: fox.blink,
        squint: fox.squint,
        earBack: fox.earBack,
        headTilt: fox.headTilt,
        eyeDx: fox.eyeDx,
        scarf: fox.scarf,
      },
      s,
    );
  }

  function drawChase() {
    if (state.chaseX === -Infinity) return;
    const t = performance.now() / 1000;
    const x = state.chaseX;
    const g = ctx.createLinearGradient(x - 260, 0, x + 20, 0);
    g.addColorStop(0, "rgba(12,6,20,0.98)");
    g.addColorStop(0.7, "rgba(40,14,60,0.9)");
    g.addColorStop(1, "rgba(90,30,120,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - 280, camera.y - 40, 300, camera.h + 80);
    ctx.strokeStyle = "rgba(190,120,255,0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let y = camera.y - 40; y < camera.y + camera.h + 40; y += 10) {
      const wob = Math.sin(y * 0.05 + t * 4) * 12 + Math.sin(y * 0.13 + t * 7) * 5;
      ctx.lineTo(x + wob, y);
    }
    ctx.stroke();
    for (let i = 0; i < 2; i++) {
      const yy = camera.y + Math.random() * camera.h;
      ctx.fillStyle = "rgba(180,120,255,0.35)";
      ctx.beginPath();
      ctx.arc(x - Math.random() * 60, yy, 2 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawAtmosphere(p, cw, ch) {
    // drifting motes
    const t = performance.now() / 1000;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 26; i++) {
      const seed = i * 97.13;
      const x = wrap(
        (Math.sin(seed) * 0.5 + 0.5) * cw + t * (8 + (i % 5) * 5) - camera.x * camera.scale * 0.3,
        cw,
      );
      const y = wrap(
        (Math.cos(seed * 1.7) * 0.5 + 0.5) * ch + Math.sin(t * 0.5 + i) * 20 - camera.y * camera.scale * 0.2,
        ch,
      );
      const r = 1 + (i % 3);
      ctx.fillStyle = p.motes;
      ctx.globalAlpha = 0.14 + ((i % 4) / 4) * 0.3;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // colour grade + fog
    ctx.fillStyle = p.lightTint;
    ctx.fillRect(0, 0, cw, ch);
    const fog = ctx.createLinearGradient(0, ch * 0.5, 0, ch);
    fog.addColorStop(0, p.fogTop);
    fog.addColorStop(1, p.fogBot);
    ctx.fillStyle = fog;
    ctx.fillRect(0, ch * 0.5, cw, ch * 0.5);

    const v = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.32, cw / 2, ch / 2, Math.max(cw, ch) * 0.78);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, p.vignette);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, cw, ch);
  }

  function drawHint() {
    if (state.hintAlpha <= 0.01 || !state.hintLines) return;
    const e = state.hintAt;
    const x = (e.px - camera.x) * camera.scale;
    const y = (e.py - 62 - camera.y) * camera.scale;
    ctx.save();
    ctx.globalAlpha = state.hintAlpha;
    ctx.textAlign = "center";
    ctx.font = '700 14px "Nunito", "Trebuchet MS", system-ui, sans-serif';
    const lines = state.hintLines;
    const wdt = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 28;
    const hgt = lines.length * 20 + 16;
    ctx.fillStyle = "rgba(24,18,28,0.72)";
    Art.roundRect(ctx, x - wdt / 2, y - hgt, wdt, hgt, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,214,150,0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#fff3d8";
    lines.forEach((l, i) => ctx.fillText(l, x, y - hgt + 24 + i * 20));
    ctx.restore();
  }

  /* ------------------------------------------------------------------ hud */

  function updateHud() {
    if (!level) return;
    els.seeds.textContent = `${state.seeds}/${level.seedTotal}`;
    els.petal.classList.toggle("on", state.petal);
    els.deaths.textContent = String(state.deaths);
  }

  /** The ember pip mirrors the dash charge, so it changes many times a second. */
  let pipState = null;
  function updateEmberPip() {
    const has = hasAbility("dash");
    const next = has ? (fox.dashReady ? "ready" : "spent") : "hidden";
    if (next === pipState) return;
    pipState = next;
    els.emberPip.hidden = next === "hidden";
    els.emberPip.classList.toggle("spent", next === "spent");
  }

  /* ----------------------------------------------------------------- loop */

  let last = performance.now();
  let acc = 0;

  function frameLoop(now) {
    requestAnimationFrame(frameLoop);
    try {
      tick(now);
    } catch (err) {
      crash(err);
    }
  }

  /** Turns a would-be black screen into something the player can report. */
  let crashed = false;
  function crash(err) {
    if (crashed) return;
    crashed = true;
    console.error("[Foxfire Hollow]", err);
    const box = $("crash");
    if (!box) return;
    box.hidden = false;
    box.innerHTML = `<strong>The hollow went dark.</strong><span>${String(
      (err && err.message) || err,
    ).slice(0, 160)}</span><button type="button" id="crashReload">Reload</button>`;
    const btn = $("crashReload");
    if (btn) btn.addEventListener("click", () => window.location.reload());
  }

  function tick(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;

    // phones resize the viewport constantly (URL bar, rotation, keyboard) and
    // some of those never fire a resize event inside an iframe
    if (frame.clientWidth !== camera.fw || frame.clientHeight !== camera.fh) resize();
    if (!camera.cw || !camera.ch) return;

    if (state.mode === "play" || state.mode === "win") {
      acc += dt;
      const step = 1 / 120;
      let guard = 0;
      while (acc >= step && guard++ < 8) {
        stepGame(step);
        acc -= step;
      }
      if (guard >= 8) acc = 0;
    }

    // always animate visuals
    state.shake *= Math.pow(0.001, dt);
    if (state.shake < 0.2) state.shake = 0;
    state.flash = Math.max(0, state.flash - dt * 2.2);
    state.fade = Math.max(0, state.fade - dt * 2.4);
    if (state.banner > 0) {
      state.banner -= dt;
      if (state.banner <= 0) {
        els.banner.classList.remove("show");
        els.banner.hidden = true;
      }
    }
    stepParticles(dt);
    for (let i = ghosts.length - 1; i >= 0; i--) {
      ghosts[i].t -= dt;
      if (ghosts[i].t <= 0) ghosts.splice(i, 1);
    }
    musicStep(dt);
    if (level && state.mode === "play") updateEmberPip();

    if (level) render();
  }

  function stepGame(dt) {
    if (state.mode === "play") {
      state.time += dt;
      els.timer.textContent = fmtTime(state.time);
      const def = Levels.LEVELS[state.index];
      if (def.chase) {
        state.chaseX += (def.chase.speed + state.time * def.chase.ramp * 10) * dt;
        if (state.chaseX > fox.x + camera.w * 0.75) state.chaseX = fox.x + camera.w * 0.75;
      }
    }

    if (fox.alive) {
      updateFox(dt);
    } else if (state.mode === "play") {
      state.respawnT -= dt;
      if (state.respawnT <= 0) {
        placeFox(false);
        state.fade = 0.55;
      }
    }
    updateEntities(dt);
    updateCamera(dt);
  }

  function stepParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const q = particles[i];
      q.life -= dt;
      if (q.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      q.vy += q.grav * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vx *= 1 - Math.min(1, dt * 1.4);
      q.rot += q.spin * dt;
    }
    if (particles.length > 500) particles.splice(0, particles.length - 500);
  }

  /* ------------------------------------------------------------- ui wiring */

  function hideCards() {
    // null-safe on purpose: a throw here used to hide every card and leave an
    // empty black frame with no way back
    for (const el of [els.title, els.map, els.pause, els.win]) {
      if (el) el.hidden = true;
    }
  }

  function showTitle() {
    state.mode = "title";
    hideCards();
    els.title.hidden = false;
    els.hud.hidden = true;
    const cleared = clearedCount();
    els.titleBest.textContent = cleared
      ? `${cleared}/${Levels.LEVELS.length} hollows lit · ${totalSeeds()} emberseeds · ${totalPetals()} moonpetals`
      : "A tiny fox. A long night. Ten hollows to light.";
    if (!level) {
      // paint the first level behind the menu so the title screen is alive
      quietLoad(0);
    }
  }

  function quietLoad(i) {
    const def = Levels.LEVELS[i];
    level = Levels.buildLevel(def);
    releaseTerrain();
    terrain = Art.bakeTerrain(level, def.biome);
    ents = [];
    crumbles.clear();
    for (const e of level.entities) {
      if (e.type === "seed" || e.type === "bloom" || e.type === "check" || e.type === "hint")
        ents.push({ ...e, px: e.x * TILE + TILE / 2, py: e.y * TILE + TILE, t: 0, bob: Math.random() * 6 });
    }
    fox.x = level.spawn.x * TILE + TILE / 2;
    fox.y = level.spawn.y * TILE + TILE;
    fox.alive = false;
    resize();
    camera.x = clampCamX(fox.x - camera.w * 0.35);
    camera.y = clampCamY(fox.y - camera.h * 0.6);
    state.chaseX = -Infinity;
  }

  function showMap() {
    state.mode = "map";
    hideCards();
    els.map.hidden = false;
    els.hud.hidden = true;
    els.grid.innerHTML = "";
    Levels.LEVELS.forEach((def, i) => {
      const ls = save.levels[def.id];
      const unlocked = isLevelUnlocked(i);
      const b = document.createElement("button");
      b.type = "button";
      b.className = `lvl${unlocked ? "" : " locked"}${ls?.done ? " done" : ""}`;
      b.disabled = !unlocked;
      const biome = Art.PALETTES[def.biome].name;
      b.innerHTML = `
        <span class="lvl-no">${i + 1}</span>
        <span class="lvl-name">${unlocked ? def.name : "Locked"}</span>
        <span class="lvl-biome">${biome}</span>
        <span class="lvl-stats">${
          ls?.done
            ? `${medalFor(ls.best, def.par).icon} ${fmtTime(ls.best)} · 🌰 ${ls.seeds} ${ls.petal ? "· 🌙" : ""}`
            : unlocked
              ? "Not lit yet"
              : "Light the hollow before"
        }</span>`;
      b.addEventListener("click", () => {
        SFX.ui();
        startLevel(i);
      });
      els.grid.appendChild(b);
    });
    els.mapTotals.textContent = `${totalSeeds()} 🌰 · ${totalPetals()}/10 🌙 · ${clearedCount()}/${Levels.LEVELS.length} lit`;

    els.skinRow.innerHTML = "";
    for (const s of Art.SKINS) {
      const ok = skinUnlocked(s);
      const b = document.createElement("button");
      b.type = "button";
      b.className = `skin${save.skin === s.id ? " sel" : ""}${ok ? "" : " locked"}`;
      b.disabled = !ok;
      b.style.setProperty("--fur", s.fur);
      b.style.setProperty("--scarf", s.scarf);
      b.innerHTML = `<i></i><span>${ok ? s.name : s.petals ? `${totalPetals()}/${s.petals} 🌙` : `${s.cost} 🌰`}</span>`;
      b.addEventListener("click", () => {
        save.skin = s.id;
        persist();
        SFX.ui();
        showMap();
      });
      els.skinRow.appendChild(b);
    }
  }

  function pause() {
    if (state.mode !== "play") return;
    state.mode = "pause";
    els.pause.hidden = false;
  }

  function resume() {
    if (state.mode !== "pause") return;
    state.mode = "play";
    els.pause.hidden = true;
    last = performance.now();
    audioReady();
  }

  $("playBtn").addEventListener("click", () => {
    audioReady();
    SFX.ui();
    const next = Levels.LEVELS.findIndex((d) => !save.levels[d.id]?.done);
    startLevel(next === -1 ? save.lastIndex || 0 : next);
  });
  $("mapBtn").addEventListener("click", () => {
    audioReady();
    SFX.ui();
    showMap();
  });
  $("mapBack").addEventListener("click", () => {
    SFX.ui();
    showTitle();
  });
  $("resumeBtn").addEventListener("click", () => {
    SFX.ui();
    resume();
  });
  $("retryBtn").addEventListener("click", () => {
    SFX.ui();
    startLevel(state.index);
  });
  $("pauseMapBtn").addEventListener("click", () => {
    SFX.ui();
    showMap();
  });
  $("pauseBtn").addEventListener("click", () => {
    SFX.ui();
    pause();
  });
  els.nextBtn.addEventListener("click", () => {
    SFX.ui();
    if (state.index + 1 < Levels.LEVELS.length) startLevel(state.index + 1);
    else showMap();
  });
  $("winRetryBtn").addEventListener("click", () => {
    SFX.ui();
    startLevel(state.index);
  });
  $("winMapBtn").addEventListener("click", () => {
    SFX.ui();
    showMap();
  });
  els.soundBtn.addEventListener("click", () => {
    audioReady();
    setSound(!save.sound);
    SFX.ui();
  });
  els.soundBtn2.addEventListener("click", () => {
    audioReady();
    setSound(!save.sound);
    SFX.ui();
  });

  /* ----------------------------------------------------------------- boot */

  // Boot is guarded too: a throw out here never reached the frame loop's
  // handler, so the player just got an empty dark frame and no explanation.
  try {
    setSound(save.sound);
    resize();
    showTitle();
  } catch (err) {
    crash(err);
    if (els.title) els.title.hidden = false; // menu still beats a black box
  }
  requestAnimationFrame(frameLoop);

  // small handle for debugging / automated smoke tests
  window.Foxfire = {
    state,
    fox,
    input,
    startLevel,
    step: stepGame,
    camera,
    render: () => render(),
    level: () => level,
    ents: () => ents,
  };
})();
