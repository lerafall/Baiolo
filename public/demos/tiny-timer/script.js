(() => {
  const display = document.getElementById("display");
  const ring = document.getElementById("ringProgress");
  const startBtn = document.getElementById("startBtn");
  const resetBtn = document.getElementById("resetBtn");
  const status = document.getElementById("status");
  const chips = Array.from(document.querySelectorAll(".chip"));
  const bubbles = document.getElementById("bubbles");

  const CIRC = 2 * Math.PI * 52;
  ring.style.strokeDasharray = String(CIRC);

  let total = 300;
  let left = 300;
  let ticking = null;
  let running = false;

  function format(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function paint() {
    display.textContent = format(left);
    const progress = total === 0 ? 0 : left / total;
    ring.style.strokeDashoffset = String(CIRC * (1 - progress));
  }

  function softChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 523.25;
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
      o.stop(ctx.currentTime + 0.75);
      setTimeout(() => ctx.close(), 900);
    } catch {
      /* ignore audio failures in locked contexts */
    }
  }

  function stop() {
    if (ticking) clearInterval(ticking);
    ticking = null;
    running = false;
    startBtn.textContent = "Start";
  }

  function complete() {
    stop();
    left = 0;
    paint();
    softChime();
    status.textContent = "Done. Soft chime — take a breath, then reset.";
  }

  function start() {
    if (running) {
      stop();
      status.textContent = "Paused. Tap Start to continue.";
      return;
    }
    if (left <= 0) left = total;
    running = true;
    startBtn.textContent = "Pause";
    status.textContent = "Focus bubble is on. You’ve got this.";
    ticking = window.setInterval(() => {
      left -= 1;
      paint();
      if (left <= 0) complete();
    }, 1000);
  }

  function reset() {
    stop();
    left = total;
    paint();
    status.textContent = "Ready again. Pick a length or start.";
  }

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      total = Number(chip.dataset.seconds);
      left = total;
      stop();
      paint();
      status.textContent = `${chip.textContent} focus set. Start when ready.`;
    });
  });

  // Default active chip to 5m
  chips.forEach((c) => c.classList.toggle("active", c.dataset.seconds === "300"));

  startBtn.addEventListener("click", start);
  resetBtn.addEventListener("click", reset);

  const palette = ["#2dd4bf", "#67e8f9", "#e0cfff", "#a7f3d0", "#c4b5fd"];
  for (let i = 0; i < 8; i += 1) {
    const b = document.createElement("span");
    b.className = "bubble";
    const size = 18 + Math.random() * 42;
    b.style.width = `${size}px`;
    b.style.height = `${size}px`;
    b.style.left = `${8 + Math.random() * 84}%`;
    b.style.top = `${10 + Math.random() * 75}%`;
    b.style.background = palette[i % palette.length];
    b.style.animationDelay = `${Math.random() * 3}s`;
    bubbles.appendChild(b);
  }

  paint();
})();
