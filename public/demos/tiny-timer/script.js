(() => {
  const display = document.getElementById("display");
  const progress = document.getElementById("progress");
  const knob = document.getElementById("knob");
  const startBtn = document.getElementById("startBtn");
  const chimeToggle = document.getElementById("chimeToggle");
  const statSessions = document.getElementById("statSessions");
  const statMinutes = document.getElementById("statMinutes");
  const presets = Array.from(document.querySelectorAll(".preset"));
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const bubbles = document.getElementById("bubbles");

  const CIRC = 2 * Math.PI * 50;
  progress.style.strokeDasharray = String(CIRC);

  let total = 720;
  let left = 720;
  let running = false;
  let timer = null;
  let sessions = 0;
  let minutes = 0;

  function format(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function setKnob(ratio) {
    const angle = -Math.PI / 2 + ratio * Math.PI * 2;
    const cx = 60 + Math.cos(angle) * 50;
    const cy = 60 + Math.sin(angle) * 50;
    knob.setAttribute("cx", String(cx));
    knob.setAttribute("cy", String(cy));
  }

  function paint() {
    display.textContent = format(left);
    const ratio = total === 0 ? 0 : left / total;
    progress.style.strokeDashoffset = String(CIRC * (1 - ratio));
    setKnob(1 - ratio);
  }

  function chime() {
    if (!chimeToggle.checked) return;
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
      g.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
      o.stop(ctx.currentTime + 0.85);
      setTimeout(() => ctx.close(), 1000);
    } catch {
      /* ignore */
    }
  }

  function stop() {
    clearInterval(timer);
    timer = null;
    running = false;
    startBtn.textContent = "▶ Start Focus";
  }

  function complete() {
    stop();
    left = 0;
    paint();
    chime();
    sessions += 1;
    minutes += Math.round(total / 60);
    statSessions.textContent = String(sessions);
    statMinutes.textContent = String(minutes);
  }

  function start() {
    if (running) {
      stop();
      return;
    }
    if (left <= 0) left = total;
    running = true;
    startBtn.textContent = "❚❚ Pause";
    timer = setInterval(() => {
      left -= 1;
      paint();
      if (left <= 0) complete();
    }, 1000);
  }

  presets.forEach((btn) => {
    btn.addEventListener("click", () => {
      presets.forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      total = Number(btn.dataset.seconds);
      left = total;
      stop();
      paint();
    });
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      document.querySelectorAll(".panel").forEach((p) => p.classList.add("hidden"));
      document.getElementById(`panel-${tab.dataset.tab}`).classList.remove("hidden");
    });
  });

  startBtn.addEventListener("click", start);

  const colors = ["#9fd9d0", "#cbb8f5", "#b7ebe3", "#e0cfff", "#a7f3d0"];
  for (let i = 0; i < 14; i += 1) {
    const b = document.createElement("span");
    b.className = "bubble";
    const size = 40 + Math.random() * 90;
    b.style.width = `${size}px`;
    b.style.height = `${size}px`;
    b.style.left = `${Math.random() * 100}%`;
    b.style.top = `${Math.random() * 100}%`;
    b.style.background = colors[i % colors.length];
    bubbles.appendChild(b);
  }

  paint();
})();
