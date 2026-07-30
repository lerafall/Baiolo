(() => {
  "use strict";

  const COLS = 10;
  const ROWS = 20;
  const HIDDEN = 2;
  const TOTAL = ROWS + HIDDEN;

  const SHAPES = {
    I: [
      [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
      ],
    ],
    O: [
      [
        [1, 1],
        [1, 1],
      ],
    ],
    T: [
      [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 1, 0],
        [1, 1, 0],
        [0, 1, 0],
      ],
    ],
    S: [
      [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 1],
        [0, 0, 1],
      ],
    ],
    Z: [
      [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 0, 1],
        [0, 1, 1],
        [0, 1, 0],
      ],
    ],
    J: [
      [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 1],
        [0, 1, 0],
        [0, 1, 0],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [0, 0, 1],
      ],
      [
        [0, 1, 0],
        [0, 1, 0],
        [1, 1, 0],
      ],
    ],
    L: [
      [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 0],
        [0, 1, 1],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [1, 0, 0],
      ],
      [
        [1, 1, 0],
        [0, 1, 0],
        [0, 1, 0],
      ],
    ],
  };

  const BAG = ["I", "O", "T", "S", "Z", "J", "L"];

  const WORLDS = {
    moon: {
      id: "moon",
      name: "Moon Garden",
      sky: ["#1a1240", "#24185a", "#120c2b"],
      board: "rgba(10, 6, 28, 0.55)",
      grid: "rgba(196, 181, 253, 0.12)",
      clear: ["#c4b5fd", "#a5f3fc", "#fde68a"],
      pieces: {
        I: ["#67e8f9", "#22d3ee"],
        O: ["#fde68a", "#fbbf24"],
        T: ["#c4b5fd", "#a78bfa"],
        S: ["#6ee7b7", "#34d399"],
        Z: ["#f9a8d4", "#f472b6"],
        J: ["#93c5fd", "#60a5fa"],
        L: ["#fdba74", "#fb923c"],
      },
    },
    candy: {
      id: "candy",
      name: "Candy Cloud",
      sky: ["#4c1d3d", "#7c2d54", "#2a1024"],
      board: "rgba(40, 12, 28, 0.5)",
      grid: "rgba(249, 168, 212, 0.14)",
      clear: ["#f9a8d4", "#fdba74", "#fff7ed"],
      pieces: {
        I: ["#fda4af", "#fb7185"],
        O: ["#fde68a", "#fcd34d"],
        T: ["#f0abfc", "#e879f9"],
        S: ["#86efac", "#4ade80"],
        Z: ["#fca5a5", "#f87171"],
        J: ["#a5b4fc", "#818cf8"],
        L: ["#fdba74", "#fb923c"],
      },
    },
    crystal: {
      id: "crystal",
      name: "Crystal Forest",
      sky: ["#042f2e", "#134e4a", "#022c22"],
      board: "rgba(4, 24, 22, 0.55)",
      grid: "rgba(94, 234, 212, 0.12)",
      clear: ["#5eead4", "#86efac", "#a5f3fc"],
      pieces: {
        I: ["#5eead4", "#2dd4bf"],
        O: ["#fef08a", "#facc15"],
        T: ["#a7f3d0", "#6ee7b7"],
        S: ["#6ee7b7", "#34d399"],
        Z: ["#99f6e4", "#5eead4"],
        J: ["#7dd3fc", "#38bdf8"],
        L: ["#86efac", "#4ade80"],
      },
    },
    aurora: {
      id: "aurora",
      name: "Aurora Castle",
      sky: ["#1e1b4b", "#312e81", "#0f0a1f"],
      board: "rgba(15, 10, 40, 0.55)",
      grid: "rgba(167, 139, 250, 0.14)",
      clear: ["#6ee7b7", "#c4b5fd", "#f9a8d4"],
      pieces: {
        I: ["#67e8f9", "#22d3ee"],
        O: ["#fde68a", "#fbbf24"],
        T: ["#c4b5fd", "#a78bfa"],
        S: ["#6ee7b7", "#34d399"],
        Z: ["#f9a8d4", "#f472b6"],
        J: ["#a5b4fc", "#818cf8"],
        L: ["#fdba74", "#f97316"],
      },
    },
  };

  const STAGES = [
    {
      title: "First sparkles",
      world: "moon",
      goalLines: 2,
      gravity: 900,
      teach: "soft",
    },
    {
      title: "Garden breeze",
      world: "moon",
      goalLines: 4,
      gravity: 780,
    },
    {
      title: "Sugar rain",
      world: "candy",
      goalLines: 6,
      gravity: 700,
    },
    {
      title: "Candy rush",
      world: "candy",
      goalLines: 8,
      gravity: 620,
    },
    {
      title: "Leaf light",
      world: "crystal",
      goalLines: 10,
      gravity: 560,
    },
    {
      title: "Shard cascade",
      world: "crystal",
      goalLines: 12,
      gravity: 500,
    },
    {
      title: "Castle glow",
      world: "aurora",
      goalLines: 14,
      gravity: 440,
    },
    {
      title: "Aurora rise",
      world: "aurora",
      goalLines: 16,
      gravity: 380,
    },
  ];

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const nextCanvas = document.getElementById("next");
  const nctx = nextCanvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const els = {
    frame: document.getElementById("frame"),
    hud: document.getElementById("hud"),
    side: document.getElementById("side"),
    pads: document.getElementById("pads"),
    stageLabel: document.getElementById("stageLabel"),
    score: document.getElementById("score"),
    lines: document.getElementById("lines"),
    worldName: document.getElementById("worldName"),
    combo: document.getElementById("combo"),
    comboN: document.getElementById("comboN"),
    overlay: document.getElementById("overlay"),
    startBtn: document.getElementById("startBtn"),
    stageCard: document.getElementById("stageCard"),
    stageKicker: document.getElementById("stageKicker"),
    stageTitle: document.getElementById("stageTitle"),
    stageGoal: document.getElementById("stageGoal"),
    winCard: document.getElementById("winCard"),
    winEyebrow: document.getElementById("winEyebrow"),
    winTitle: document.getElementById("winTitle"),
    winBody: document.getElementById("winBody"),
    nextBtn: document.getElementById("nextBtn"),
    clearFlash: document.getElementById("clearFlash"),
  };

  // Board layout in canvas
  const BOARD_W = 220;
  const CELL = BOARD_W / COLS;
  const BOARD_H = CELL * ROWS;
  const BOARD_X = 28;
  const BOARD_Y = 72;

  let mode = "title"; // title | play | clear | win | endless
  let stageIndex = 0;
  let endless = false;
  let board = createBoard();
  let bag = [];
  let current = null;
  let nextType = null;
  let score = 0;
  let linesTotal = 0;
  let stageLines = 0;
  let combo = 0;
  let dropAcc = 0;
  let gravity = 900;
  let lockFlash = [];
  let particles = [];
  let time = 0;
  let clearRows = [];
  let clearTimer = 0;
  let world = WORLDS.moon;
  let pollen = Array.from({ length: 30 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: 1 + Math.random() * 2,
    a: 0.15 + Math.random() * 0.4,
    s: 0.15 + Math.random() * 0.4,
  }));

  function createBoard() {
    return Array.from({ length: TOTAL }, () => Array(COLS).fill(null));
  }

  function shuffleBag() {
    const b = [...BAG];
    for (let i = b.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    bag.push(...b);
  }

  function pullType() {
    if (bag.length < 7) shuffleBag();
    return bag.shift();
  }

  function spawn() {
    const type = nextType || pullType();
    nextType = pullType();
    const mats = SHAPES[type];
    current = {
      type,
      rot: 0,
      x: Math.floor(COLS / 2) - Math.ceil(mats[0][0].length / 2),
      y: 0,
    };
    if (collides(current, 0, 0, 0)) {
      // game over → restart stage or continue endless with reset board
      if (endless) {
        board = createBoard();
        combo = 0;
      } else {
        board = createBoard();
        stageLines = 0;
        combo = 0;
      }
      current = {
        type,
        rot: 0,
        x: Math.floor(COLS / 2) - Math.ceil(mats[0][0].length / 2),
        y: 0,
      };
    }
    drawNext();
  }

  function matrix(piece) {
    const mats = SHAPES[piece.type];
    return mats[piece.rot % mats.length];
  }

  function collides(piece, dx, dy, dRot) {
    const mats = SHAPES[piece.type];
    const rot = (piece.rot + dRot + mats.length * 4) % mats.length;
    const m = mats[rot];
    for (let y = 0; y < m.length; y += 1) {
      for (let x = 0; x < m[y].length; x += 1) {
        if (!m[y][x]) continue;
        const nx = piece.x + x + dx;
        const ny = piece.y + y + dy;
        if (nx < 0 || nx >= COLS || ny >= TOTAL) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function ghostY() {
    let gy = 0;
    while (!collides(current, 0, gy + 1, 0)) gy += 1;
    return current.y + gy;
  }

  function lockPiece() {
    const m = matrix(current);
    for (let y = 0; y < m.length; y += 1) {
      for (let x = 0; x < m[y].length; x += 1) {
        if (!m[y][x]) continue;
        const by = current.y + y;
        const bx = current.x + x;
        if (by >= 0 && by < TOTAL) {
          board[by][bx] = current.type;
          lockFlash.push({ x: bx, y: by, life: 0.35 });
        }
      }
    }
    const full = [];
    for (let y = 0; y < TOTAL; y += 1) {
      if (board[y].every((c) => c)) full.push(y);
    }
    if (full.length) {
      clearRows = full;
      clearTimer = 0.38;
      mode = "clear";
      burstClear(full);
      els.clearFlash.hidden = false;
      setTimeout(() => {
        els.clearFlash.hidden = true;
      }, 320);
    } else {
      combo = 0;
      spawn();
    }
  }

  function finishClear() {
    const n = clearRows.length;
    // remove from bottom-ish by sorting desc
    clearRows
      .slice()
      .sort((a, b) => b - a)
      .forEach((y) => {
        board.splice(y, 1);
        board.unshift(Array(COLS).fill(null));
      });
    const lineScore = [0, 100, 300, 500, 800][n] || 800;
    combo += 1;
    const gain = lineScore * Math.max(1, combo);
    score += gain;
    linesTotal += n;
    stageLines += n;
    if (combo >= 2) {
      els.comboN.textContent = String(combo);
      els.combo.hidden = false;
      clearTimeout(els.combo._t);
      els.combo._t = setTimeout(() => {
        els.combo.hidden = true;
      }, 900);
    }
    updateHud();
    clearRows = [];
    mode = endless ? "endless" : "play";

    const stage = STAGES[stageIndex];
    if (!endless && stage && stageLines >= stage.goalLines) {
      mode = "win";
      els.winEyebrow.textContent =
        stageIndex >= STAGES.length - 1 ? "Garden complete" : "Stage clear";
      els.winTitle.textContent =
        stageIndex >= STAGES.length - 1 ? "Endless awaits" : "Bloom!";
      els.winBody.textContent = `+${gain} · ${stageLines} lines · ${world.name}`;
      els.nextBtn.textContent =
        stageIndex >= STAGES.length - 1 ? "Endless mode" : "Next stage";
      els.winCard.hidden = false;
      return;
    }
    spawn();
  }

  function burstClear(rows) {
    const colors = world.clear;
    for (const y of rows) {
      for (let x = 0; x < COLS; x += 1) {
        for (let i = 0; i < 3; i += 1) {
          const a = Math.random() * Math.PI * 2;
          const sp = 1 + Math.random() * 3;
          particles.push({
            x: BOARD_X + (x + 0.5) * CELL,
            y: BOARD_Y + (y - HIDDEN + 0.5) * CELL,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp - 1,
            life: 0.5 + Math.random() * 0.5,
            color: colors[i % colors.length],
            size: 2 + Math.random() * 2.5,
          });
        }
      }
    }
  }

  function move(dx) {
    if (!current || (mode !== "play" && mode !== "endless")) return;
    if (!collides(current, dx, 0, 0)) current.x += dx;
  }

  function rotate() {
    if (!current || (mode !== "play" && mode !== "endless")) return;
    const mats = SHAPES[current.type];
    if (mats.length === 1) return;
    if (!collides(current, 0, 0, 1)) {
      current.rot = (current.rot + 1) % mats.length;
      return;
    }
    // wall kicks
    for (const kick of [-1, 1, -2, 2]) {
      if (!collides(current, kick, 0, 1)) {
        current.x += kick;
        current.rot = (current.rot + 1) % mats.length;
        return;
      }
    }
  }

  function softDrop() {
    if (!current || (mode !== "play" && mode !== "endless")) return;
    if (!collides(current, 0, 1, 0)) {
      current.y += 1;
      score += 1;
      updateHud();
      dropAcc = 0;
    } else {
      lockPiece();
    }
  }

  function hardDrop() {
    if (!current || (mode !== "play" && mode !== "endless")) return;
    let d = 0;
    while (!collides(current, 0, 1, 0)) {
      current.y += 1;
      d += 1;
    }
    score += d * 2;
    updateHud();
    lockPiece();
  }

  function setWorld(id) {
    world = WORLDS[id] || WORLDS.moon;
    els.frame.dataset.world = world.id;
    els.worldName.textContent = world.name;
  }

  function updateHud() {
    els.score.textContent = String(score);
    els.lines.textContent = String(endless ? linesTotal : stageLines);
    if (endless) els.stageLabel.textContent = "Endless";
    else els.stageLabel.textContent = `Stage ${stageIndex + 1}`;
  }

  function startStage(i) {
    stageIndex = i;
    endless = false;
    const stage = STAGES[i];
    setWorld(stage.world);
    gravity = stage.gravity;
    board = createBoard();
    bag = [];
    nextType = null;
    stageLines = 0;
    combo = 0;
    dropAcc = 0;
    particles = [];
    mode = "play";
    spawn();
    els.overlay.hidden = true;
    els.winCard.hidden = true;
    els.hud.hidden = false;
    els.side.hidden = false;
    els.pads.hidden = false;
    els.stageKicker.textContent = `Stage ${i + 1} · ${world.name}`;
    els.stageTitle.textContent = stage.title;
    els.stageGoal.textContent = `Clear ${stage.goalLines} lines`;
    els.stageCard.hidden = false;
    setTimeout(() => {
      if (mode === "play") els.stageCard.hidden = true;
    }, 2600);
    updateHud();
  }

  function startEndless() {
    endless = true;
    setWorld("aurora");
    gravity = 340;
    board = createBoard();
    bag = [];
    nextType = null;
    combo = 0;
    dropAcc = 0;
    mode = "endless";
    spawn();
    els.winCard.hidden = true;
    els.stageCard.hidden = true;
    updateHud();
  }

  els.startBtn.addEventListener("click", () => {
    score = 0;
    linesTotal = 0;
    startStage(0);
  });

  els.nextBtn.addEventListener("click", () => {
    if (stageIndex >= STAGES.length - 1) {
      startEndless();
      return;
    }
    startStage(stageIndex + 1);
  });

  window.addEventListener("keydown", (e) => {
    if (mode !== "play" && mode !== "endless") return;
    if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " ", "x", "X", "z", "Z"].includes(e.key)) {
      e.preventDefault();
    }
    if (e.key === "ArrowLeft") move(-1);
    else if (e.key === "ArrowRight") move(1);
    else if (e.key === "ArrowDown") softDrop();
    else if (e.key === "ArrowUp" || e.key === "x" || e.key === "X") rotate();
    else if (e.key === " ") hardDrop();
    else if (e.key === "z" || e.key === "Z") rotate();
  });

  els.pads.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === "left") move(-1);
    else if (act === "right") move(1);
    else if (act === "rot") rotate();
    else if (act === "soft") softDrop();
    else if (act === "hard") hardDrop();
  });

  // Swipe on canvas
  let touchStart = null;
  canvas.addEventListener(
    "touchstart",
    (e) => {
      const t = e.changedTouches[0];
      touchStart = { x: t.clientX, y: t.clientY, t: performance.now() };
    },
    { passive: true },
  );
  canvas.addEventListener(
    "touchend",
    (e) => {
      if (!touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      const dt = performance.now() - touchStart.t;
      touchStart = null;
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 250) {
        rotate();
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 24) move(1);
        else if (dx < -24) move(-1);
      } else if (dy > 40) softDrop();
      else if (dy < -40) hardDrop();
    },
    { passive: true },
  );

  function drawNext() {
    nctx.clearRect(0, 0, 72, 72);
    if (!nextType) return;
    const m = SHAPES[nextType][0];
    const size = 14;
    const w = m[0].length * size;
    const h = m.length * size;
    const ox = (72 - w) / 2;
    const oy = (72 - h) / 2;
    for (let y = 0; y < m.length; y += 1) {
      for (let x = 0; x < m[y].length; x += 1) {
        if (!m[y][x]) continue;
        drawCellMini(nctx, ox + x * size, oy + y * size, size, nextType);
      }
    }
  }

  function drawCellMini(c, x, y, size, type) {
    const [a, b] = world.pieces[type];
    const g = c.createLinearGradient(x, y, x + size, y + size);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    c.fillStyle = g;
    roundRect(c, x + 1, y + 1, size - 2, size - 2, 3);
    c.fill();
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function drawCell(x, y, type, alpha = 1, ghost = false) {
    const px = BOARD_X + x * CELL;
    const py = BOARD_Y + (y - HIDDEN) * CELL;
    if (py + CELL < BOARD_Y || py > BOARD_Y + BOARD_H) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (ghost) {
      ctx.strokeStyle = world.pieces[type][0];
      ctx.lineWidth = 2;
      roundRect(ctx, px + 3, py + 3, CELL - 6, CELL - 6, 5);
      ctx.stroke();
      ctx.restore();
      return;
    }
    const [a, b] = world.pieces[type];
    const g = ctx.createLinearGradient(px, py, px + CELL, py + CELL);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    ctx.fillStyle = g;
    roundRect(ctx, px + 1.5, py + 1.5, CELL - 3, CELL - 3, 5);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    roundRect(ctx, px + 4, py + 4, CELL * 0.4, CELL * 0.22, 3);
    ctx.fill();
    ctx.restore();
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, world.sky[0]);
    g.addColorStop(0.55, world.sky[1]);
    g.addColorStop(1, world.sky[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // soft blobs
    const blobs = [
      { x: 80, y: 120, r: 90, c: world.clear[0] },
      { x: 300, y: 200, r: 110, c: world.clear[1] },
      { x: 160, y: 480, r: 120, c: world.clear[2] },
    ];
    for (const b of blobs) {
      const ox = Math.sin(time * 0.0008 + b.x) * 10;
      const rg = ctx.createRadialGradient(b.x + ox, b.y, 8, b.x + ox, b.y, b.r);
      rg.addColorStop(0, hexAlpha(b.c, 0.18));
      rg.addColorStop(1, "transparent");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(b.x + ox, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of pollen) {
      p.y -= p.s * 0.25;
      p.x += Math.sin(time * 0.001 + p.y) * 0.12;
      if (p.y < -4) {
        p.y = H + 4;
        p.x = Math.random() * W;
      }
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${p.a})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function hexAlpha(hex, a) {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r},${g},${b},${a})`;
  }

  function drawBoard() {
    // frame
    ctx.fillStyle = world.board;
    roundRect(ctx, BOARD_X - 8, BOARD_Y - 8, BOARD_W + 16, BOARD_H + 16, 16);
    ctx.fill();
    ctx.strokeStyle = hexAlpha(world.clear[0], 0.35);
    ctx.lineWidth = 2;
    roundRect(ctx, BOARD_X - 8, BOARD_Y - 8, BOARD_W + 16, BOARD_H + 16, 16);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);
    ctx.clip();

    // grid
    ctx.strokeStyle = world.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x += 1) {
      ctx.beginPath();
      ctx.moveTo(BOARD_X + x * CELL, BOARD_Y);
      ctx.lineTo(BOARD_X + x * CELL, BOARD_Y + BOARD_H);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y += 1) {
      ctx.beginPath();
      ctx.moveTo(BOARD_X, BOARD_Y + y * CELL);
      ctx.lineTo(BOARD_X + BOARD_W, BOARD_Y + y * CELL);
      ctx.stroke();
    }

    for (let y = HIDDEN; y < TOTAL; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const t = board[y][x];
        if (!t) continue;
        const flashing = clearRows.includes(y);
        drawCell(x, y, t, flashing ? 0.35 + Math.sin(time * 0.03) * 0.25 : 1);
      }
    }

    if (current && (mode === "play" || mode === "endless" || mode === "clear")) {
      const gy = ghostY();
      const m = matrix(current);
      for (let y = 0; y < m.length; y += 1) {
        for (let x = 0; x < m[y].length; x += 1) {
          if (!m[y][x]) continue;
          drawCell(current.x + x, gy + y, current.type, 0.9, true);
        }
      }
      for (let y = 0; y < m.length; y += 1) {
        for (let x = 0; x < m[y].length; x += 1) {
          if (!m[y][x]) continue;
          drawCell(current.x + x, current.y + y, current.type);
        }
      }
    }

    for (const f of lockFlash) {
      const px = BOARD_X + f.x * CELL;
      const py = BOARD_Y + (f.y - HIDDEN) * CELL;
      ctx.fillStyle = `rgba(255,255,255,${f.life})`;
      roundRect(ctx, px + 2, py + 2, CELL - 4, CELL - 4, 4);
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
  }

  function tick(dt) {
    time += dt;
    particles = particles.filter((p) => {
      p.life -= dt / 900;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      return p.life > 0;
    });
    lockFlash = lockFlash.filter((f) => {
      f.life -= dt / 900;
      return f.life > 0;
    });

    if (mode === "clear") {
      clearTimer -= dt / 1000;
      if (clearTimer <= 0) finishClear();
      return;
    }

    if ((mode === "play" || mode === "endless") && current) {
      if (endless) {
        gravity = Math.max(140, 340 - Math.floor(linesTotal / 10) * 18);
      }
      dropAcc += dt;
      if (dropAcc >= gravity) {
        dropAcc = 0;
        if (!collides(current, 0, 1, 0)) current.y += 1;
        else lockPiece();
      }
    }
  }

  function render() {
    drawBackground();
    if (mode !== "title") {
      drawBoard();
      drawParticles();
    } else {
      // idle floating crystals
      const types = ["T", "I", "L"];
      types.forEach((type, i) => {
        const x = 90 + i * 70;
        const y = 280 + Math.sin(time * 0.002 + i) * 18;
        const m = SHAPES[type][0];
        const size = 18;
        for (let yy = 0; yy < m.length; yy += 1) {
          for (let xx = 0; xx < m[yy].length; xx += 1) {
            if (!m[yy][xx]) continue;
            const [a, b] = world.pieces[type];
            const px = x + xx * size;
            const py = y + yy * size;
            const g = ctx.createLinearGradient(px, py, px + size, py + size);
            g.addColorStop(0, a);
            g.addColorStop(1, b);
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = g;
            roundRect(ctx, px, py, size - 2, size - 2, 4);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      });
    }
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(40, now - last);
    last = now;
    tick(dt);
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
