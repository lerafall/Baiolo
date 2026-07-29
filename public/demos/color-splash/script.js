(() => {
  const COLS = 6;
  const ROWS = 8;
  const WIN_AT = 92;

  const moods = [
    {
      name: "Sunset",
      colors: ["#ff6b4a", "#fb7185", "#fbbf24", "#fdba74"],
      // Soft diagonal warmth
      pattern: (r, c) => {
        const t = (r + c) / (ROWS + COLS - 2);
        if (t < 0.28) return 3;
        if (t < 0.5) return 2;
        if (t < 0.72) return 0;
        return 1;
      },
    },
    {
      name: "Ocean",
      colors: ["#2dd4bf", "#22d3ee", "#38bdf8", "#a5f3fc"],
      pattern: (r, c) => {
        const wave = Math.sin((c + r * 0.4) * 0.9);
        if (wave > 0.45) return 0;
        if (wave > 0) return 1;
        if (wave > -0.45) return 2;
        return 3;
      },
    },
    {
      name: "Candy",
      colors: ["#fb7185", "#c084fc", "#f9a8d4", "#fde68a"],
      pattern: (r, c) => (r + c) % 4,
    },
    {
      name: "Meadow",
      colors: ["#4ade80", "#a3e635", "#86efac", "#fde047"],
      pattern: (r, c) => {
        if (r < 2) return 3;
        if ((r + c) % 3 === 0) return 1;
        if (c % 2 === 0) return 0;
        return 2;
      },
    },
  ];

  const boardEl = document.getElementById("board");
  const targetEl = document.getElementById("target");
  const swatchesEl = document.getElementById("swatches");
  const moodNameEl = document.getElementById("moodName");
  const matchEl = document.getElementById("match");
  const winEl = document.getElementById("win");
  const clearBtn = document.getElementById("clearBtn");
  const nextBtn = document.getElementById("nextBtn");
  const againBtn = document.getElementById("againBtn");

  let moodIndex = 0;
  let selected = 0;
  let cells = [];
  let target = [];
  let tiles = [];
  let won = false;

  function mood() {
    return moods[moodIndex % moods.length];
  }

  function idx(r, c) {
    return r * COLS + c;
  }

  function buildTarget() {
    const m = mood();
    target = [];
    targetEl.innerHTML = "";
    // Compact 6x4 preview of the mood pattern
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const colorIndex = m.pattern(r * 2, c);
        target.push(colorIndex);
        const el = document.createElement("div");
        el.className = "cell";
        el.style.background = m.colors[colorIndex];
        targetEl.appendChild(el);
      }
    }
  }

  function buildPalette() {
    const m = mood();
    swatchesEl.innerHTML = "";
    m.colors.forEach((hex, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `swatch${i === selected ? " active" : ""}`;
      btn.style.background = hex;
      btn.setAttribute("aria-label", `Color ${i + 1}`);
      btn.addEventListener("click", () => {
        selected = i;
        buildPalette();
      });
      swatchesEl.appendChild(btn);
    });
  }

  function buildBoard() {
    boardEl.innerHTML = "";
    cells = Array(ROWS * COLS).fill(-1);
    tiles = [];
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "tile";
        button.setAttribute("role", "gridcell");
        button.setAttribute("aria-label", `Tile ${r + 1}, ${c + 1}`);
        const i = idx(r, c);
        button.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          splash(r, c);
        });
        boardEl.appendChild(button);
        tiles.push(button);
      }
    }
    paintAll();
    updateMatch();
  }

  function paintAll() {
    const m = mood();
    tiles.forEach((tile, i) => {
      const colorIndex = cells[i];
      tile.style.background =
        colorIndex < 0 ? "#e5e7eb" : m.colors[colorIndex];
    });
  }

  function flash(i) {
    const tile = tiles[i];
    if (!tile) return;
    tile.classList.remove("flash");
    // restart animation
    void tile.offsetWidth;
    tile.classList.add("flash");
  }

  function splash(row, col) {
    if (won) return;
    const m = mood();
    const queue = [{ r: row, c: col, d: 0 }];
    const seen = new Set([idx(row, col)]);

    while (queue.length) {
      const { r, c, d } = queue.shift();
      if (d > 2) continue;
      const i = idx(r, c);
      const delay = d * 45;

      window.setTimeout(() => {
        cells[i] = selected;
        tiles[i].style.background = m.colors[selected];
        flash(i);
        updateMatch();
      }, delay);

      const neighbors = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ];
      for (const [nr, nc] of neighbors) {
        if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS) continue;
        const ni = idx(nr, nc);
        if (seen.has(ni)) continue;
        seen.add(ni);
        queue.push({ r: nr, c: nc, d: d + 1 });
      }
    }
  }

  function targetColorAt(r, c) {
    // Map full board onto the compact mood pattern.
    return mood().pattern(r, c);
  }

  function updateMatch() {
    let ok = 0;
    let total = ROWS * COLS;
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (cells[idx(r, c)] === targetColorAt(r, c)) ok += 1;
      }
    }
    const pct = Math.round((ok / total) * 100);
    matchEl.textContent = String(pct);
    if (!won && pct >= WIN_AT) {
      won = true;
      winEl.hidden = false;
    }
  }

  function loadMood(next = false) {
    if (next) moodIndex = (moodIndex + 1) % moods.length;
    won = false;
    winEl.hidden = true;
    selected = 0;
    moodNameEl.textContent = mood().name;
    buildTarget();
    buildPalette();
    buildBoard();
  }

  clearBtn.addEventListener("click", () => {
    won = false;
    winEl.hidden = true;
    cells = Array(ROWS * COLS).fill(-1);
    paintAll();
    updateMatch();
  });

  nextBtn.addEventListener("click", () => loadMood(true));
  againBtn.addEventListener("click", () => loadMood(true));

  loadMood(false);
})();
