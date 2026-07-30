(() => {
  "use strict";

  const PRODUCTS = {
    moonBun: {
      id: "moonBun",
      name: "Moon Bun",
      icon: "🥐",
      needs: ["flour"],
      bakeMs: 2200,
      coins: 8,
    },
    berryTart: {
      id: "berryTart",
      name: "Berry Tart",
      icon: "🥧",
      needs: ["flour", "berry"],
      bakeMs: 2800,
      coins: 12,
    },
    starCookie: {
      id: "starCookie",
      name: "Star Cookie",
      icon: "🍪",
      needs: ["flour", "sugar"],
      bakeMs: 2400,
      coins: 11,
    },
  };

  const GUESTS = {
    bunny: { id: "bunny", name: "Bunny", face: "🐰" },
    fox: { id: "fox", name: "Fox", face: "🦊" },
    owl: { id: "owl", name: "Owl", face: "🦉" },
    hedgehog: { id: "hedgehog", name: "Hog", face: "🦔" },
  };

  const DAYS = [
    {
      title: "First guest",
      purpose: "One customer",
      hint: "Drag flour into Prep, Bake, then serve the Moon Bun to the bunny.",
      goal: 1,
      patience: false,
      berry: false,
      sugar: false,
      helper: false,
      dualOven: false,
      maxQueue: 1,
      spawnMs: 99999,
      guestPool: ["bunny"],
      orderPool: ["moonBun"],
    },
    {
      title: "Busy counter",
      purpose: "Two guests",
      hint: "Two friends are waiting — serve both Moon Buns.",
      goal: 2,
      patience: false,
      berry: false,
      sugar: false,
      helper: false,
      dualOven: false,
      maxQueue: 2,
      spawnMs: 3500,
      guestPool: ["bunny", "fox"],
      orderPool: ["moonBun"],
    },
    {
      title: "Warm clock",
      purpose: "Patience",
      hint: "Hearts drain! Serve before the bar empties.",
      goal: 3,
      patience: true,
      berry: false,
      sugar: false,
      helper: false,
      dualOven: false,
      maxQueue: 2,
      spawnMs: 4200,
      guestPool: ["bunny", "fox", "owl"],
      orderPool: ["moonBun"],
    },
    {
      title: "Berry shelf",
      purpose: "Second product",
      hint: "Berry Tart needs flour + berry, then bake.",
      goal: 3,
      patience: true,
      berry: true,
      sugar: false,
      helper: false,
      dualOven: false,
      maxQueue: 2,
      spawnMs: 4000,
      guestPool: ["bunny", "fox", "hedgehog"],
      orderPool: ["moonBun", "berryTart"],
    },
    {
      title: "Flour sprite",
      purpose: "Helper",
      hint: "Your fairy helper nudges prep and tips coins.",
      goal: 4,
      patience: true,
      berry: true,
      sugar: false,
      helper: true,
      dualOven: false,
      maxQueue: 2,
      spawnMs: 3800,
      guestPool: ["bunny", "fox", "owl"],
      orderPool: ["moonBun", "berryTart"],
    },
    {
      title: "Queue night",
      purpose: "Longer queue",
      hint: "Up to three guests — keep the line happy.",
      goal: 5,
      patience: true,
      berry: true,
      sugar: true,
      helper: true,
      dualOven: false,
      maxQueue: 3,
      spawnMs: 3600,
      guestPool: ["bunny", "fox", "owl", "hedgehog"],
      orderPool: ["moonBun", "berryTart", "starCookie"],
    },
    {
      title: "Twin ovens",
      purpose: "Double oven",
      hint: "Bake two pastries at once in glowing ovens.",
      goal: 5,
      patience: true,
      berry: true,
      sugar: true,
      helper: true,
      dualOven: true,
      maxQueue: 3,
      spawnMs: 3200,
      guestPool: ["bunny", "fox", "owl", "hedgehog"],
      orderPool: ["moonBun", "berryTart", "starCookie"],
    },
    {
      title: "Moon Festival",
      purpose: "Finale",
      hint: "Festival rush — all recipes, twin ovens, full queue!",
      goal: 7,
      patience: true,
      berry: true,
      sugar: true,
      helper: true,
      dualOven: true,
      maxQueue: 3,
      spawnMs: 2800,
      guestPool: ["bunny", "fox", "owl", "hedgehog"],
      orderPool: ["moonBun", "berryTart", "starCookie"],
    },
  ];

  const els = {
    sky: document.getElementById("sky"),
    hud: document.getElementById("hud"),
    dayNum: document.getElementById("dayNum"),
    stars: document.getElementById("stars"),
    coins: document.getElementById("coins"),
    combo: document.getElementById("combo"),
    comboN: document.getElementById("comboN"),
    queue: document.getElementById("queue"),
    bowl: document.getElementById("bowl"),
    bowlHint: document.getElementById("bowlHint"),
    mixIcons: document.getElementById("mixIcons"),
    bakeBtn: document.getElementById("bakeBtn"),
    oven0: document.getElementById("oven0"),
    oven1: document.getElementById("oven1"),
    bar0: document.getElementById("bar0"),
    bar1: document.getElementById("bar1"),
    ovenB: document.getElementById("ovenB"),
    ovens: document.getElementById("ovens"),
    tray: document.getElementById("tray"),
    pantry: document.getElementById("pantry"),
    ingBerry: document.getElementById("ingBerry"),
    ingSugar: document.getElementById("ingSugar"),
    helper: document.getElementById("helper"),
    helperTip: document.getElementById("helperTip"),
    dayCard: document.getElementById("dayCard"),
    dayKicker: document.getElementById("dayKicker"),
    dayTitle: document.getElementById("dayTitle"),
    dayHint: document.getElementById("dayHint"),
    overlay: document.getElementById("overlay"),
    startBtn: document.getElementById("startBtn"),
    summary: document.getElementById("summary"),
    sumKicker: document.getElementById("sumKicker"),
    sumTitle: document.getElementById("sumTitle"),
    sumServed: document.getElementById("sumServed"),
    sumCoins: document.getElementById("sumCoins"),
    sumCombo: document.getElementById("sumCombo"),
    sumStars: document.getElementById("sumStars"),
    nextBtn: document.getElementById("nextBtn"),
    frame: document.getElementById("frame"),
  };

  const ctx = els.sky.getContext("2d");
  const W = els.sky.width;
  const H = els.sky.height;

  let dayIndex = 0;
  let day = DAYS[0];
  let coins = 0;
  let dayCoins = 0;
  let stars = 0;
  let served = 0;
  let combo = 0;
  let bestCombo = 1;
  let lastServeAt = 0;
  let mix = [];
  let customers = [];
  let ovens = [
    { pastry: null, t: 0, done: false },
    { pastry: null, t: 0, done: false },
  ];
  let trayItem = null;
  let spawnAcc = 0;
  let playing = false;
  let time = 0;
  let dragIng = null;
  let helperAcc = 0;
  const lights = Array.from({ length: 24 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H * 0.55,
    r: 1 + Math.random() * 1.8,
    a: 0.2 + Math.random() * 0.5,
    s: 0.2 + Math.random() * 0.5,
  }));

  function recipeFromMix(list) {
    const sorted = [...list].sort().join("+");
    if (sorted === "flour") return PRODUCTS.moonBun;
    if (sorted === "berry+flour") return PRODUCTS.berryTart;
    if (sorted === "flour+sugar") return PRODUCTS.starCookie;
    return null;
  }

  function updateMixUI() {
    const icons = { flour: "🌾", berry: "🫐", sugar: "✨" };
    els.mixIcons.innerHTML = mix.map((m) => icons[m] || "?").join("");
    const recipe = recipeFromMix(mix);
    els.bowlHint.textContent = recipe
      ? `Ready: ${recipe.name}`
      : mix.length
        ? "Need a recipe…"
        : "Drop ingredients";
    els.bakeBtn.disabled = !recipe || freeOven() === null;
  }

  function freeOven() {
    const count = day.dualOven ? 2 : 1;
    for (let i = 0; i < count; i += 1) {
      if (!ovens[i].pastry) return i;
    }
    return null;
  }

  function renderOvens() {
    [0, 1].forEach((i) => {
      const slot = els[`oven${i}`];
      const bar = els[`bar${i}`];
      const o = ovens[i];
      if (!o.pastry) {
        slot.innerHTML = "";
        bar.style.width = "0%";
        return;
      }
      if (o.done) {
        slot.innerHTML = `<button type="button" class="pastry" data-collect="${i}">${o.pastry.icon}</button>`;
        bar.style.width = "100%";
      } else {
        slot.innerHTML = `<span class="pastry" style="opacity:.55">${o.pastry.icon}</span>`;
        bar.style.width = `${Math.min(100, (o.t / o.pastry.bakeMs) * 100)}%`;
      }
    });
  }

  function renderTray() {
    if (!trayItem) {
      els.tray.innerHTML = '<span class="bowl-hint">Fresh pastries</span>';
      return;
    }
    els.tray.innerHTML = `<button type="button" class="pastry" id="trayPastry" draggable="true">${trayItem.icon}</button>`;
    const btn = document.getElementById("trayPastry");
    btn.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/pastry", trayItem.id);
      e.dataTransfer.effectAllowed = "move";
    });
  }

  function renderCustomers() {
    els.queue.innerHTML = "";
    customers.forEach((c) => {
      const g = GUESTS[c.guest];
      const p = PRODUCTS[c.order];
      const el = document.createElement("div");
      el.className = "customer";
      el.dataset.id = c.id;
      const patienceHtml = day.patience
        ? `<div class="patience"><i style="transform:scaleX(${c.patience})"></i></div>`
        : "";
      el.innerHTML = `
        <div class="bubble" title="${p.name}">${p.icon}</div>
        <div class="face">${g.face}</div>
        <p class="name">${g.name}</p>
        ${patienceHtml}
      `;
      el.addEventListener("dragover", (e) => {
        if (!trayItem) return;
        e.preventDefault();
        el.classList.add("serve-ok");
      });
      el.addEventListener("dragleave", () => el.classList.remove("serve-ok"));
      el.addEventListener("drop", (e) => {
        e.preventDefault();
        el.classList.remove("serve-ok");
        tryServe(c.id);
      });
      el.addEventListener("click", () => tryServe(c.id));
      els.queue.appendChild(el);
    });
  }

  function spawnCustomer() {
    if (customers.length >= day.maxQueue) return;
    if (served + customers.length >= day.goal) return;
    const guest =
      day.guestPool[Math.floor(Math.random() * day.guestPool.length)];
    const order =
      day.orderPool[Math.floor(Math.random() * day.orderPool.length)];
    customers.push({
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      guest,
      order,
      patience: 1,
      born: performance.now(),
    });
    renderCustomers();
  }

  function tryServe(customerId) {
    if (!trayItem || !playing) return;
    const c = customers.find((x) => x.id === customerId);
    if (!c) return;
    if (c.order !== trayItem.id) {
      els.frame.classList.remove("shake");
      void els.frame.offsetWidth;
      els.frame.classList.add("shake");
      combo = 0;
      return;
    }
    // success
    const now = performance.now();
    if (now - lastServeAt < 3500) combo += 1;
    else combo = 1;
    lastServeAt = now;
    bestCombo = Math.max(bestCombo, combo);
    const bonus = Math.min(combo, 4);
    const gain = trayItem.coins + bonus * 2;
    coins += gain;
    dayCoins += gain;
    served += 1;
    if (combo >= 2) {
      els.comboN.textContent = String(combo);
      els.combo.hidden = false;
      clearTimeout(els.combo._t);
      els.combo._t = setTimeout(() => {
        els.combo.hidden = true;
      }, 900);
    }
    trayItem = null;
    customers = customers.filter((x) => x.id !== customerId);
    renderTray();
    renderCustomers();
    updateHud();
    sparkle();
    if (served >= day.goal) endDay();
  }

  function updateHud() {
    els.dayNum.textContent = String(dayIndex + 1);
    els.coins.textContent = String(coins);
    els.stars.textContent = String(stars);
  }

  function sparkle() {
    els.frame.classList.remove("shake");
    void els.frame.offsetWidth;
    // soft pulse via CSS class reuse
  }

  function configureDay() {
    day = DAYS[dayIndex];
    els.ingBerry.hidden = !day.berry;
    els.ingSugar.hidden = !day.sugar;
    els.ovenB.classList.toggle("hidden", !day.dualOven);
    els.helper.hidden = !day.helper;
    els.dayKicker.textContent = `Day ${dayIndex + 1} · ${day.purpose}`;
    els.dayTitle.textContent = day.title;
    els.dayHint.textContent = day.hint;
    els.dayCard.hidden = false;
    setTimeout(() => {
      if (playing) els.dayCard.hidden = true;
    }, 3200);
  }

  function startDay(i) {
    dayIndex = i;
    playing = true;
    served = 0;
    dayCoins = 0;
    combo = 0;
    bestCombo = 1;
    lastServeAt = 0;
    mix = [];
    customers = [];
    trayItem = null;
    ovens = [
      { pastry: null, t: 0, done: false },
      { pastry: null, t: 0, done: false },
    ];
    spawnAcc = 0;
    helperAcc = 0;
    configureDay();
    updateMixUI();
    renderOvens();
    renderTray();
    renderCustomers();
    spawnCustomer();
    if (day.maxQueue > 1) {
      setTimeout(() => {
        if (playing) spawnCustomer();
      }, 900);
    }
    updateHud();
    els.hud.hidden = false;
    els.summary.hidden = true;
    els.overlay.hidden = true;
  }

  function endDay() {
    playing = false;
    const rating =
      bestCombo >= 3 && dayCoins >= day.goal * 10
        ? 3
        : dayCoins >= day.goal * 7
          ? 2
          : 1;
    stars += rating;
    els.sumKicker.textContent =
      dayIndex >= DAYS.length - 1 ? "Festival complete" : `Day ${dayIndex + 1} complete`;
    els.sumTitle.textContent =
      dayIndex >= DAYS.length - 1 ? "Moonlit success" : "Sweet work";
    els.sumServed.textContent = String(served);
    els.sumCoins.textContent = String(dayCoins);
    els.sumCombo.textContent = `×${bestCombo}`;
    els.sumStars.textContent = "★".repeat(rating) + "☆".repeat(3 - rating);
    els.nextBtn.textContent =
      dayIndex >= DAYS.length - 1 ? "Play again" : "Next day";
    els.summary.hidden = false;
    updateHud();
  }

  // —— interactions ——
  els.startBtn.addEventListener("click", () => {
    coins = 0;
    stars = 0;
    startDay(0);
  });

  els.nextBtn.addEventListener("click", () => {
    if (dayIndex >= DAYS.length - 1) {
      els.summary.hidden = true;
      els.overlay.hidden = false;
      els.hud.hidden = true;
      playing = false;
      return;
    }
    startDay(dayIndex + 1);
  });

  els.bakeBtn.addEventListener("click", () => {
    const recipe = recipeFromMix(mix);
    const slot = freeOven();
    if (!recipe || slot === null) return;
    ovens[slot] = { pastry: recipe, t: 0, done: false };
    mix = [];
    updateMixUI();
    renderOvens();
  });

  els.ovens.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-collect]");
    if (!btn) return;
    const i = Number(btn.dataset.collect);
    const o = ovens[i];
    if (!o.done || !o.pastry) return;
    if (trayItem) return;
    trayItem = o.pastry;
    ovens[i] = { pastry: null, t: 0, done: false };
    renderOvens();
    renderTray();
    updateMixUI();
  });

  function addIngredient(ing) {
    if (!playing) return;
    if (mix.includes(ing)) return;
    if (mix.length >= 2) return;
    mix.push(ing);
    updateMixUI();
  }

  // Drag ingredients (mouse + touch via pointer / HTML5 DnD)
  els.pantry.querySelectorAll(".ing").forEach((btn) => {
    btn.addEventListener("dragstart", (e) => {
      dragIng = btn.dataset.ing;
      e.dataTransfer.setData("text/ing", dragIng);
      e.dataTransfer.effectAllowed = "copy";
    });
    btn.addEventListener("click", () => addIngredient(btn.dataset.ing));
  });

  ["bowl", "tray"].forEach((id) => {
    const node = els[id];
    node.addEventListener("dragover", (e) => {
      e.preventDefault();
      node.classList.add("drag-over");
    });
    node.addEventListener("dragleave", () => node.classList.remove("drag-over"));
    node.addEventListener("drop", (e) => {
      e.preventDefault();
      node.classList.remove("drag-over");
      const ing = e.dataTransfer.getData("text/ing");
      if (id === "bowl" && ing) addIngredient(ing);
    });
  });

  // Touch-friendly: long-press not needed — tap ingredient then tap bowl
  els.bowl.addEventListener("click", () => {
    if (dragIng) {
      addIngredient(dragIng);
      dragIng = null;
    }
  });

  // —— game loop ——
  function tick(dt) {
    time += dt;
    if (!playing) return;

    spawnAcc += dt;
    if (spawnAcc >= day.spawnMs) {
      spawnAcc = 0;
      spawnCustomer();
    }

    // ovens
    const count = day.dualOven ? 2 : 1;
    for (let i = 0; i < count; i += 1) {
      const o = ovens[i];
      if (!o.pastry || o.done) continue;
      o.t += dt;
      if (o.t >= o.pastry.bakeMs) {
        o.done = true;
        o.t = o.pastry.bakeMs;
      }
    }
    renderOvens();

    // patience
    if (day.patience) {
      let dirty = false;
      customers = customers.filter((c) => {
        c.patience -= dt / 16000;
        dirty = true;
        if (c.patience <= 0) {
          combo = 0;
          return false;
        }
        return true;
      });
      if (dirty) renderCustomers();
    }

    // helper auto-tips + occasional flour
    if (day.helper) {
      helperAcc += dt;
      if (helperAcc > 5000) {
        helperAcc = 0;
        coins += 2;
        dayCoins += 2;
        updateHud();
        els.helperTip.textContent = ["Sparkle tip!", "Extra crumb!", "Moon dust!"][
          Math.floor(Math.random() * 3)
        ];
        if (!mix.includes("flour") && mix.length < 2 && Math.random() > 0.45) {
          mix.push("flour");
          updateMixUI();
          els.helperTip.textContent = "Flour for you!";
        }
      }
    }
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1e1140");
    g.addColorStop(0.55, "#2a1548");
    g.addColorStop(1, "#1a0f2e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // moon
    const mx = 280;
    const my = 70;
    const moon = ctx.createRadialGradient(mx - 6, my - 6, 4, mx, my, 42);
    moon.addColorStop(0, "#fff7ed");
    moon.addColorStop(0.6, "#fde68a");
    moon.addColorStop(1, "rgba(253, 230, 138, 0)");
    ctx.fillStyle = moon;
    ctx.beginPath();
    ctx.arc(mx, my, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff7ed";
    ctx.beginPath();
    ctx.arc(mx, my, 22, 0, Math.PI * 2);
    ctx.fill();

    // bakery window glow
    const win = ctx.createRadialGradient(180, 520, 10, 180, 480, 160);
    win.addColorStop(0, "rgba(251, 191, 36, 0.35)");
    win.addColorStop(1, "transparent");
    ctx.fillStyle = win;
    ctx.fillRect(0, 360, W, H);

    // fairy lights
    for (let i = 0; i < 10; i += 1) {
      const x = 30 + i * 32;
      const y = 150 + Math.sin(time * 0.002 + i) * 4;
      ctx.beginPath();
      ctx.fillStyle = `rgba(251, 191, 36, ${0.45 + Math.sin(time * 0.01 + i) * 0.25})`;
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of lights) {
      p.y += p.s * 0.15;
      if (p.y > H * 0.6) {
        p.y = 10;
        p.x = Math.random() * W;
      }
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 247, 237, ${p.a})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // counter silhouette
    ctx.fillStyle = "rgba(20, 10, 36, 0.55)";
    ctx.fillRect(0, 430, W, 210);
    ctx.fillStyle = "rgba(251, 191, 36, 0.08)";
    ctx.fillRect(16, 440, W - 32, 12);
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(40, now - last);
    last = now;
    tick(dt);
    drawSky();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
