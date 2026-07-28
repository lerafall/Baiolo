(() => {
  const doorsEl = document.getElementById("doors");
  const doorsView = document.getElementById("doorsView");
  const storyView = document.getElementById("storyView");
  const backBtn = document.getElementById("backBtn");
  const chapterLabel = document.getElementById("chapterLabel");
  const storyTitle = document.getElementById("storyTitle");
  const passage = document.getElementById("passage");
  const choicesEl = document.getElementById("choices");
  const storiesDone = document.getElementById("storiesDone");
  const gemsEl = document.getElementById("gems");
  const goldEl = document.getElementById("gold");

  const tales = [
    {
      id: "eldoria",
      theme: "purple",
      sigil: "☾",
      art: "🌲",
      title: "Shadows of Eldoria",
      blurb: "Uncover the secrets hidden in the dark.",
      nodes: {
        start: {
          chapter: "CHAPTER I",
          text: "Moonlight pools on the forest road. A purple lantern flickers beside a sealed gate carved with silent trees.",
          choices: [
            { label: "Touch the glowing tree mark", next: "mark" },
            { label: "Call out into the dark", next: "call" },
          ],
        },
        mark: {
          chapter: "CHAPTER I",
          text: "The wood warms under your palm. Whispers name a hidden path behind the vines.",
          choices: [
            { label: "Follow the whisper path", next: "end_soft" },
            { label: "Wait and listen longer", next: "end_wise" },
          ],
        },
        call: {
          chapter: "CHAPTER I",
          text: "Your voice returns as three echoes — one friendly, one frightened, one false.",
          choices: [
            { label: "Trust the friendly echo", next: "end_soft" },
            { label: "Challenge the false echo", next: "end_brave" },
          ],
        },
        end_soft: {
          chapter: "ENDING",
          text: "You slip through a veil of violet leaves and find a quiet village that remembers your name.",
          ending: "Tale complete · Soft Landing",
        },
        end_wise: {
          chapter: "ENDING",
          text: "Patience reveals a map of starlight. Eldoria opens only for those who do not rush.",
          ending: "Tale complete · Patient Path",
        },
        end_brave: {
          chapter: "ENDING",
          text: "The false echo scatters. A true guide steps forward and offers you a moon-key.",
          ending: "Tale complete · Brave Echo",
        },
      },
    },
    {
      id: "ancients",
      theme: "teal",
      sigil: "🌿",
      art: "🌳",
      title: "Whispers of the Ancients",
      blurb: "Answer the call of forgotten magic.",
      nodes: {
        start: {
          chapter: "CHAPTER I",
          text: "Teal runes climb an ancient trunk. The air tastes like rain and old songs.",
          choices: [
            { label: "Sing back to the runes", next: "sing" },
            { label: "Offer a drop of river water", next: "water" },
          ],
        },
        sing: {
          chapter: "CHAPTER I",
          text: "The bark peels into a doorway of living light. A chorus of leaves asks what you seek.",
          choices: [
            { label: "Ask for courage", next: "end_courage" },
            { label: "Ask for memory", next: "end_memory" },
          ],
        },
        water: {
          chapter: "CHAPTER I",
          text: "The roots drink gratefully. A spirit of moss rises and offers two gifts.",
          choices: [
            { label: "Take the seed of calm", next: "end_memory" },
            { label: "Take the seed of daring", next: "end_courage" },
          ],
        },
        end_courage: {
          chapter: "ENDING",
          text: "You leave with a bright pulse in your chest — ready for the next door.",
          ending: "Tale complete · Living Courage",
        },
        end_memory: {
          chapter: "ENDING",
          text: "Old names return softly. You remember a promise you made to the forest long ago.",
          ending: "Tale complete · Remembered Promise",
        },
      },
    },
    {
      id: "aurelian",
      theme: "gold",
      sigil: "☀",
      art: "🛡",
      title: "Rise of the Aurelian Order",
      blurb: "Lead heroes and forge a new legend.",
      nodes: {
        start: {
          chapter: "CHAPTER I",
          text: "Golden light spills from a shield-door. Two knights argue — honor versus mercy.",
          choices: [
            { label: "Side with honor", next: "honor" },
            { label: "Side with mercy", next: "mercy" },
          ],
        },
        honor: {
          chapter: "CHAPTER I",
          text: "The hall falls quiet. Honor asks you to carry the sun-banner into dawn.",
          choices: [
            { label: "Raise the banner", next: "end_legend" },
            { label: "Share the banner with both knights", next: "end_unity" },
          ],
        },
        mercy: {
          chapter: "CHAPTER I",
          text: "Mercy softens the room. A wounded traveler needs escort through the gate.",
          choices: [
            { label: "Escort them yourself", next: "end_unity" },
            { label: "Send the kinder knight", next: "end_legend" },
          ],
        },
        end_legend: {
          chapter: "ENDING",
          text: "Your choice becomes a song in the Order’s hall — a legend with your footsteps in it.",
          ending: "Tale complete · New Legend",
        },
        end_unity: {
          chapter: "ENDING",
          text: "Honor and mercy walk together. The Aurelian dawn feels warmer for it.",
          ending: "Tale complete · United Dawn",
        },
      },
    },
  ];

  let gems = 2450;
  let gold = 18760;
  let completed = new Set();
  let activeTale = null;
  let nodeId = "start";

  function paintDoors() {
    doorsEl.innerHTML = "";
    tales.forEach((tale) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `door ${tale.theme}`;
      btn.innerHTML = `
        <div class="arch">
          <div class="sigil">${tale.sigil}</div>
          <div class="portal-art">${tale.art}</div>
          <span class="banner">${tale.title}</span>
          <p class="blurb">${tale.blurb}</p>
        </div>`;
      btn.addEventListener("click", () => openTale(tale));
      doorsEl.appendChild(btn);
    });
  }

  function openTale(tale) {
    activeTale = tale;
    nodeId = "start";
    doorsView.classList.add("hidden");
    storyView.classList.remove("hidden");
    renderNode();
  }

  function renderNode() {
    const node = activeTale.nodes[nodeId];
    chapterLabel.textContent = node.chapter;
    storyTitle.textContent = activeTale.title;
    passage.textContent = node.text;
    choicesEl.innerHTML = "";

    if (node.ending) {
      const end = document.createElement("div");
      end.className = "ending";
      end.textContent = node.ending;
      choicesEl.appendChild(end);

      if (!completed.has(activeTale.id)) {
        completed.add(activeTale.id);
        gems += 25;
        gold += 120;
        gemsEl.textContent = String(gems);
        goldEl.textContent = String(gold);
        storiesDone.textContent = String(completed.size);
      }

      const again = document.createElement("button");
      again.type = "button";
      again.className = "choice";
      again.textContent = "Return to the hall";
      again.addEventListener("click", showHall);
      choicesEl.appendChild(again);
      return;
    }

    node.choices.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "choice";
      b.textContent = c.label;
      b.addEventListener("click", () => {
        nodeId = c.next;
        renderNode();
      });
      choicesEl.appendChild(b);
    });
  }

  function showHall() {
    activeTale = null;
    storyView.classList.add("hidden");
    doorsView.classList.remove("hidden");
  }

  backBtn.addEventListener("click", showHall);
  paintDoors();
})();
