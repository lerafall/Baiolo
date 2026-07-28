(() => {
  const wheel = document.getElementById("wheel");
  const trayPetal = document.getElementById("trayPetal");
  const levelEl = document.getElementById("level");
  const leavesEl = document.getElementById("leaves");
  const dotsEl = document.getElementById("dots");
  const hintCount = document.getElementById("hintCount");
  const fall = document.getElementById("fall");

  const COLORS = ["pink", "purple", "mint"];
  const SIZE = 8;

  let level = 1;
  let leaves = 125;
  let hints = 3;
  let slots = [];
  let empty = 0;
  let tray = "pink";
  let history = [];

  function targetFor(i) {
    return COLORS[i % COLORS.length];
  }

  function paintDots() {
    dotsEl.innerHTML = "";
    for (let i = 0; i < 3; i += 1) {
      const d = document.createElement("span");
      if (i < ((level - 1) % 3) + 1) d.classList.add("on");
      dotsEl.appendChild(d);
    }
  }

  function paint() {
    wheel.innerHTML = "";
    slots.forEach((color, i) => {
      const wrap = document.createElement("div");
      wrap.className = "slot";
      const angle = -90 + (i / SIZE) * 360;
      wrap.style.transform = `rotate(${angle}deg) translateY(-102px) rotate(${-angle}deg)`;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `petal ${color || "empty"}`;
      btn.setAttribute(
        "aria-label",
        color ? `${color} petal` : "Empty petal slot — tap to place",
      );
      btn.addEventListener("click", () => placeIntoEmpty(i));
      wrap.appendChild(btn);
      wheel.appendChild(wrap);
    });

    trayPetal.className = `petal tray-petal ${tray}`;
    trayPetal.onclick = () => placeIntoEmpty(empty);
    levelEl.textContent = String(level);
    leavesEl.textContent = String(leaves);
    hintCount.textContent = String(hints);
    paintDots();
  }

  function isComplete() {
    return slots.every((c, i) => c === targetFor(i));
  }

  function snapshot() {
    history.push({
      slots: [...slots],
      empty,
      tray,
      leaves,
    });
    if (history.length > 24) history.shift();
  }

  /** Always place tray petal into the empty slot (as on the card art). */
  function placeIntoEmpty(i) {
    if (i !== empty || empty < 0) return;
    snapshot();
    slots[i] = tray;

    if (isComplete()) {
      empty = -1;
      paint();
      leaves += 15;
      level += 1;
      setTimeout(newLevel, 500);
      return;
    }

    // Pull another petal into the tray — prefer mismatched ones.
    const candidates = [];
    for (let s = 0; s < SIZE; s += 1) {
      if (s === i) continue;
      if (slots[s]) candidates.push(s);
    }
    const wrong = candidates.filter((s) => slots[s] !== targetFor(s));
    const pool = wrong.length ? wrong : candidates;
    const nextEmpty = pool[Math.floor(Math.random() * pool.length)];
    tray = slots[nextEmpty];
    slots[nextEmpty] = null;
    empty = nextEmpty;
    leaves += 2;
    paint();
  }

  function newLevel() {
    const filled = Array.from({ length: SIZE }, (_, i) => targetFor(i));
    empty = Math.floor(Math.random() * SIZE);
    tray = filled[empty];
    filled[empty] = null;
    // Soft scramble: a few swaps so it isn't already solved.
    for (let n = 0; n < 3 + (level % 3); n += 1) {
      const a = Math.floor(Math.random() * SIZE);
      const b = Math.floor(Math.random() * SIZE);
      if (a === empty || b === empty || a === b) continue;
      [filled[a], filled[b]] = [filled[b], filled[a]];
    }
    slots = filled;
    history = [];
    if (hints < 3) hints = Math.min(3, hints + 1);
    paint();
  }

  document.getElementById("undoBtn").addEventListener("click", () => {
    const prev = history.pop();
    if (!prev) return;
    slots = prev.slots;
    empty = prev.empty;
    tray = prev.tray;
    leaves = prev.leaves;
    paint();
  });

  document.getElementById("restartBtn").addEventListener("click", newLevel);

  document.getElementById("hintBtn").addEventListener("click", () => {
    if (hints <= 0 || empty < 0) return;
    hints -= 1;
    hintCount.textContent = String(hints);
    const btn = wheel.querySelectorAll(".petal")[empty];
    btn?.classList.add("glow");
    trayPetal.classList.add("glow");
    setTimeout(() => {
      btn?.classList.remove("glow");
      trayPetal.classList.remove("glow");
    }, 1000);
  });

  for (let i = 0; i < 14; i += 1) {
    const f = document.createElement("span");
    f.className = "flake";
    f.textContent = "🌸";
    f.style.left = `${Math.random() * 100}%`;
    f.style.animationDuration = `${7 + Math.random() * 8}s`;
    f.style.animationDelay = `${Math.random() * 6}s`;
    fall.appendChild(f);
  }

  newLevel();
})();
