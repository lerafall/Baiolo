(() => {
  const stage = document.getElementById("stage");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayBody = document.getElementById("overlayBody");
  const startBtn = document.getElementById("startBtn");
  const scoreEl = document.getElementById("score");
  const timeEl = document.getElementById("time");

  const ROUND = 30;
  let score = 0;
  let left = ROUND;
  let playing = false;
  let spawnTimer = 0;
  let tickTimer = 0;

  function clearStars() {
    stage.querySelectorAll(".star").forEach((n) => n.remove());
  }

  function setOverlay(title, body, buttonLabel) {
    overlayTitle.textContent = title;
    overlayBody.textContent = body;
    startBtn.textContent = buttonLabel;
    overlay.classList.remove("hidden");
  }

  function spawnStar() {
    if (!playing) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "star";
    btn.setAttribute("aria-label", "Catch star");

    const roll = Math.random();
    let points = 1;
    let glyph = "★";
    if (roll > 0.82) {
      btn.classList.add("gold");
      points = 3;
      glyph = "✦";
    } else if (roll > 0.55) {
      btn.classList.add("teal");
      points = 2;
      glyph = "✧";
    }
    btn.textContent = glyph;

    const size = btn.classList.contains("gold") ? 56 : 48;
    const maxX = Math.max(8, stage.clientWidth - size - 8);
    btn.style.left = `${8 + Math.random() * maxX}px`;
    btn.style.top = "-8px";
    const duration = 2.2 + Math.random() * 2.4;
    btn.style.animationDuration = `${duration}s, 0.9s`;

    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (!playing || btn.classList.contains("pop")) return;
      score += points;
      scoreEl.textContent = String(score);
      btn.classList.add("pop");
      setTimeout(() => btn.remove(), 220);
    });

    btn.addEventListener("animationend", (e) => {
      if (e.animationName === "fall" && btn.isConnected) btn.remove();
    });

    stage.appendChild(btn);
  }

  function endRound() {
    playing = false;
    clearInterval(spawnTimer);
    clearInterval(tickTimer);
    clearStars();
    const line =
      score >= 40
        ? "Star prodigy! People will love this loop."
        : score >= 20
          ? "Nice catches — try again for a higher score."
          : "Warm-up done. Another round?";
    setOverlay(`Score: ${score}`, line, "Play again");
  }

  function startRound() {
    score = 0;
    left = ROUND;
    scoreEl.textContent = "0";
    timeEl.textContent = String(ROUND);
    overlay.classList.add("hidden");
    clearStars();
    playing = true;

    spawnTimer = window.setInterval(spawnStar, 480);
    spawnStar();
    tickTimer = window.setInterval(() => {
      left -= 1;
      timeEl.textContent = String(left);
      if (left <= 0) endRound();
    }, 1000);
  }

  startBtn.addEventListener("click", startRound);
})();
