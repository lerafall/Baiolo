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
  let tray = "purple";
  let history = [];

  function targetFor(i) {
    // Soft repeating pattern around the flower.
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
      const angle = (i / SIZE) * 360;
      wrap.style.transform = `rotate(${angle}deg) translateY(-96px) rotate(${-angle}deg)`;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `petal ${color || "empty"}`;
      btn.setAttribute(
        "aria-label",
        color ? `${color} petal` : "Empty petal slot",
      );
      btn.addEventListener("click", () => onSlot(i));
      wrap.appendChild(btn);
      wheel.appendChild(wrap);
    });

    trayPetal.className = `petal tray-petal ${tray}`;
    trayPetal.onclick = () => onSlot(empty);
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
    if (history.length > 20) history.shift();
  }

  function onSlot(i) {
    if (i !== empty) return;
    if (tray !== targetFor(i)) {
      trayPetal.classList.add("glow");
      setTimeout(() => trayPetal.classList.remove("glow"), 350);
      return;
    }
    snapshot();
    slots[i] = tray;
    // Pull a wrong/missing petal out into the tray for the next empty.
    const wrong = [];
    for (let s = 0; s < SIZE; s += 1) {
      if (slots[s] && slots[s] !== targetFor(s)) wrong.push(s);
    }
    if (wrong.length === 0 && isComplete()) {
      empty = -1;
      tray = COLORS[level % COLORS.length];
      paint();
      leaves += 15;
      level += 1;
      setTimeout(newLevel, 450);
      return;
    }
    const nextEmpty =
      wrong[Math.floor(Math.random() * wrong.length)] ??
      Math.floor(Math.random() * SIZE);
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
    // Swap two others to create a soft puzzle.
    const a = (empty + 2) % SIZE;
    const b = (empty + 5) % SIZE;
    [filled[a], filled[b]] = [filled[b], filled[a]];
    slots = filled;
    history = [];
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

  document.getElementById("restartBtn").addEventListener("click", () => {
    newLevel();
  });

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
    }, 900);
  });

  for (let i = 0; i < 12; i += 1) {
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
