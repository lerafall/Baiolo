import { describe, expect, it } from "vitest";
import {
  composeBuildBrief,
  ensurePlayableFiles,
  hasSuspiciousAutoScore,
  isFixIntent,
  looksIncompletePlayable,
  normalizeAiBuildFiles,
  parseAiBuildPayload,
  parseChatTurnPayload,
  truncateExistingFiles,
} from "@/lib/ai-build";

describe("ai-build parsers", () => {
  it("normalizes allowed files and aliases", () => {
    const files = normalizeAiBuildFiles({
      "index.html": "<html></html>",
      "styles.css": "body{}",
      "main.js": "console.log(1)",
      "evil.exe": "nope",
    });
    expect(files).toEqual({
      "index.html": "<html></html>",
      "style.css": "body{}",
      "script.js": "console.log(1)",
    });
  });

  it("rejects missing index.html", () => {
    expect(normalizeAiBuildFiles({ "style.css": "x" })).toBeNull();
  });

  it("parses full AI payload", () => {
    const parsed = parseAiBuildPayload(
      JSON.stringify({
        title: "Star Catch",
        description: "Catch falling stars",
        category: "game",
        files: {
          "index.html": "<!DOCTYPE html><html></html>",
          "style.css": "body{}",
          "script.js": "1",
        },
      }),
    );
    expect(parsed?.title).toBe("Star Catch");
    expect(parsed?.category).toBe("game");
    expect(parsed?.files["index.html"]).toContain("DOCTYPE");
  });

  it("parses chat turn follow-up", () => {
    const result = parseChatTurnPayload(
      JSON.stringify({
        ready: false,
        message: "Cool! Pastel or neon colors?",
      }),
    );
    expect(result).toEqual({
      status: "chat",
      message: "Cool! Pastel or neon colors?",
      categoryHint: null,
    });
  });

  it("parses ready chat turn", () => {
    const result = parseChatTurnPayload(
      JSON.stringify({ ready: true, message: "Building now!" }),
    );
    expect(result.status).toBe("ready");
  });

  it("composes brief from chat", () => {
    const brief = composeBuildBrief("Tap stars", [
      { role: "assistant", content: "Catch 5 or 10?" },
      { role: "user", content: "10 please" },
    ]);
    expect(brief).toContain("Tap stars");
    expect(brief).toContain("10 please");
  });

  it("detects fix intent in PL/EN", () => {
    expect(isFixIntent("Nie działa ta gra. popraw ją")).toBe(true);
    expect(isFixIntent("Na podglądzie nie widać działającej gry")).toBe(true);
    expect(isFixIntent("Nadal bez zmian")).toBe(true);
    expect(isFixIntent("Still not working")).toBe(true);
    expect(isFixIntent("Catch falling coins with a basket")).toBe(false);
  });

  it("flags incomplete game shells", () => {
    expect(
      looksIncompletePlayable(
        {
          "index.html": "<html></html>",
          "script.js": "document.body.textContent='Score: 0'",
        },
        "game",
      ),
    ).toBe(true);
    // Long JS that targets #game but HTML has no canvas → still incomplete.
    expect(
      looksIncompletePlayable(
        {
          "index.html": "<html><body><p>Score: 0</p></body></html>",
          "script.js": `
            const c=document.getElementById('game');
            const ctx=c.getContext('2d');
            addEventListener('keydown',()=>{});
            function loop(){ ctx.fillRect(0,0,10,10); requestAnimationFrame(loop); }
            loop();
            ${"/* pad */".repeat(80)}
          `,
        },
        "game",
      ),
    ).toBe(true);
    expect(
      looksIncompletePlayable(
        {
          "index.html": "<canvas id=c></canvas>",
          "script.js": `
            const c=document.getElementById('c');
            const ctx=c.getContext('2d');
            addEventListener('keydown',()=>{});
            function loop(){ ctx.fillRect(0,0,10,10); requestAnimationFrame(loop); }
            loop();
          `,
        },
        "game",
      ),
    ).toBe(false);
  });

  // These three used to be thrown away and answered with the canned coin
  // catcher, which is why generated projects came back samey and wrong.
  it("keeps click-driven games that have no render loop", () => {
    const memory = {
      "index.html":
        '<html><body><div id="board"></div><p id="moves">Moves: 0</p><script src="script.js"></script></body></html>',
      "style.css": "#board{display:grid}",
      "script.js": `const ANIMALS = ["fox","bear","owl","frog"];
const board = document.getElementById("board");
let first = null, moves = 0;
[...ANIMALS, ...ANIMALS].forEach((animal) => {
  const card = document.createElement("button");
  card.addEventListener("click", () => {
    card.textContent = animal;
    if (!first) { first = card; return; }
    moves++;
    document.getElementById("moves").textContent = "Moves: " + moves;
    first = null;
  });
  board.appendChild(card);
});`,
    };
    expect(looksIncompletePlayable(memory, "game")).toBe(false);
    expect(
      ensurePlayableFiles(memory, { title: "Animal Memory", category: "game" })["script.js"],
    ).toContain("ANIMALS");
  });

  it("keeps a quiz built entirely from event handlers", () => {
    const quiz = {
      "index.html":
        '<html><body><p id="q"></p><div id="answers"></div><p id="score">Score: 0</p><script src="script.js"></script></body></html>',
      "style.css": "body{text-align:center}",
      "script.js": `const QUESTIONS = [{ q: "Capital of Poland?", a: ["Warsaw", "Krakow"], c: 0 }];
let i = 0, score = 0;
function render() {
  const item = QUESTIONS[i];
  document.getElementById("q").textContent = item ? item.q : "Done";
  const box = document.getElementById("answers");
  box.innerHTML = "";
  if (!item) return;
  item.a.forEach((text, idx) => {
    const b = document.createElement("button");
    b.textContent = text;
    b.addEventListener("click", () => {
      if (idx === item.c) { score++; document.getElementById("score").textContent = "Score: " + score; }
      i++; render();
    });
    box.appendChild(b);
  });
}
render();`,
    };
    expect(looksIncompletePlayable(quiz, "game")).toBe(false);
    expect(
      ensurePlayableFiles(quiz, { title: "Capital Quiz", category: "game" })["script.js"],
    ).toContain("QUESTIONS");
  });

  it("keeps an arcade game whose spawn timer sits near its collision scoring", () => {
    const arcade = {
      "index.html":
        '<html><body><canvas id="game" width="360" height="520"></canvas><p id="score">Score: 0</p><script src="script.js"></script></body></html>',
      "style.css": "canvas{display:block}",
      "script.js": `const cv = document.getElementById("game");
const cx = cv.getContext("2d");
let score = 0, px = 180, items = [];
addEventListener("pointermove", (e) => { px = e.clientX; });
setInterval(() => { items.push({ x: Math.random() * 340, y: -20 }); }, 900);
function loop() {
  cx.clearRect(0, 0, cv.width, cv.height);
  cx.fillRect(px - 30, 470, 60, 14);
  for (const it of items) {
    it.y += 3;
    if (it.y > 460 && Math.abs(it.x - px) < 34) {
      score += 1;
      document.getElementById("score").textContent = "Score: " + score;
      it.y = 9999;
    }
  }
  requestAnimationFrame(loop);
}
loop();`,
    };
    expect(hasSuspiciousAutoScore(arcade["script.js"])).toBe(false);
    expect(
      ensurePlayableFiles(arcade, { title: "Star Catcher", category: "game" })["script.js"],
    ).toContain("items.push");
  });

  it("ensurePlayableFiles replaces score-only shells", () => {
    const out = ensurePlayableFiles(
      {
        "index.html": "<html><body><p>Score: 0</p></body></html>",
        "script.js": "x".repeat(50),
      },
      { title: "Coin Catcher", brief: "catch coins", category: "game" },
    );
    expect(out["index.html"]).toContain("<canvas");
    expect(out["script.js"]).toContain("requestAnimationFrame");
  });

  it("flags and replaces idle auto-score timers", () => {
    const bad = `let score = 0;
setInterval(() => { score++; document.body.textContent = score; }, 100);
requestAnimationFrame(function loop(){ requestAnimationFrame(loop); });
window.addEventListener("keydown", () => {});
ctx.fillRect(0,0,1,1);`;
    expect(hasSuspiciousAutoScore(bad)).toBe(true);
    const out = ensurePlayableFiles(
      {
        "index.html":
          '<html><body><canvas id="game"></canvas><p>Score: 0</p></body></html>',
        "style.css": "canvas{display:block}",
        "script.js": bad + "x".repeat(80),
      },
      { title: "Auto", brief: "game", category: "game" },
    );
    expect(hasSuspiciousAutoScore(out["script.js"] || "")).toBe(false);
    expect(out["script.js"]).toContain("playerReady");
  });

  it("composeBuildAck varies by edit intent", async () => {
    const { composeBuildAck } = await import("@/lib/ai-build");
    expect(composeBuildAck({ locale: "pl", userText: "Zmień tło na zielone", repairing: true })).toMatch(
      /tło|kolory/i,
    );
    expect(composeBuildAck({ locale: "pl", userText: "Dodaj więcej monet", repairing: true })).toMatch(
      /monet/i,
    );
    expect(composeBuildAck({ locale: "pl", userText: "Dodaj punkty bonusowe", repairing: true })).toMatch(
      /punkt|bonus/i,
    );
    const a = composeBuildAck({ locale: "pl", userText: "Zmień tło na zielone", repairing: true });
    const b = composeBuildAck({ locale: "pl", userText: "Dodaj więcej monet", repairing: true });
    expect(a).not.toBe(b);
  });
});
