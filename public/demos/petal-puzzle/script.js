(() => {
  const boardEl = document.getElementById("board");
  const movesEl = document.getElementById("moves");
  const statusEl = document.getElementById("status");
  const shuffleBtn = document.getElementById("shuffleBtn");
  const resetBtn = document.getElementById("resetBtn");

  const PETALS = [
    { id: 1, emoji: "🌸", color: "linear-gradient(145deg,#fb7185,#f9a8d4)" },
    { id: 2, emoji: "🌺", color: "linear-gradient(145deg,#e879f9,#c4b5fd)" },
    { id: 3, emoji: "🌼", color: "linear-gradient(145deg,#fbbf24,#fde68a)" },
    { id: 4, emoji: "💮", color: "linear-gradient(145deg,#f472b6,#fda4af)" },
    { id: 5, emoji: "🌷", color: "linear-gradient(145deg,#a78bfa,#ddd6fe)" },
    { id: 6, emoji: "🌿", color: "linear-gradient(145deg,#34d399,#99f6e4)" },
    { id: 7, emoji: "🪷", color: "linear-gradient(145deg,#fb7185,#fda4af)" },
    { id: 8, emoji: "🌱", color: "linear-gradient(145deg,#2dd4bf,#a7f3d0)" },
    null,
  ];

  let tiles = [...PETALS];
  let moves = 0;
  let won = false;

  function indexOfEmpty() {
    return tiles.findIndex((t) => t === null);
  }

  function neighbors(i) {
    const r = Math.floor(i / 3);
    const c = i % 3;
    const list = [];
    if (r > 0) list.push(i - 3);
    if (r < 2) list.push(i + 3);
    if (c > 0) list.push(i - 1);
    if (c < 2) list.push(i + 1);
    return list;
  }

  function isSolved() {
    for (let i = 0; i < 8; i += 1) {
      if (!tiles[i] || tiles[i].id !== i + 1) return false;
    }
    return tiles[8] === null;
  }

  function inversionCount(arr) {
    const nums = arr.filter(Boolean).map((t) => t.id);
    let inv = 0;
    for (let i = 0; i < nums.length; i += 1) {
      for (let j = i + 1; j < nums.length; j += 1) {
        if (nums[i] > nums[j]) inv += 1;
      }
    }
    return inv;
  }

  /** Only even permutations are solvable for 3x3. */
  function isSolvable(arr) {
    return inversionCount(arr) % 2 === 0;
  }

  function paint() {
    boardEl.innerHTML = "";
    tiles.forEach((tile, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tile" + (tile ? "" : " empty");
      btn.setAttribute("role", "gridcell");
      if (tile) {
        btn.textContent = tile.emoji;
        btn.style.background = tile.color;
        btn.setAttribute("aria-label", `Petal ${tile.id}`);
        if (won) btn.classList.add("win");
      } else {
        btn.setAttribute("aria-label", "Open space");
      }
      btn.addEventListener("click", () => tryMove(index));
      boardEl.appendChild(btn);
    });
    movesEl.textContent = String(moves);
  }

  function tryMove(index) {
    if (won) return;
    const empty = indexOfEmpty();
    if (!neighbors(empty).includes(index)) return;
    [tiles[empty], tiles[index]] = [tiles[index], tiles[empty]];
    moves += 1;
    paint();
    if (isSolved()) {
      won = true;
      paint();
      statusEl.textContent = "Bloomed! Soft and solved — shuffle for another round.";
    } else {
      statusEl.textContent = "Keep going — petals like slow moves.";
    }
  }

  function reset() {
    tiles = [...PETALS];
    moves = 0;
    won = false;
    statusEl.textContent = "Fresh flower. Shuffle to begin.";
    paint();
  }

  function shuffle() {
    let next;
    do {
      next = [...PETALS];
      for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
    } while (!isSolvable(next) || next.every((t, i) => t === PETALS[i]));
    tiles = next;
    moves = 0;
    won = false;
    statusEl.textContent = "Shuffled. Slide petals into the open space.";
    paint();
  }

  shuffleBtn.addEventListener("click", shuffle);
  resetBtn.addEventListener("click", reset);

  reset();
})();
