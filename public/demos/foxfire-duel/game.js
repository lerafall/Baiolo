/* Foxfire Duel — one phone, two thumbs.
 *
 * Each player owns a single button. Tap it to hop backwards out of trouble;
 * hold it to charge an ember bash and release to lunge. Hits build scorch, and
 * the more scorch you carry the further the next hit throws you. Fall off the
 * island and your opponent scores.
 */
(() => {
  "use strict";

  const Art = window.DuelArt;

  /* ------------------------------------------------------------ constants */

  const WORLD_W = 1000;
  const WORLD_H = 560;
  const GROUND_Y = 366; // top surface of the island, in world units
  const ARENA_FULL = [92, 908];
  // small enough that two players who refuse to engage still lose their footing
  const ARENA_MIN_W = 130;

  const FOX_SCALE = 1.45;
  const GRAVITY = 1950;
  const MAX_FALL = 900;
  const PW = 30;
  const PH = 38;

  const HOP_VY = -430;
  const HOP_VX = 165; // backwards, away from the opponent
  const HOLD_TO_CHARGE = 0.16;
  const CHARGE_TIME = 0.85;
  const BASH_SPEED = 300;
  const BASH_SPEED_MAX = 430;
  const BASH_TIME = 0.42;
  const FRICTION = 1750;
  const AIR_DRAG = 260;
  const KNOCK_BASE = 200;
  const KNOCK_CHARGE = 320;
  const KNOCK_UP = 165;
  const SCORCH_PER_HIT = 7;
  const SCORCH_PER_CHARGE = 13;
  const PUNISH_MULT = 1.7;
  const SHRINK_AFTER = 13;
  const SHRINK_RATE = 11; // world px per second, per side

  const STORAGE_KEY = "baiolo.foxfire-duel.v1";

  /* ----------------------------------------------------------------- dom */

  const $ = (id) => document.getElementById(id);
  const frame = $("frame");
  const canvas = $("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const els = {
    hud: $("hud"),
    p1Scorch: $("p1Scorch"),
    p2Scorch: $("p2Scorch"),
    p1Score: $("p1Score"),
    p2Score: $("p2Score"),
    p1Boon: $("p1Boon"),
    p2Boon: $("p2Boon"),
    menu: $("menuCard"),
    over: $("overCard"),
    overTitle: $("overTitle"),
    overBody: $("overBody"),
    rotate: $("rotateCard"),
    touch: $("touch"),
    soundBtn: $("soundBtn"),
    firstTo: $("firstTo"),
  };

  /* ---------------------------------------------------------------- save */

  const defaults = () => ({ sound: true, firstTo: 5, wins: [0, 0] });
  let save = load();

  function load() {
    try {
      return { ...defaults(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
    } catch {
      return defaults();
    }
  }
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    } catch {
      /* private mode */
    }
  }

  /* --------------------------------------------------------------- audio */

  const audio = { ac: null, master: null, hum: null, humGain: null };

  function audioReady() {
    if (audio.ac) {
      if (audio.ac.state === "suspended") audio.ac.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audio.ac = new AC();
    audio.master = audio.ac.createGain();
    audio.master.gain.value = save.sound ? 0.5 : 0;
    audio.master.connect(audio.ac.destination);
  }

  function tone(freq, dur, type, vol, slideTo, delay = 0) {
    if (!audio.ac || !save.sound) return;
    const t0 = audio.ac.currentTime + delay;
    const o = audio.ac.createOscillator();
    const g = audio.ac.createGain();
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

  function noise(dur, vol, from, to) {
    if (!audio.ac || !save.sound) return;
    const len = Math.floor(audio.ac.sampleRate * dur);
    const buf = audio.ac.createBuffer(1, len, audio.ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audio.ac.createBufferSource();
    src.buffer = buf;
    const bp = audio.ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(from, audio.ac.currentTime);
    bp.frequency.exponentialRampToValueAtTime(to, audio.ac.currentTime + dur);
    const g = audio.ac.createGain();
    g.gain.value = vol;
    src.connect(bp);
    bp.connect(g);
    g.connect(audio.master);
    src.start();
  }

  const SFX = {
    hop: () => tone(300, 0.13, "triangle", 0.12, 560),
    bash: () => {
      noise(0.2, 0.16, 1600, 300);
      tone(420, 0.16, "sawtooth", 0.07, 150);
    },
    hit: (power) => {
      noise(0.24, 0.2 + power * 0.12, 900, 120);
      tone(180 + power * 90, 0.2, "square", 0.14, 70);
    },
    clash: () => {
      noise(0.16, 0.18, 2600, 600);
      tone(880, 0.14, "triangle", 0.12, 1400);
    },
    fall: () => tone(420, 0.7, "sine", 0.14, 60),
    point: () => [660, 880].forEach((f, i) => tone(f, 0.45, "triangle", 0.14, null, i * 0.09)),
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.8, "sine", 0.14, null, i * 0.1)),
    count: (last) => tone(last ? 880 : 520, 0.16, "sine", 0.14),
    boon: () => [784, 1175].forEach((f, i) => tone(f, 0.4, "sine", 0.12, null, i * 0.07)),
    ui: () => tone(520, 0.08, "sine", 0.08, 660),
  };

  function setSound(on) {
    save.sound = on;
    persist();
    if (audio.master) audio.master.gain.value = on ? 0.5 : 0;
    if (els.soundBtn) els.soundBtn.textContent = on ? "🔊 Sound on" : "🔇 Sound off";
  }

  /* --------------------------------------------------------------- input */

  // one button each: everything the game needs fits in press + release
  const held = [false, false];
  const pressedAt = [0, 0];

  function press(i) {
    if (held[i]) return;
    held[i] = true;
    pressedAt[i] = performance.now();
    audioReady();
    onPress(i);
  }
  function release(i) {
    if (!held[i]) return;
    held[i] = false;
    onRelease(i);
  }

  const KEYS = { KeyA: 0, KeyQ: 0, ShiftLeft: 0, KeyL: 1, KeyP: 1, ShiftRight: 1 };
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    const i = KEYS[e.code];
    if (i === undefined) return;
    e.preventDefault();
    press(i);
  });
  window.addEventListener("keyup", (e) => {
    const i = KEYS[e.code];
    if (i === undefined) return;
    e.preventDefault();
    release(i);
  });
  window.addEventListener("blur", () => {
    release(0);
    release(1);
  });

  function bindPad(el, i) {
    const down = (e) => {
      e.preventDefault();
      document.body.classList.add("has-touch");
      el.classList.add("down");
      press(i);
    };
    const up = (e) => {
      e.preventDefault();
      el.classList.remove("down");
      release(i);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", up);
  }
  bindPad($("padP1"), 0);
  bindPad($("padP2"), 1);
  if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
    document.body.classList.add("has-touch");
  }

  /* --------------------------------------------------------------- state */

  const state = {
    mode: "menu", // menu | countdown | fight | point | over
    t: 0,
    timer: 0,
    round: 1,
    scores: [0, 0],
    arena: [...ARENA_FULL],
    shake: 0,
    flash: 0,
    slow: 0,
    banner: null,
    bannerT: 0,
    bot: null, // null | "easy" | "normal" | "hard"
    lastWinner: null,
  };

  const players = [makePlayer(0), makePlayer(1)];
  let particles = [];
  let boon = null;
  let arenaArt = null;

  function makePlayer(i) {
    return {
      i,
      x: 0,
      y: GROUND_Y,
      vx: 0,
      vy: 0,
      facing: i === 0 ? 1 : -1,
      grounded: true,
      hopReady: true,
      st: "idle", // idle | charging | bashing | hit | dead
      charge: 0,
      chargeT: 0,
      bashT: 0,
      hitT: 0,
      scorch: 0,
      squash: 1,
      animT: 0,
      blink: 0,
      blinkT: 2,
      scarf: [],
      boon: null,
      boonT: 0,
      bot: false,
      botT: 0,
      botPlan: "wait",
    };
  }

  const skinOf = (i) =>
    Art.SKINS.find((s) => s.id === (i === 0 ? "ember" : "frost")) || Art.SKINS[0];

  /* ------------------------------------------------------------- helpers */

  function addParticles(kind, x, y, n, o = {}) {
    for (let k = 0; k < n; k++) {
      const a = o.angle != null ? o.angle + (Math.random() - 0.5) * (o.spread ?? 1) : Math.random() * Math.PI * 2;
      const sp = (o.speed ?? 120) * (0.4 + Math.random());
      particles.push({
        kind,
        x: x + (Math.random() - 0.5) * (o.jitter ?? 8),
        y: y + (Math.random() - 0.5) * (o.jitter ?? 8),
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: (o.life ?? 0.5) * (0.6 + Math.random() * 0.8),
        max: o.life ?? 0.5,
        size: (o.size ?? 3) * (0.6 + Math.random()),
        grav: o.grav ?? 320,
        color: o.color || "#ffd9a0",
      });
    }
    if (particles.length > 420) particles.splice(0, particles.length - 420);
  }

  const shake = (v) => (state.shake = Math.min(26, state.shake + v));

  function banner(text, sub, time = 1.1) {
    state.banner = { text, sub };
    state.bannerT = time;
  }

  /* ---------------------------------------------------------- match flow */

  function startMatch(botLevel) {
    state.bot = botLevel;
    state.scores = [0, 0];
    state.round = 1;
    players[1].bot = !!botLevel;
    players[0].bot = false;
    hideCards();
    els.hud.hidden = false;
    startRound();
  }

  function startRound() {
    state.arena = [...ARENA_FULL];
    state.timer = 0;
    boon = null;
    particles = [];
    for (const p of players) resetPlayer(p);
    state.mode = "countdown";
    state.t = 0;
    updateHud();
  }

  function resetPlayer(p) {
    const mid = (state.arena[0] + state.arena[1]) / 2;
    p.x = p.i === 0 ? mid - 150 : mid + 150;
    p.y = GROUND_Y;
    p.vx = 0;
    p.vy = 0;
    p.facing = p.i === 0 ? 1 : -1;
    p.grounded = true;
    p.hopReady = true;
    p.st = "idle";
    p.charge = 0;
    p.chargeT = 0;
    p.bashT = 0;
    p.hitT = 0;
    p.scorch = 0;
    p.squash = 1;
    p.boon = null;
    p.boonT = 0;
    p.scarf = [];
    for (let k = 0; k < 6; k++) p.scarf.push({ x: p.x, y: p.y - 22, px: p.x, py: p.y - 22 });
  }

  function scorePoint(winner) {
    if (state.mode !== "fight") return;
    state.scores[winner]++;
    state.mode = "point";
    state.t = 0;
    state.slow = 0.9;
    SFX.point();
    updateHud();
    const target = save.firstTo;
    if (state.scores[winner] >= target) {
      // the transition lives in step(), not a timer: background tabs throttle
      // timers and the match would hang on the point screen
      state.lastWinner = winner;
      save.wins[winner] = (save.wins[winner] || 0) + 1;
      persist();
      banner(winner === 0 ? "Ember takes it" : "Frost takes it", "Match point", 1.2);
    } else {
      banner(winner === 0 ? "Point: Ember" : "Point: Frost", `${state.scores[0]} — ${state.scores[1]}`, 1.2);
    }
  }

  function endMatch() {
    state.mode = "over";
    SFX.win();
    const w = state.lastWinner;
    const solo = !!state.bot;
    els.overTitle.textContent =
      solo && w === 1 ? "The bot wins" : w === 0 ? "Ember wins!" : "Frost wins!";
    els.overBody.textContent = `${state.scores[0]} — ${state.scores[1]}${
      solo ? ` · vs bot (${state.bot})` : ""
    }`;
    els.over.hidden = false;
    els.hud.hidden = true;
  }

  /* ------------------------------------------------------------- actions */

  function onPress(i) {
    if (state.mode === "menu" || state.mode === "over") return;
    const p = players[i];
    if (p.bot || p.st === "dead") return;
    // press only starts a charge timer; tap vs hold is decided on release
    if (p.st === "idle" || p.st === "hit") {
      p.chargeT = 0;
      p.st = "charging";
      p.charge = 0;
    }
  }

  function onRelease(i) {
    const p = players[i];
    if (p.bot || p.st !== "charging") return;
    if (p.chargeT < HOLD_TO_CHARGE) hop(p);
    else bash(p);
  }

  function hop(p) {
    p.st = "idle";
    p.charge = 0;
    if (!p.hopReady) return;
    p.hopReady = p.boon === "feather";
    p.vy = HOP_VY;
    p.vx = -p.facing * HOP_VX;
    p.grounded = false;
    p.squash = 1.25;
    SFX.hop();
    addParticles("dust", p.x, p.y, 6, {
      color: "rgba(255,246,224,0.8)",
      speed: 90,
      life: 0.35,
      grav: 200,
      angle: Math.PI / 2,
      spread: 2,
    });
  }

  function bash(p) {
    const power = p.charge * (p.boon === "bigbash" ? 1.35 : 1);
    p.st = "bashing";
    p.bashT = BASH_TIME;
    p.bashPower = power;
    p.vx = p.facing * (BASH_SPEED + power * BASH_SPEED_MAX);
    if (!p.grounded) p.vy = Math.min(p.vy, -40);
    p.squash = 0.82;
    SFX.bash();
    addParticles("ember", p.x - p.facing * 10, p.y - PH / 2, 12 + power * 10, {
      color: skinOf(p.i).glow,
      speed: 170,
      life: 0.4,
      grav: 60,
      angle: p.facing > 0 ? Math.PI : 0,
      spread: 1.2,
    });
  }

  /* ----------------------------------------------------------------- bot */

  const BOT = {
    easy: { react: 0.42, aggression: 0.5, edge: 0.5, charge: 0.45 },
    normal: { react: 0.24, aggression: 0.72, edge: 0.8, charge: 0.62 },
    hard: { react: 0.13, aggression: 0.9, edge: 1, charge: 0.78 },
  };

  function updateBot(p, foe, dt) {
    const cfg = BOT[state.bot] || BOT.normal;
    p.botT -= dt;
    if (p.botT > 0) return;
    p.botT = cfg.react * (0.7 + Math.random() * 0.6);

    const dist = Math.abs(foe.x - p.x);
    const nearEdge =
      p.x - state.arena[0] < 90 * cfg.edge || state.arena[1] - p.x < 90 * cfg.edge;
    const threat = foe.st === "bashing" && Math.sign(foe.facing) === Math.sign(p.x - foe.x);

    if (p.st === "charging") {
      // release when charged enough, or bail if the opponent is about to hit
      if (threat || p.chargeT > CHARGE_TIME * cfg.charge) {
        if (threat && Math.random() < cfg.edge) {
          p.chargeT = 0;
          hop(p);
        } else if (p.chargeT >= HOLD_TO_CHARGE) {
          bash(p);
        }
      }
      return;
    }
    if (p.st !== "idle" && p.st !== "hit") return;

    if (threat && dist < 190 && Math.random() < cfg.edge) {
      p.st = "charging";
      p.chargeT = 0;
      hop(p);
      return;
    }
    if (nearEdge && p.grounded) {
      // hop drives backwards, so face the edge before hopping to safety
      const mid = (state.arena[0] + state.arena[1]) / 2;
      p.facing = p.x < mid ? -1 : 1;
      p.st = "charging";
      p.chargeT = 0;
      hop(p);
      return;
    }
    if (dist < 150 && Math.random() < cfg.aggression) {
      p.st = "charging";
      p.chargeT = 0;
      return;
    }
    if (dist > 240 && Math.random() < cfg.aggression * 0.8) {
      // close the gap with a light bash
      p.st = "charging";
      p.chargeT = HOLD_TO_CHARGE + 0.02;
      p.charge = 0.25;
    }
  }

  /* ------------------------------------------------------------- physics */

  function updatePlayer(p, foe, dt) {
    p.animT += dt;
    p.blinkT -= dt;
    if (p.blinkT <= 0) {
      p.blink = 0.12;
      p.blinkT = 1.8 + Math.random() * 3;
    }
    p.blink = Math.max(0, p.blink - dt);
    p.squash += (1 - p.squash) * Math.min(1, dt * 12);
    if (p.boonT > 0) {
      p.boonT -= dt;
      if (p.boonT <= 0) p.boon = null;
    }

    if (p.st === "charging") {
      p.chargeT += dt;
      p.charge = Math.min(1, Math.max(0, p.chargeT - HOLD_TO_CHARGE) / CHARGE_TIME);
      if (p.grounded) p.vx -= p.vx * Math.min(1, dt * 9);
      if (p.charge > 0 && Math.random() < 0.5) {
        addParticles("ember", p.x, p.y - PH * 0.6, 1, {
          color: skinOf(p.i).glow,
          speed: 40,
          life: 0.4,
          grav: -120,
          size: 2 + p.charge * 3,
        });
      }
    }
    if (p.st === "bashing") {
      p.bashT -= dt;
      if (p.bashT <= 0) p.st = "idle";
      if (Math.random() < 0.7) {
        addParticles("ember", p.x, p.y - PH / 2, 1, {
          color: skinOf(p.i).glow,
          speed: 30,
          life: 0.3,
          grav: -40,
          size: 3,
        });
      }
    }
    if (p.st === "hit") {
      p.hitT -= dt;
      if (p.hitT <= 0) p.st = "idle";
    }

    // face the opponent unless committed to a lunge
    if (p.st !== "bashing") p.facing = foe.x >= p.x ? 1 : -1;

    p.vy += GRAVITY * dt;
    p.vy = Math.min(p.vy, MAX_FALL);
    const drag = p.grounded ? FRICTION : AIR_DRAG;
    if (p.st !== "bashing") {
      const f = drag * dt;
      p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    const onPlatform = p.x > state.arena[0] && p.x < state.arena[1];
    if (onPlatform && p.y >= GROUND_Y && p.vy >= 0) {
      if (!p.grounded) {
        p.squash = 1 - Math.min(0.3, p.vy / 2600);
        if (p.vy > 260)
          addParticles("dust", p.x, GROUND_Y, 6, {
            color: "rgba(255,246,224,0.7)",
            speed: 70,
            life: 0.35,
            grav: 120,
            angle: -Math.PI / 2,
            spread: 2.4,
          });
      }
      p.y = GROUND_Y;
      p.vy = 0;
      p.grounded = true;
      p.hopReady = true;
    } else {
      p.grounded = false;
    }

    if (p.y > WORLD_H + 120 && p.st !== "dead") {
      p.st = "dead";
      SFX.fall();
      scorePoint(1 - p.i);
    }

    // scarf trails behind
    const ax = p.x - p.facing * 5;
    const ay = p.y - 21 * p.squash;
    for (let k = 0; k < p.scarf.length; k++) {
      const s = p.scarf[k];
      if (k === 0) {
        s.x = ax;
        s.y = ay;
        s.px = ax;
        s.py = ay;
        continue;
      }
      const vx = (s.x - s.px) * 0.86;
      const vy = (s.y - s.py) * 0.86;
      s.px = s.x;
      s.py = s.y;
      s.x += vx - p.vx * dt * 0.55;
      s.y += vy + 250 * dt;
    }
    for (let it = 0; it < 3; it++) {
      for (let k = 1; k < p.scarf.length; k++) {
        const a = p.scarf[k - 1];
        const s = p.scarf[k];
        const dx = s.x - a.x;
        const dy = s.y - a.y;
        const d = Math.hypot(dx, dy) || 0.001;
        const diff = (d - 4.4) / d;
        s.x -= dx * diff * (k === 1 ? 1 : 0.55);
        s.y -= dy * diff * (k === 1 ? 1 : 0.55);
      }
    }
  }

  function resolveClash() {
    const [a, b] = players;
    if (a.st === "dead" || b.st === "dead") return;
    if (Math.abs(a.x - b.x) > PW || Math.abs(a.y - b.y) > PH) return;

    const aBash = a.st === "bashing";
    const bBash = b.st === "bashing";

    if (aBash && bBash) {
      const dir = Math.sign(a.x - b.x) || 1;
      a.vx = dir * 260;
      b.vx = -dir * 260;
      a.vy = b.vy = -120;
      a.st = b.st = "hit";
      a.hitT = b.hitT = 0.2;
      a.scorch += 3;
      b.scorch += 3;
      SFX.clash();
      shake(7);
      state.flash = 0.25;
      addParticles("spark", (a.x + b.x) / 2, (a.y + b.y) / 2 - PH / 2, 26, {
        color: "#fff3d0",
        speed: 260,
        life: 0.5,
        grav: 120,
        size: 3,
      });
      updateHud();
      return;
    }
    if (aBash || bBash) {
      const hitter = aBash ? a : b;
      const victim = aBash ? b : a;
      land(hitter, victim);
      return;
    }
    // neither attacking: gentle shove so they cannot stack
    const dir = Math.sign(a.x - b.x) || 1;
    a.vx += dir * 60;
    b.vx -= dir * 60;
  }

  function land(hitter, victim) {
    const power = hitter.bashPower || 0;
    const punish = victim.st === "charging" ? PUNISH_MULT : 1;
    const resist = victim.boon === "stone" ? 0.55 : 1;
    const force = (KNOCK_BASE + power * KNOCK_CHARGE) * (1 + victim.scorch * 0.02) * punish * resist;
    victim.vx = hitter.facing * force;
    victim.vy = -(KNOCK_UP + power * 150) * (punish > 1 ? 1.15 : 1);
    victim.st = "hit";
    victim.hitT = 0.28;
    victim.grounded = false;
    victim.charge = 0;
    victim.scorch += (SCORCH_PER_HIT + power * SCORCH_PER_CHARGE) * punish * resist;
    hitter.st = "idle";
    hitter.bashT = 0;
    hitter.vx *= 0.2;

    SFX.hit(power);
    shake(8 + power * 10);
    state.flash = 0.2 + power * 0.25;
    state.slow = 0.12 + power * 0.1;
    addParticles("spark", victim.x, victim.y - PH / 2, 18 + power * 18, {
      color: punish > 1 ? "#ffd0e0" : "#fff3d0",
      speed: 200 + power * 220,
      life: 0.5,
      grav: 200,
      size: 3,
      angle: hitter.facing > 0 ? 0 : Math.PI,
      spread: 1.5,
    });
    if (punish > 1) banner("Punished!", "hit while charging", 0.8);
    updateHud();
  }

  /* --------------------------------------------------------------- boons */

  const BOONS = [
    { id: "bigbash", label: "Big bash", color: "#ff9a4d" },
    { id: "feather", label: "Feather", color: "#7fd4ff" },
    { id: "stone", label: "Stone", color: "#c9a6ff" },
  ];

  function updateBoon(dt) {
    if (state.mode !== "fight") return;
    if (!boon) {
      if (state.timer > 5 && Math.random() < dt * 0.14) {
        const kind = BOONS[Math.floor(Math.random() * BOONS.length)];
        boon = {
          kind,
          x: state.arena[0] + 60 + Math.random() * (state.arena[1] - state.arena[0] - 120),
          y: -30,
          t: 0,
        };
      }
      return;
    }
    boon.t += dt;
    boon.y = Math.min(GROUND_Y - 26, boon.y + 120 * dt);
    for (const p of players) {
      if (p.st === "dead") continue;
      if (Math.abs(p.x - boon.x) < 30 && Math.abs(p.y - PH / 2 - boon.y) < 34) {
        p.boon = boon.kind.id;
        p.boonT = 7;
        SFX.boon();
        addParticles("spark", boon.x, boon.y, 22, {
          color: boon.kind.color,
          speed: 180,
          life: 0.6,
          grav: -40,
          size: 3,
        });
        boon = null;
        updateHud();
        return;
      }
    }
    if (boon.t > 14) boon = null;
  }

  /* ----------------------------------------------------------------- hud */

  function updateHud() {
    els.p1Scorch.style.setProperty("--v", Math.min(100, players[0].scorch) + "%");
    els.p2Scorch.style.setProperty("--v", Math.min(100, players[1].scorch) + "%");
    els.p1Scorch.dataset.v = Math.round(players[0].scorch);
    els.p2Scorch.dataset.v = Math.round(players[1].scorch);
    els.p1Score.textContent = state.scores[0];
    els.p2Score.textContent = state.scores[1];
    for (const [el, p] of [
      [els.p1Boon, players[0]],
      [els.p2Boon, players[1]],
    ]) {
      const b = p.boon ? BOONS.find((x) => x.id === p.boon) : null;
      el.hidden = !b;
      if (b) {
        el.textContent = b.label;
        el.style.color = b.color;
      }
    }
  }

  /* ---------------------------------------------------------------- step */

  function step(dt) {
    state.t += dt;
    if (state.mode === "countdown") {
      const n = Math.ceil(3 - state.t);
      if (n !== state.lastCount && n > 0) {
        state.lastCount = n;
        SFX.count(false);
        banner(String(n), null, 0.8);
      }
      if (state.t >= 3) {
        state.mode = "fight";
        state.t = 0;
        state.lastCount = null;
        SFX.count(true);
        banner("Go!", null, 0.6);
      }
      return;
    }
    if (state.mode === "point") {
      if (state.t > 1.6) {
        if (state.scores[0] >= save.firstTo || state.scores[1] >= save.firstTo) endMatch();
        else {
          state.round++;
          startRound();
        }
      }
      return;
    }
    if (state.mode !== "fight") return;

    state.timer += dt;
    if (state.timer > SHRINK_AFTER) {
      const w = state.arena[1] - state.arena[0];
      if (w > ARENA_MIN_W) {
        state.arena[0] += SHRINK_RATE * dt;
        state.arena[1] -= SHRINK_RATE * dt;
        if (Math.random() < dt * 8) {
          const side = Math.random() < 0.5 ? 0 : 1;
          addParticles("rock", state.arena[side], GROUND_Y + 10, 2, {
            color: "#6a4c3b",
            speed: 60,
            life: 0.9,
            grav: 700,
            size: 4,
          });
        }
      }
    }

    for (const p of players) {
      if (p.bot && state.mode === "fight") updateBot(p, players[1 - p.i], dt);
      updatePlayer(p, players[1 - p.i], dt);
    }
    resolveClash();
    updateBoon(dt);
  }

  /* -------------------------------------------------------------- render */

  let bg = null;
  function render() {
    const cw = view.cw;
    const ch = view.ch;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = "#0f0a17";
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);
    ctx.beginPath();
    ctx.rect(0, 0, WORLD_W, WORLD_H);
    ctx.clip();

    Art.paintSky(ctx, "sky", WORLD_W, WORLD_H, 0);
    if (!bg) bg = Art.backgrounds("sky");
    const sx = state.shake ? (Math.random() - 0.5) * state.shake : 0;
    const sy = state.shake ? (Math.random() - 0.5) * state.shake : 0;
    // tiled, or the strip's own edge shows up as a seam across the sky
    strip(bg.far, (WORLD_H * 0.8) / bg.far.height, WORLD_H * 0.96, sx * 0.2 + sy * 0.1);
    strip(bg.mid, (WORLD_H * 0.72) / bg.mid.height, WORLD_H * 1.02, sx * 0.4 + sy * 0.2);

    ctx.save();
    ctx.translate(sx, sy);
    drawArena();
    drawBoon();
    drawParticles();
    for (const p of players) drawPlayer(p);
    ctx.restore();

    drawFogAndVignette();
    drawBanner();
    ctx.restore();

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,246,220,${state.flash * 0.5})`;
      ctx.fillRect(0, 0, cw, ch);
    }
  }

  /** Repeat a parallax strip across the whole arena, bottom-anchored. */
  function strip(img, scale, bottom, offset) {
    const w = img.width * scale;
    const h = img.height * scale;
    let x = -(((offset % w) + w) % w);
    for (; x < WORLD_W; x += w - 1) ctx.drawImage(img, x, bottom - h, w, h);
  }

  function drawArena() {
    if (!arenaArt) return;
    const [x0, x1] = state.arena;
    const w = x1 - x0;
    const src = arenaArt.canvas;
    const cut = (src.width - w) / 2;
    ctx.drawImage(src, cut, 0, w, src.height, x0, GROUND_Y - arenaArt.surfaceY, w, src.height);

    // freshly broken rock at both ends while the island crumbles
    for (const [x, dir] of [
      [x0, -1],
      [x1, 1],
    ]) {
      ctx.fillStyle = "#2b2018";
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y - 2);
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(x + dir * (4 + (i % 2) * 7), GROUND_Y + 12 + i * 18);
      }
      ctx.lineTo(x, GROUND_Y + 96);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,214,150,0.22)";
      ctx.fillRect(x - (dir > 0 ? 3 : 0), GROUND_Y - 2, 3, 22);
    }
  }

  function drawBoon() {
    if (!boon) return;
    const t = performance.now() / 1000;
    ctx.save();
    ctx.translate(boon.x, boon.y + Math.sin(t * 3) * 4);
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 34);
    g.addColorStop(0, boon.kind.color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.rotate(t * 0.8);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.fillStyle = boon.kind.color;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 9, Math.sin(a) * 9, 7, 4.4, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#fff6e0";
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
      } else {
        ctx.fillStyle = q.color;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.size * (0.4 + a * 0.8), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer(p) {
    if (p.st === "dead") return;
    const skin = skinOf(p.i);
    const t = performance.now() / 1000;

    // shadow on the island
    if (p.x > state.arena[0] && p.x < state.arena[1]) {
      const dist = Math.max(0, Math.min(1, (GROUND_Y - p.y) / 200));
      ctx.fillStyle = `rgba(0,0,0,${0.32 * (1 - dist)})`;
      ctx.beginPath();
      ctx.ellipse(p.x, GROUND_Y - 2, 15 * (1 - dist * 0.5), 5 * (1 - dist * 0.5), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // charge tell: a growing ember the opponent can read
    if (p.st === "charging" && p.charge > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const r = 16 + p.charge * 34;
      const g = ctx.createRadialGradient(p.x, p.y - PH / 2, 0, p.x, p.y - PH / 2, r);
      g.addColorStop(0, skin.glow);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.35 + p.charge * 0.4;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y - PH / 2, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // ring closes as the charge fills
      ctx.strokeStyle = p.charge >= 1 ? "#fff3d0" : skin.glow;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(p.x, p.y - PH - 16, 12, -Math.PI / 2, -Math.PI / 2 + p.charge * Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (p.st === "bashing") {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = skin.glow;
      for (let k = 1; k <= 3; k++) {
        ctx.beginPath();
        ctx.ellipse(p.x - p.facing * k * 13, p.y - PH / 2, 12, 15, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(FOX_SCALE, FOX_SCALE);
    ctx.translate(-p.x, -p.y);
    Art.drawFox(
      ctx,
      {
        x: p.x,
        y: p.y,
        vx: p.vx,
        vy: p.vy,
        facing: p.facing,
        grounded: p.grounded,
        squash: p.squash,
        animT: p.animT,
        blink: p.blink,
        squint: p.st === "bashing" || p.st === "charging",
        earBack: p.st === "bashing",
        headTilt: 0,
        eyeDx: 0,
        scarf: p.scarf,
      },
      skin,
    );
    ctx.restore();

    if (p.boon) {
      const b = BOONS.find((x) => x.id === p.boon);
      if (b) Art.drawEmber(ctx, p.x, p.y - PH - 34, 4, t, "rgba(255,255,255,0.9)", b.color);
    }
  }

  function drawFogAndVignette() {
    const p = Art.PALETTES.sky;
    const fog = ctx.createLinearGradient(0, WORLD_H * 0.55, 0, WORLD_H);
    fog.addColorStop(0, p.fogTop);
    fog.addColorStop(1, p.fogBot);
    ctx.fillStyle = fog;
    ctx.fillRect(0, WORLD_H * 0.55, WORLD_W, WORLD_H * 0.45);
    const v = ctx.createRadialGradient(
      WORLD_W / 2,
      WORLD_H / 2,
      WORLD_H * 0.35,
      WORLD_W / 2,
      WORLD_H / 2,
      WORLD_W * 0.75,
    );
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, p.vignette);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }

  function drawBanner() {
    if (!state.banner || state.bannerT <= 0) return;
    const a = Math.min(1, state.bannerT * 2.2);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = "center";
    ctx.font = '900 74px "Trebuchet MS","Segoe UI",system-ui,sans-serif';
    ctx.fillStyle = "rgba(12,8,18,0.55)";
    ctx.fillText(state.banner.text, WORLD_W / 2 + 3, WORLD_H * 0.34 + 4);
    const g = ctx.createLinearGradient(WORLD_W / 2 - 160, 0, WORLD_W / 2 + 160, 0);
    g.addColorStop(0, "#fff5d8");
    g.addColorStop(0.5, "#ffc472");
    g.addColorStop(1, "#ff7a4d");
    ctx.fillStyle = g;
    ctx.fillText(state.banner.text, WORLD_W / 2, WORLD_H * 0.34);
    if (state.banner.sub) {
      ctx.font = '700 22px "Trebuchet MS","Segoe UI",system-ui,sans-serif';
      ctx.fillStyle = "rgba(255,246,232,0.9)";
      ctx.fillText(state.banner.sub, WORLD_W / 2, WORLD_H * 0.34 + 34);
    }
    ctx.restore();
  }

  /* -------------------------------------------------------------- resize */

  const view = { scale: 1, ox: 0, oy: 0, cw: 0, ch: 0, dpr: 1 };

  function resize() {
    const rect = frame.getBoundingClientRect();
    let w = rect.width;
    let h = rect.height;
    if (w < 2 || h < 2) {
      w = window.innerWidth;
      h = window.innerHeight;
    }
    if (w < 2 || h < 2) return;
    const cw = Math.floor(w);
    const ch = Math.floor(h);
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    while (dpr > 1 && cw * ch * dpr * dpr > 2.6e6) dpr -= 0.25;
    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
    canvas.style.width = cw + "px";
    canvas.style.height = ch + "px";
    view.cw = cw;
    view.ch = ch;
    view.dpr = dpr;
    view.scale = Math.min(cw / WORLD_W, ch / WORLD_H);
    view.ox = (cw - WORLD_W * view.scale) / 2;
    view.oy = (ch - WORLD_H * view.scale) / 2;
    view.fw = frame.clientWidth;
    view.fh = frame.clientHeight;
    // a duel needs both thumbs on the long edge
    els.rotate.hidden = cw / ch > 1.15 || state.mode === "menu";
  }

  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 120));
  if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(frame);

  /* ---------------------------------------------------------------- loop */

  let last = performance.now();
  let acc = 0;

  function frameLoop(now) {
    requestAnimationFrame(frameLoop);
    try {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.25) dt = 0.25;
      if (frame.clientWidth !== view.fw || frame.clientHeight !== view.fh) resize();
      if (!view.cw || !view.ch) return;

      state.shake *= Math.pow(0.002, dt);
      if (state.shake < 0.3) state.shake = 0;
      state.flash = Math.max(0, state.flash - dt * 2.4);
      state.bannerT = Math.max(0, state.bannerT - dt);
      state.slow = Math.max(0, state.slow - dt);

      const scale = state.slow > 0 ? 0.32 : 1;
      acc += dt * scale;
      let guard = 0;
      const fixed = 1 / 120;
      while (acc >= fixed && guard++ < 8) {
        if (state.mode !== "menu" && state.mode !== "over") step(fixed);
        acc -= fixed;
      }
      if (guard >= 8) acc = 0;

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
        q.vx *= 1 - Math.min(1, dt * 1.2);
      }

      render();
    } catch (err) {
      crash(err);
    }
  }

  let crashed = false;
  function crash(err) {
    window.__duelError = String((err && err.stack) || err);
    if (crashed) return;
    crashed = true;
    console.error("[Foxfire Duel]", err);
    const box = $("crash");
    if (!box) return;
    box.hidden = false;
    box.innerHTML = `<strong>The arena went dark.</strong><span>${String(
      (err && err.message) || err,
    ).slice(0, 160)}</span><button type="button" id="crashReload">Reload</button>`;
    const b = $("crashReload");
    if (b) b.addEventListener("click", () => location.reload());
  }
  window.addEventListener("error", (e) => crash(e.error || e.message));

  /* ------------------------------------------------------------------ ui */

  function hideCards() {
    els.menu.hidden = true;
    els.over.hidden = true;
  }

  function showMenu() {
    state.mode = "menu";
    els.menu.hidden = false;
    els.over.hidden = true;
    els.hud.hidden = true;
    els.rotate.hidden = true;
    els.firstTo.textContent = save.firstTo;
  }

  $("twoPlayers").addEventListener("click", () => {
    audioReady();
    SFX.ui();
    startMatch(null);
  });
  for (const lvl of ["easy", "normal", "hard"]) {
    $("bot-" + lvl).addEventListener("click", () => {
      audioReady();
      SFX.ui();
      startMatch(lvl);
    });
  }
  $("firstToBtn").addEventListener("click", () => {
    const opts = [3, 5, 7];
    save.firstTo = opts[(opts.indexOf(save.firstTo) + 1) % opts.length];
    persist();
    els.firstTo.textContent = save.firstTo;
    SFX.ui();
  });
  $("againBtn").addEventListener("click", () => {
    SFX.ui();
    startMatch(state.bot);
  });
  $("menuBtn").addEventListener("click", () => {
    SFX.ui();
    showMenu();
  });
  els.soundBtn.addEventListener("click", () => {
    audioReady();
    setSound(!save.sound);
    SFX.ui();
  });

  /* ---------------------------------------------------------------- boot */

  try {
    arenaArt = Art.bakeArena(ARENA_FULL[1] - ARENA_FULL[0], "sky");
    setSound(save.sound);
    resize();
    for (const p of players) resetPlayer(p);
    showMenu();
  } catch (err) {
    crash(err);
  }
  requestAnimationFrame(frameLoop);

  window.Duel = { state, players, step, render, startMatch, view };
})();
