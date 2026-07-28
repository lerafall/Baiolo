(() => {
  const game = document.getElementById("game");
  const tokensEl = document.getElementById("tokens");
  const bucket = document.getElementById("bucket");
  const scoreEl = document.getElementById("score");
  const timeEl = document.getElementById("time");
  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");

  const ROUND = 30;
  let score = 0;
  let left = ROUND;
  let playing = false;
  let bucketX = 0.5;
  let spawnId = 0;
  let tickId = 0;
  let raf = 0;
  const tokens = [];

  function setBucket(ratio) {
    const pad = 0.14;
    bucketX = Math.min(1 - pad, Math.max(pad, ratio));
    bucket.style.left = `${bucketX * 100}%`;
  }

  function pointerToRatio(clientX) {
    const rect = game.getBoundingClientRect();
    return (clientX - rect.left) / rect.width;
  }

  function onMove(clientX) {
    if (!playing) return;
    setBucket(pointerToRatio(clientX));
  }

  game.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".start")) return;
    game.setPointerCapture?.(e.pointerId);
    onMove(e.clientX);
  });
  game.addEventListener("pointermove", (e) => onMove(e.clientX));

  function spawn() {
    if (!playing) return;
    const el = document.createElement("div");
    const gold = Math.random() > 0.45;
    el.className = `token ${gold ? "gold" : "teal"}`;
    el.innerHTML = "<span>★</span>";
    const x = 0.1 + Math.random() * 0.8;
    const speed = 0.18 + Math.random() * 0.22;
    const points = gold ? 2 : 1;
    tokensEl.appendChild(el);
    tokens.push({ el, x, y: -0.08, speed, points, alive: true });
  }

  function catchCheck(t) {
    const nearX = Math.abs(t.x - bucketX) < 0.11;
    const nearY = t.y > 0.72 && t.y < 0.86;
    return nearX && nearY;
  }

  function loop() {
    if (!playing) return;
    const h = game.clientHeight;
    for (const t of tokens) {
      if (!t.alive) continue;
      t.y += t.speed * 0.016;
      t.el.style.left = `${t.x * 100}%`;
      t.el.style.top = `${t.y * h}px`;
      t.el.style.transform = "translate(-50%, -50%)";
      if (catchCheck(t)) {
        t.alive = false;
        score += t.points;
        scoreEl.textContent = String(score);
        t.el.remove();
      } else if (t.y > 1.05) {
        t.alive = false;
        t.el.remove();
      }
    }
    raf = requestAnimationFrame(loop);
  }

  function endRound() {
    playing = false;
    clearInterval(spawnId);
    clearInterval(tickId);
    cancelAnimationFrame(raf);
    tokens.forEach((t) => t.el.remove());
    tokens.length = 0;
    overlay.querySelector(".title").textContent = `Score: ${score}`;
    overlay.querySelector(".body").textContent =
      score >= 25 ? "Star catcher pro!" : "Nice run — try again.";
    startBtn.textContent = "Play again";
    overlay.classList.remove("hidden");
  }

  function start() {
    score = 0;
    left = ROUND;
    scoreEl.textContent = "0";
    timeEl.textContent = String(ROUND);
    overlay.classList.add("hidden");
    tokens.forEach((t) => t.el.remove());
    tokens.length = 0;
    playing = true;
    setBucket(0.5);
    spawn();
    spawnId = setInterval(spawn, 520);
    tickId = setInterval(() => {
      left -= 1;
      timeEl.textContent = String(left);
      if (left <= 0) endRound();
    }, 1000);
    raf = requestAnimationFrame(loop);
  }

  startBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    start();
  });
  setBucket(0.5);
})();
