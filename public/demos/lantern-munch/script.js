(() => {
  "use strict";

  // Maze legend: # wall · . dot · o orb · = gate ·   empty · P player · E ember · M mist · B pebble · W wisp · H home
  const LEVELS = [
    {
      id: "firefly",
      name: "Firefly Courtyard",
      goal: "Collect every spark. One gentle Ember watches.",
      theme: "firefly",
      sky: ["#1e1140", "#2a1858", "#12081f"],
      wall: ["#7c3aed", "#a78bfa"],
      floor: "rgba(30, 16, 56, 0.85)",
      playerSpeed: 2.35,
      ghostSpeed: 1.55,
      frightMs: 6500,
      map: [
        "###################",
        "#........#........#",
        "#o##.###.#.###.##o#",
        "#.................#",
        "#.##.#.#####.#.##.#",
        "#....#...P...#....#",
        "####.### # ###.####",
        "   #.#   H   #.#   ",
        "####.# ##=## #.####",
        "#........E........#",
        "#.##.#########.##.#",
        "#o...............o#",
        "###################",
      ],
    },
    {
      id: "crystal",
      name: "Crystal Halls",
      goal: "Long halls — Ember chases, Mist aims ahead.",
      theme: "crystal",
      sky: ["#042f2e", "#0f4c4a", "#021c1b"],
      wall: ["#0e7490", "#67e8f9"],
      floor: "rgba(4, 32, 34, 0.88)",
      playerSpeed: 2.4,
      ghostSpeed: 1.65,
      frightMs: 6200,
      map: [
        "###################",
        "#o....#.....#....o#",
        "#.###.#.###.#.###.#",
        "#.................#",
        "###.#.#####.#.#####",
        "#...#...P...#.....#",
        "#.#.### # ###.#.#.#",
        "#.#.#   H   #.#.#.#",
        "#.#.# ##=## #.#.#.#",
        "#.......E.M.......#",
        "#.###.#######.###.#",
        "#o...............o#",
        "###################",
      ],
    },
    {
      id: "mushroom",
      name: "Mushroom Bazaar",
      goal: "Busy junctions — meet hesitant Pebble.",
      theme: "mushroom",
      sky: ["#3b1f0e", "#5c3317", "#1c0e06"],
      wall: ["#b45309", "#fbbf24"],
      floor: "rgba(40, 22, 10, 0.88)",
      playerSpeed: 2.45,
      ghostSpeed: 1.7,
      frightMs: 6000,
      map: [
        "###################",
        "#........#........#",
        "#o##.#.#.#.#.#.##o#",
        "#....#.#...#.#....#",
        "####.#.#####.#.####",
        "#......P.B........#",
        "#.##.### # ###.##.#",
        "#.#..#   H   #..#.#",
        "#.#..# ##=## #..#.#",
        "#.......E.M.......#",
        "#.#.#.#######.#.#.#",
        "#o...............o#",
        "###################",
      ],
    },
    {
      id: "moonwell",
      name: "Moonwell Ruins",
      goal: "Denser ruins — three spirits roam.",
      theme: "moonwell",
      sky: ["#1e1b4b", "#312e81", "#0f0a24"],
      wall: ["#6366f1", "#c4b5fd"],
      floor: "rgba(20, 16, 48, 0.88)",
      playerSpeed: 2.5,
      ghostSpeed: 1.78,
      frightMs: 5800,
      map: [
        "###################",
        "#o..#.........#..o#",
        "#.##.#.#####.#.##.#",
        "#....#...#...#....#",
        "#.####.#.#.#.####.#",
        "#......P...B......#",
        "###.##.# # #.##.###",
        "  #.#  # H #  #.#  ",
        "###.# ##=## #.#.###",
        "#.......E.M.......#",
        "#.##.#########.##.#",
        "#o....#.....#....o#",
        "###################",
      ],
    },
    {
      id: "aurora",
      name: "Aurora Garden",
      goal: "All four spirits — keep the path clear.",
      theme: "aurora",
      sky: ["#064e3b", "#065f46", "#022c22"],
      wall: ["#059669", "#6ee7b7"],
      floor: "rgba(6, 40, 30, 0.88)",
      playerSpeed: 2.55,
      ghostSpeed: 1.85,
      frightMs: 5600,
      map: [
        "###################",
        "#........#........#",
        "#o##.###.#.###.##o#",
        "#....#.......#....#",
        "#.##.#.#####.#.##.#",
        "#..#...P.W...#..#.#",
        "##.#.### # ###.#.##",
        " #.#.#   H   #.#.# ",
        "##.#.# ##=## #.#.##",
        "#.......E.M.B.....#",
        "#.###.#######.###.#",
        "#o...............o#",
        "###################",
      ],
    },
    {
      id: "castle",
      name: "Castle of Lanterns",
      goal: "Finale — clear the castle maze!",
      theme: "castle",
      sky: ["#4a044e", "#701a75", "#1f0520"],
      wall: ["#db2777", "#f9a8d4"],
      floor: "rgba(48, 10, 40, 0.88)",
      playerSpeed: 2.6,
      ghostSpeed: 1.92,
      frightMs: 5400,
      map: [
        "###################",
        "#o....#.....#....o#",
        "#.###.#.###.#.###.#",
        "#.#...........#.#.#",
        "#.#.###.###.###.#.#",
        "#...#...P.W...#...#",
        "###.#.## # ##.#.###",
        "  #.#.#  H  #.#.#  ",
        "###.#.##=## #.#.###",
        "#.......E.M.B.....#",
        "#.#.#.#######.#.#.#",
        "#o...............o#",
        "###################",
      ],
    },
  ];

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const OPP = { up: "down", down: "up", left: "right", right: "left" };

  const GHOST_META = {
    ember: { face: "🔥", color: "#fb7185", fright: "#93c5fd" },
    mist: { face: "👻", color: "#c4b5fd", fright: "#93c5fd" },
    pebble: { face: "🪨", color: "#86efac", fright: "#93c5fd" },
    wisp: { face: "💨", color: "#67e8f9", fright: "#93c5fd" },
  };

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const els = {
    frame: document.getElementById("frame"),
    hud: document.getElementById("hud"),
    lives: document.getElementById("lives"),
    levelLabel: document.getElementById("levelLabel"),
    score: document.getElementById("score"),
    dotsLeft: document.getElementById("dotsLeft"),
    combo: document.getElementById("combo"),
    comboN: document.getElementById("comboN"),
    pads: document.getElementById("pads"),
    overlay: document.getElementById("overlay"),
    startBtn: document.getElementById("startBtn"),
    levelCard: document.getElementById("levelCard"),
    levelKicker: document.getElementById("levelKicker"),
    levelTitle: document.getElementById("levelTitle"),
    levelGoal: document.getElementById("levelGoal"),
    winCard: document.getElementById("winCard"),
    winEyebrow: document.getElementById("winEyebrow"),
    winTitle: document.getElementById("winTitle"),
    winBody: document.getElementById("winBody"),
    nextBtn: document.getElementById("nextBtn"),
  };

  let mode = "title";
  let levelIndex = 0;
  let level = LEVELS[0];
  let cols = 0;
  let rows = 0;
  let cell = 0;
  let ox = 0;
  let oy = 0;
  let grid = [];
  let player = null;
  let ghosts = [];
  let home = { x: 9, y: 7 };
  let score = 0;
  let lives = 3;
  let dotsLeft = 0;
  let frightTimer = 0;
  let eatStreak = 0;
  let wantDir = null;
  let playerReady = false;
  let particles = [];
  let trail = [];
  let fairyLights = [];
  let time = 0;
  let invuln = 0;
  let transition = 0;

  function parseLevel(def) {
    const map = def.map;
    rows = map.length;
    cols = map[0].length;
    cell = Math.floor(Math.min((W - 24) / cols, (H - 160) / rows));
    ox = Math.floor((W - cols * cell) / 2);
    oy = 58;
    grid = [];
    ghosts = [];
    dotsLeft = 0;
    let px = 1;
    let py = 1;
    home = { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };

    for (let y = 0; y < rows; y += 1) {
      const row = [];
      for (let x = 0; x < cols; x += 1) {
        const ch = map[y][x] || "#";
        let tile = "empty";
        if (ch === "#") tile = "wall";
        else if (ch === ".") {
          tile = "dot";
          dotsLeft += 1;
        } else if (ch === "o") {
          tile = "orb";
          dotsLeft += 1;
        } else if (ch === "=") tile = "gate";
        else if (ch === "H") {
          tile = "home";
          home = { x, y };
        } else if (ch === "P") {
          tile = "empty";
          px = x;
          py = y;
        } else if ("EMBW".includes(ch)) {
          tile = "empty";
          const type =
            ch === "E"
              ? "ember"
              : ch === "M"
                ? "mist"
                : ch === "B"
                  ? "pebble"
                  : "wisp";
          ghosts.push(makeGhost(type, x, y));
        }
        row.push(tile);
      }
      grid.push(row);
    }

    player = {
      x: px + 0.5,
      y: py + 0.5,
      dir: "right",
      mouth: 0,
    };
    wantDir = null;
    playerReady = false;
    fairyLights = [];
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (grid[y][x] === "wall" && Math.random() < 0.12) {
          fairyLights.push({
            x,
            y,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
    }
  }

  function makeGhost(type, x, y) {
    return {
      type,
      x: x + 0.5,
      y: y + 0.5,
      dir: "left",
      state: "scatter",
      scatterTimer: 2 + Math.random() * 3,
      hesitate: 0,
      home: { x: x + 0.5, y: y + 0.5 },
    };
  }

  function walkable(x, y, forGhost) {
    if (y < 0 || y >= rows || x < 0 || x >= cols) return false;
    const t = grid[y][x];
    if (t === "wall") return false;
    if (t === "gate") return Boolean(forGhost);
    return true;
  }

  function tileCenter(tx, ty) {
    return { x: tx + 0.5, y: ty + 0.5 };
  }

  function atCenter(ent, eps = 0.12) {
    const cx = Math.floor(ent.x) + 0.5;
    const cy = Math.floor(ent.y) + 0.5;
    return Math.abs(ent.x - cx) < eps && Math.abs(ent.y - cy) < eps;
  }

  function snapCenter(ent) {
    ent.x = Math.floor(ent.x) + 0.5;
    ent.y = Math.floor(ent.y) + 0.5;
  }

  function dirsFrom(tx, ty, forGhost, exclude) {
    const out = [];
    for (const [name, d] of Object.entries(DIRS)) {
      if (exclude && name === exclude) continue;
      if (walkable(tx + d.x, ty + d.y, forGhost)) out.push(name);
    }
    return out;
  }

  function moveEntity(ent, speed, forGhost, chosenDir) {
    if (atCenter(ent)) {
      snapCenter(ent);
      const tx = Math.floor(ent.x);
      const ty = Math.floor(ent.y);
      const opts = dirsFrom(tx, ty, forGhost, OPP[ent.dir]);
      if (chosenDir && opts.includes(chosenDir)) ent.dir = chosenDir;
      else if (!opts.includes(ent.dir)) {
        if (opts.length) ent.dir = opts[Math.floor(Math.random() * opts.length)];
      }
    }
    const d = DIRS[ent.dir];
    const nextX = ent.x + d.x * speed * 0.055;
    const nextY = ent.y + d.y * speed * 0.055;
    const nx = Math.floor(nextX + d.x * 0.45);
    const ny = Math.floor(nextY + d.y * 0.45);
    if (walkable(nx, ny, forGhost) || (Math.floor(ent.x) === nx && Math.floor(ent.y) === ny)) {
      ent.x = nextX;
      ent.y = nextY;
    } else {
      snapCenter(ent);
    }
    // wrap tunnels (spaces on edges)
    if (ent.x < 0) ent.x = cols - 0.01;
    if (ent.x >= cols) ent.x = 0.01;
  }

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function pickGhostDir(g) {
    if (!atCenter(g)) return g.dir;
    const tx = Math.floor(g.x);
    const ty = Math.floor(g.y);
    let opts = dirsFrom(tx, ty, true, OPP[g.dir]);
    if (!opts.length) opts = dirsFrom(tx, ty, true, null);
    if (!opts.length) return g.dir;

    if (g.hesitate > 0) {
      g.hesitate -= 1;
      return opts[Math.floor(Math.random() * opts.length)];
    }

    // chance to hesitate at junctions
    if (opts.length >= 3 && Math.random() < 0.22) {
      g.hesitate = 8;
      return opts[Math.floor(Math.random() * opts.length)];
    }

    let target = { x: player.x, y: player.y };
    if (frightTimer > 0) {
      // flee
      target = {
        x: g.x + (g.x - player.x),
        y: g.y + (g.y - player.y),
      };
    } else if (g.state === "scatter" || g.type === "wisp" && g.scatterTimer > 0) {
      target = g.home;
    } else if (g.type === "mist") {
      const pd = DIRS[player.dir] || DIRS.left;
      target = { x: player.x + pd.x * 2, y: player.y + pd.y * 2 };
    } else if (g.type === "pebble") {
      if (dist(g, player) < 3.5) {
        target = {
          x: g.x + (g.x - player.x) * 2,
          y: g.y + (g.y - player.y) * 2,
        };
      } else if (Math.random() < 0.35) {
        return opts[Math.floor(Math.random() * opts.length)];
      }
    } else if (g.type === "wisp") {
      if (Math.random() < 0.4) return opts[Math.floor(Math.random() * opts.length)];
    }

    let best = opts[0];
    let bestD = Infinity;
    for (const name of opts) {
      const d = DIRS[name];
      const nx = tx + 0.5 + d.x;
      const ny = ty + 0.5 + d.y;
      const dd = Math.hypot(nx - target.x, ny - target.y);
      if (dd < bestD) {
        bestD = dd;
        best = name;
      }
    }
    return best;
  }

  function burst(x, y, color, n = 10) {
    for (let i = 0; i < n; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.5 + Math.random() * 2;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.5 + Math.random() * 0.5,
        color,
        size: 1.5 + Math.random() * 2,
      });
    }
  }

  function updateHud() {
    els.score.textContent = String(score);
    els.dotsLeft.textContent = String(dotsLeft);
    els.levelLabel.textContent = `${levelIndex + 1} / ${LEVELS.length}`;
    els.lives.textContent = "🏮".repeat(Math.max(0, lives));
  }

  function startLevel(i) {
    levelIndex = i;
    level = LEVELS[i];
    els.frame.dataset.theme = level.theme;
    parseLevel(level);
    frightTimer = 0;
    eatStreak = 0;
    invuln = 1.2;
    particles = [];
    trail = [];
    mode = "play";
    transition = 0.35;
    els.overlay.hidden = true;
    els.winCard.hidden = true;
    els.hud.hidden = false;
    els.lives.hidden = false;
    els.pads.hidden = false;
    els.levelKicker.textContent = `Level ${i + 1}`;
    els.levelTitle.textContent = level.name;
    els.levelGoal.textContent = level.goal;
    els.levelCard.hidden = false;
    setTimeout(() => {
      if (mode === "play") els.levelCard.hidden = true;
    }, 2800);
    updateHud();
  }

  function loseLife() {
    lives -= 1;
    updateHud();
    burst(player.x * cell + ox, player.y * cell + oy, "#fde68a", 18);
    if (lives <= 0) {
      mode = "title";
      els.overlay.hidden = false;
      els.hud.hidden = true;
      els.lives.hidden = true;
      els.pads.hidden = true;
      els.startBtn.textContent = "Try again";
      return;
    }
    // reset positions
    parseLevel(level);
    frightTimer = 0;
    invuln = 2;
    updateHud();
  }

  function winLevel() {
    mode = "win";
    els.winEyebrow.textContent =
      levelIndex >= LEVELS.length - 1 ? "Castle clear" : "Maze clear";
    els.winTitle.textContent =
      levelIndex >= LEVELS.length - 1 ? "All lanterns lit" : "Path bright!";
    els.winBody.textContent = `${level.name} · score ${score}`;
    els.nextBtn.textContent =
      levelIndex >= LEVELS.length - 1 ? "Play again" : "Next maze";
    els.winCard.hidden = false;
    els.levelCard.hidden = true;
  }

  els.startBtn.addEventListener("click", () => {
    score = 0;
    lives = 3;
    startLevel(0);
  });

  els.nextBtn.addEventListener("click", () => {
    if (levelIndex >= LEVELS.length - 1) {
      els.winCard.hidden = true;
      els.overlay.hidden = false;
      els.hud.hidden = true;
      els.lives.hidden = true;
      els.pads.hidden = true;
      mode = "title";
      els.startBtn.textContent = "Light the path";
      return;
    }
    startLevel(levelIndex + 1);
  });

  function setWant(dir) {
    wantDir = dir;
    playerReady = true;
  }

  window.addEventListener("keydown", (e) => {
    const map = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      W: "up",
      s: "down",
      S: "down",
      a: "left",
      A: "left",
      d: "right",
      D: "right",
    };
    if (map[e.key]) {
      e.preventDefault();
      setWant(map[e.key]);
    }
  });

  els.pads.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-dir]");
    if (btn) setWant(btn.dataset.dir);
  });

  // swipe
  let touch0 = null;
  canvas.addEventListener(
    "touchstart",
    (e) => {
      const t = e.changedTouches[0];
      touch0 = { x: t.clientX, y: t.clientY };
    },
    { passive: true },
  );
  canvas.addEventListener(
    "touchend",
    (e) => {
      if (!touch0) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touch0.x;
      const dy = t.clientY - touch0.y;
      touch0 = null;
      if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
      if (Math.abs(dx) > Math.abs(dy)) setWant(dx > 0 ? "right" : "left");
      else setWant(dy > 0 ? "down" : "up");
    },
    { passive: true },
  );

  function tick(dt) {
    time += dt;
    if (transition > 0) transition -= dt / 1000;
    if (invuln > 0) invuln -= dt / 1000;
    particles = particles.filter((p) => {
      p.life -= dt / 900;
      p.x += p.vx;
      p.y += p.vy;
      return p.life > 0;
    });

    if (mode !== "play") return;

    if (frightTimer > 0) {
      frightTimer -= dt;
      if (frightTimer <= 0) {
        frightTimer = 0;
        eatStreak = 0;
      }
    }

    // player — wait for first input so the lantern doesn't auto-cruise
    if (playerReady && wantDir) {
      moveEntity(player, level.playerSpeed, false, wantDir);
      player.mouth = (Math.sin(time * 0.02) + 1) * 0.5;
      trail.unshift({ x: player.x, y: player.y, a: 1 });
      if (trail.length > 10) trail.pop();
      for (const t of trail) t.a *= 0.85;
    } else {
      player.mouth = 0.15;
      trail = [];
    }

    // collect
    const px = Math.floor(player.x);
    const py = Math.floor(player.y);
    if (py >= 0 && py < rows && px >= 0 && px < cols) {
      const t = grid[py][px];
      if (t === "dot") {
        grid[py][px] = "empty";
        dotsLeft -= 1;
        score += 10;
        burst(ox + (px + 0.5) * cell, oy + (py + 0.5) * cell, "#fde68a", 6);
        updateHud();
      } else if (t === "orb") {
        grid[py][px] = "empty";
        dotsLeft -= 1;
        score += 50;
        frightTimer = level.frightMs;
        eatStreak = 0;
        for (const g of ghosts) {
          if (g.state !== "eaten") g.dir = OPP[g.dir] || g.dir;
        }
        burst(ox + (px + 0.5) * cell, oy + (py + 0.5) * cell, "#93c5fd", 16);
        updateHud();
      }
    }

    if (dotsLeft <= 0) {
      winLevel();
      return;
    }

    // ghosts
    for (const g of ghosts) {
      if (g.state === "eaten") {
        // return home quickly
        const dx = home.x + 0.5 - g.x;
        const dy = home.y + 0.5 - g.y;
        const d = Math.hypot(dx, dy) || 1;
        g.x += (dx / d) * 0.18;
        g.y += (dy / d) * 0.18;
        if (d < 0.3) {
          g.state = "scatter";
          g.scatterTimer = 2;
          g.x = home.x + 0.5;
          g.y = home.y + 0.5;
        }
        continue;
      }

      g.scatterTimer -= dt / 1000;
      if (g.scatterTimer <= 0) {
        g.state = g.state === "scatter" ? "chase" : "scatter";
        g.scatterTimer = g.state === "scatter" ? 3 + Math.random() * 2 : 5 + Math.random() * 3;
      }

      const speed =
        frightTimer > 0 ? level.ghostSpeed * 0.65 : level.ghostSpeed;
      const dir = pickGhostDir(g);
      moveEntity(g, speed, true, dir);

      if (invuln > 0) continue;
      if (dist(g, player) < 0.55) {
        if (frightTimer > 0) {
          g.state = "eaten";
          eatStreak += 1;
          const gain = 200 * eatStreak;
          score += gain;
          els.comboN.textContent = String(eatStreak);
          els.combo.hidden = false;
          clearTimeout(els.combo._t);
          els.combo._t = setTimeout(() => {
            els.combo.hidden = true;
          }, 800);
          burst(ox + g.x * cell, oy + g.y * cell, "#93c5fd", 14);
          updateHud();
        } else {
          loseLife();
          return;
        }
      }
    }
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

  function drawBg() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, level.sky[0]);
    g.addColorStop(0.55, level.sky[1]);
    g.addColorStop(1, level.sky[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 18; i += 1) {
      const x = (i * 47 + time * 0.02) % W;
      const y = 40 + (i * 37) % 200;
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${0.15 + Math.sin(time * 0.01 + i) * 0.1})`;
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMaze() {
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const t = grid[y][x];
        const px = ox + x * cell;
        const py = oy + y * cell;
        if (t === "wall") {
          const grad = ctx.createLinearGradient(px, py, px + cell, py + cell);
          grad.addColorStop(0, level.wall[0]);
          grad.addColorStop(1, level.wall[1]);
          ctx.fillStyle = grad;
          roundRect(ctx, px + 1, py + 1, cell - 2, cell - 2, 5);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.18)";
          roundRect(ctx, px + 3, py + 3, cell * 0.35, cell * 0.2, 2);
          ctx.fill();
        } else if (t !== "gate") {
          ctx.fillStyle = level.floor;
          ctx.fillRect(px, py, cell, cell);
        } else {
          ctx.fillStyle = "rgba(253, 230, 138, 0.35)";
          ctx.fillRect(px + 2, py + cell * 0.35, cell - 4, cell * 0.3);
        }

        if (t === "dot") {
          ctx.beginPath();
          ctx.fillStyle = "#fde68a";
          ctx.shadowColor = "#fbbf24";
          ctx.shadowBlur = 6;
          ctx.arc(px + cell / 2, py + cell / 2, Math.max(2, cell * 0.12), 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (t === "orb") {
          const pulse = 1 + Math.sin(time * 0.01) * 0.15;
          ctx.beginPath();
          ctx.fillStyle = "#93c5fd";
          ctx.shadowColor = "#60a5fa";
          ctx.shadowBlur = 12;
          ctx.arc(
            px + cell / 2,
            py + cell / 2,
            cell * 0.28 * pulse,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }

    for (const f of fairyLights) {
      const px = ox + (f.x + 0.5) * cell;
      const py = oy + (f.y + 0.5) * cell;
      const a = 0.35 + Math.sin(time * 0.008 + f.phase) * 0.25;
      ctx.beginPath();
      ctx.fillStyle = `rgba(253, 230, 138, ${a})`;
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlayer() {
    for (const t of trail) {
      ctx.globalAlpha = t.a * 0.35;
      ctx.beginPath();
      ctx.fillStyle = "#fde68a";
      ctx.arc(ox + t.x * cell, oy + t.y * cell, cell * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = invuln > 0 && Math.floor(time / 80) % 2 === 0 ? 0.4 : 1;
    const px = ox + player.x * cell;
    const py = oy + player.y * cell;
    const r = cell * 0.38;
    const glow = ctx.createRadialGradient(px, py, 2, px, py, r * 2.2);
    glow.addColorStop(0, "rgba(253, 230, 138, 0.7)");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(px, py, r * 2.2, 0, Math.PI * 2);
    ctx.fill();

    const ang =
      player.dir === "right"
        ? 0
        : player.dir === "down"
          ? Math.PI / 2
          : player.dir === "left"
            ? Math.PI
            : -Math.PI / 2;
    const mouth = 0.35 + player.mouth * 0.35;
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, r, ang + mouth, ang - mouth + Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(px + Math.cos(ang - 0.8) * r * 0.35, py + Math.sin(ang - 0.8) * r * 0.35, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawGhosts() {
    for (const g of ghosts) {
      const px = ox + g.x * cell;
      const py = oy + g.y * cell;
      const meta = GHOST_META[g.type];
      const frightened = frightTimer > 0 && g.state !== "eaten";
      const color = g.state === "eaten" ? "#e2e8f0" : frightened ? meta.fright : meta.color;
      const blink = frightened && frightTimer < 1800 && Math.floor(time / 100) % 2 === 0;

      ctx.save();
      ctx.translate(px, py);
      ctx.fillStyle = blink ? "#fff" : color;
      ctx.beginPath();
      ctx.arc(0, -cell * 0.08, cell * 0.32, Math.PI, 0);
      ctx.lineTo(cell * 0.32, cell * 0.28);
      ctx.lineTo(cell * 0.16, cell * 0.18);
      ctx.lineTo(0, cell * 0.28);
      ctx.lineTo(-cell * 0.16, cell * 0.18);
      ctx.lineTo(-cell * 0.32, cell * 0.28);
      ctx.closePath();
      ctx.fill();
      if (g.state !== "eaten") {
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(-cell * 0.1, -cell * 0.1, cell * 0.07, 0, Math.PI * 2);
        ctx.arc(cell * 0.1, -cell * 0.1, cell * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
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

  function render() {
    drawBg();
    if (mode === "title") {
      // idle lantern
      const px = W / 2;
      const py = H * 0.42 + Math.sin(time * 0.003) * 8;
      const glow = ctx.createRadialGradient(px, py, 4, px, py, 60);
      glow.addColorStop(0, "rgba(253, 230, 138, 0.55)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px, py, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(px, py, 22, 0.4, Math.PI * 2 - 0.4);
      ctx.lineTo(px, py);
      ctx.fill();
      return;
    }

    if (transition > 0) {
      ctx.globalAlpha = 1 - transition;
    }
    drawMaze();
    drawPlayer();
    drawGhosts();
    drawParticles();
    ctx.globalAlpha = 1;
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
