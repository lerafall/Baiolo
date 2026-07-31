/* Crimson Path — level data.
 *
 * Levels are declared with a tiny op DSL instead of ASCII art so every gap and
 * ledge height is an exact number we can validate.
 * Tile codes: 0 empty · 1 solid · 2 one-way · 3 thorn (bramble) · 4 crumble · 5 gloom · 6 updraft
 */
(() => {
  "use strict";

  const T = { EMPTY: 0, SOLID: 1, ONEWAY: 2, THORN: 3, CRUMBLE: 4, GLOOM: 5, UPDRAFT: 6 };

  const LEVELS = [
    {
      id: "basket-day",
      name: "Basket Day",
      biome: "moss",
      w: 80,
      h: 20,
      par: 36,
      unlocks: null,
      story: 1,
      ops: [
        ["spawn", 2, 15],
        ["hint", 5, 14, "← → or A · D to run", "Space / W to jump"],

        ["floor", 0, 11, 16],
        ["seedRow", 6, 8, 15],

        ["seedRow", 12, 13, 14],
        ["floor", 14, 24, 16],
        ["wolf", 23, 15],
        ["ledge", 17, 13, 4],
        ["seedRow", 18, 19, 12],

        ["floor", 27, 38, 16],
        ["check", 28, 15],
        ["thorns", 32, 15, 3],
        ["seed", 33, 13],

        ["seedRow", 39, 41, 14],
        ["floor", 42, 52, 16],
        ["wolf", 48, 15],
        ["ledge", 43, 14, 2],
        ["ledge", 46, 12, 3],
        ["petal", 47, 11],

        ["floor", 56, 66, 16],
        ["hint", 57, 15, "Hold jump to fly higher", "Tap it for a short hop"],
        ["thorns", 60, 15, 2],
        ["wolf", 64, 15],
        ["seedRow", 53, 55, 14],

        ["ledge", 68, 14, 3],
        ["seed", 69, 13],
        ["ledge", 72, 12, 3],
        ["floor", 76, 79, 12],
        ["seed", 73, 11],
        ["exit", 78, 11],
      ],
    },

    {
      id: "cloak-lesson",
      name: "Cloak Lesson",
      biome: "moss",
      w: 62,
      h: 30,
      par: 44,
      unlocks: "dash",
      ops: [
        ["spawn", 2, 25],
        ["hint", 5, 24, "Shift / X — cloak dash", "Refill by touching ground or blooms"],

        ["floor", 0, 14, 26],
        ["seedRow", 7, 9, 25],
        ["bloom", 12, 24],

        ["seedRow", 15, 20, 24],
        ["floor", 21, 30, 26],
        ["wolf", 25, 25],
        ["thorns", 27, 25, 2],

        ["plat", 22, 23, 4],
        ["seedRow", 23, 24, 22],
        ["plat", 28, 20, 4],
        ["seed", 29, 19],
        ["plat", 22, 17, 4],
        ["seedRow", 23, 24, 16],
        ["bloom", 26, 16],

        ["ledge", 28, 14, 5],
        ["floor", 34, 44, 14],
        ["wolf", 40, 13],
        ["check", 35, 13],
        ["seedRow", 37, 39, 13],
        ["thorns", 42, 13, 2],

        ["ledge", 45, 12, 3],
        ["ledge", 49, 10, 4],
        ["petal", 51, 9],

        ["ledge", 46, 16, 4],
        ["seedRow", 47, 48, 15],
        ["ledge", 52, 18, 4],
        ["seed", 53, 17],
        ["floor", 56, 61, 18],
        ["bloom", 55, 17],
        ["seedRow", 57, 58, 17],
        ["exit", 59, 17],
      ],
    },

    {
      id: "bramble-bend",
      name: "Bramble Bend",
      biome: "moss",
      w: 96,
      h: 22,
      par: 50,
      unlocks: null,
      ops: [
        ["spawn", 2, 17],
        ["floor", 0, 10, 18],
        ["seedRow", 5, 7, 17],
        ["hint", 3, 16, "Bounce shrooms fling you high", "Crumble stone falls away"],

        ["shroom", 9, 17],
        ["ledge", 13, 13, 3],
        ["seedRow", 13, 15, 12],
        ["crumble", 17, 13, 3],
        ["ledge", 21, 12, 3],
        ["seed", 22, 11],
        ["bloom", 24, 11],

        ["gloom", 11, 27, 20],
        ["floor", 28, 40, 18],
        ["check", 29, 17],
        ["wolf", 34, 17],
        ["wolf", 38, 17],
        ["seedRow", 31, 33, 17],
        ["plat", 35, 15, 4],
        ["seed", 36, 14],

        ["crumble", 42, 17, 2],
        ["crumble", 46, 16, 2],
        ["crumble", 50, 15, 2],
        ["seedRow", 42, 43, 15],
        ["seed", 47, 14],
        ["gloom", 41, 53, 20],

        ["floor", 54, 66, 16],
        ["check", 55, 15],
        ["thorns", 59, 15, 3],
        ["shroom", 63, 15],
        ["wolf", 65, 15],
        ["ledge", 60, 12, 3],
        ["seedRow", 60, 62, 11],
        ["ledge", 64, 9, 4],
        ["petal", 66, 8],

        ["floor", 70, 82, 18],
        ["seedRow", 67, 69, 16],
        ["wolf", 74, 17],
        ["crumble", 77, 17, 3],
        ["thorns", 80, 17, 2],
        ["gloom", 67, 69, 20],

        ["ledge", 84, 16, 3],
        ["seed", 85, 15],
        ["ledge", 88, 14, 3],
        ["floor", 91, 95, 14],
        ["seedRow", 92, 93, 13],
        ["exit", 94, 13],
      ],
    },

    {
      id: "picnic-gap",
      name: "Picnic Gap",
      biome: "moss",
      w: 92,
      h: 24,
      par: 56,
      unlocks: null,
      ops: [
        ["spawn", 2, 19],
        ["floor", 0, 12, 20],
        ["seedRow", 6, 8, 19],
        ["hint", 4, 18, "Dash through a mist wisp", "to burst it and refill your cloak"],
        ["wisp", 15, 17, 3, 1],
        ["bloom", 11, 19],

        ["seedRow", 13, 17, 18],
        ["floor", 18, 28, 20],
        ["thorns", 22, 19, 3],
        ["wisp", 25, 16, 4, 1.2],
        ["ledge", 20, 16, 3],
        ["seedRow", 20, 22, 15],
        ["bloom", 26, 15],

        ["gloom", 29, 39, 22],
        ["mover", 30, 18, 3, "x", 6, 42],
        ["seedRow", 33, 36, 16],
        ["ledge", 37, 17, 3],
        ["seed", 38, 16],

        ["floor", 40, 52, 20],
        ["check", 41, 19],
        ["wolf", 46, 19],
        ["wolf", 50, 19],
        ["thorns", 48, 19, 2],
        ["plat", 43, 16, 4],
        ["seedRow", 44, 45, 15],
        ["wisp", 49, 14, 3, 1.4],
        ["ledge", 47, 12, 4],
        ["petal", 49, 11],

        ["gloom", 53, 63, 22],
        ["mover", 54, 17, 3, "y", 5, 34],
        ["ledge", 58, 15, 3],
        ["seedRow", 58, 60, 14],
        ["bloom", 61, 14],
        ["mover", 61, 19, 3, "x", 5, 50],

        ["floor", 64, 78, 20],
        ["check", 65, 19],
        ["wisp", 70, 16, 5, 1.6],
        ["thorns", 68, 19, 3],
        ["thorns", 74, 19, 3],
        ["seedRow", 71, 73, 17],
        ["shroom", 77, 19],
        ["ledge", 72, 14, 3],
        ["seed", 73, 13],

        ["ledge", 81, 16, 3],
        ["bloom", 82, 15],
        ["ledge", 85, 13, 3],
        ["floor", 88, 91, 13],
        ["seedRow", 89, 90, 12],
        ["gloom", 79, 87, 22],
        ["exit", 90, 12],
      ],
    },

    {
      id: "treewall-hollow",
      name: "Treewall Hollow",
      biome: "cavern",
      w: 60,
      h: 34,
      par: 54,
      unlocks: "wall",
      story: 5,
      ops: [
        ["spawn", 2, 29],
        ["floor", 0, 12, 30],
        ["hint", 4, 28, "Press into a wall while falling", "Jump again to climb the tree"],
        ["seedRow", 6, 8, 29],
        ["bloom", 11, 29],

        ["floor", 13, 20, 30],
        ["block", 13, 18, 13, 27],
        ["block", 18, 18, 18, 29],
        ["seed", 15, 28],
        ["seed", 16, 26],
        ["seed", 15, 24],
        ["seed", 16, 21],
        ["ledge", 19, 17, 5],
        ["check", 20, 16],
        ["seedRow", 21, 22, 16],

        ["ledge", 25, 15, 4],
        ["wolf", 26, 14],
        ["seed", 27, 14],

        ["floor", 29, 42, 16],
        ["thorns", 33, 15, 3],
        ["wisp", 37, 12, 4, 1.3],
        ["seedRow", 30, 32, 15],
        ["bloom", 40, 15],

        ["floor", 43, 49, 16],
        ["block", 44, 6, 44, 13],
        ["block", 48, 6, 48, 13],
        ["seed", 46, 12],
        ["seed", 46, 10],
        ["seed", 46, 7],
        ["ledge", 49, 5, 4],
        ["petal", 51, 4],

        ["ledge", 53, 8, 3],
        ["bloom", 54, 7],
        ["ledge", 56, 11, 3],
        ["floor", 51, 59, 19],
        ["check", 52, 18],
        ["wolf", 56, 18],
        ["seedRow", 53, 55, 18],
        ["exit", 58, 18],
      ],
    },

    {
      id: "wolf-watch",
      name: "Wolf Watch",
      biome: "cavern",
      w: 100,
      h: 24,
      par: 62,
      unlocks: null,
      ops: [
        ["spawn", 2, 19],
        ["floor", 0, 10, 20],
        ["seedRow", 5, 7, 19],
        ["hint", 3, 18, "Stomp wolves from above", "Or dash through them with your cloak"],

        ["gloom", 11, 21, 22],
        ["updraft", 13, 12, 21],
        ["seed", 13, 16],
        ["seed", 13, 13],
        ["ledge", 15, 11, 3],
        ["seedRow", 15, 17, 10],
        ["updraft", 19, 12, 21],
        ["seed", 19, 15],
        ["ledge", 21, 13, 3],
        ["bloom", 22, 12],

        ["floor", 24, 36, 18],
        ["check", 25, 17],
        ["wolf", 30, 17],
        ["thorns", 33, 17, 3],
        ["wisp", 29, 13, 4, 1.4],
        ["plat", 27, 14, 4],
        ["seedRow", 28, 29, 13],

        ["gloom", 37, 51, 22],
        ["mover", 38, 17, 3, "x", 7, 46],
        ["seedRow", 40, 43, 15],
        ["ledge", 45, 16, 3],
        ["updraft", 48, 10, 21],
        ["seed", 48, 14],
        ["seed", 48, 11],
        ["ledge", 49, 9, 3],
        ["petal", 50, 8],

        ["floor", 52, 64, 18],
        ["check", 53, 17],
        ["wolf", 58, 17],
        ["wolf", 62, 17],
        ["thorns", 56, 17, 2],
        ["crumble", 60, 17, 2],
        ["seedRow", 57, 59, 15],
        ["shroom", 63, 17],
        ["ledge", 59, 12, 4],
        ["seedRow", 60, 61, 11],

        ["gloom", 65, 79, 22],
        ["mover", 66, 16, 3, "y", 6, 38],
        ["ledge", 70, 14, 3],
        ["bloom", 71, 13],
        ["seedRow", 70, 72, 13],
        ["mover", 74, 18, 3, "x", 4, 54],
        ["wisp", 76, 13, 3, 1.6],

        ["floor", 80, 92, 18],
        ["check", 81, 17],
        ["thorns", 84, 17, 3],
        ["updraft", 88, 9, 17],
        ["seed", 88, 13],
        ["seed", 88, 10],
        ["ledge", 89, 8, 4],
        ["seedRow", 90, 91, 7],

        ["ledge", 93, 12, 3],
        ["bloom", 94, 11],
        ["ledge", 96, 15, 4],
        ["floor", 96, 99, 18],
        ["seed", 97, 17],
        ["exit", 98, 17],
      ],
    },

    {
      id: "misty-thicket",
      name: "Misty Thicket",
      biome: "cavern",
      w: 104,
      h: 26,
      par: 68,
      unlocks: null,
      ops: [
        ["spawn", 2, 21],
        ["floor", 0, 9, 22],
        ["seedRow", 4, 6, 21],
        ["bloom", 8, 21],

        ["gloom", 10, 30, 24],
        ["ledge", 12, 20, 2],
        ["bloom", 12, 19],
        ["seedRow", 10, 11, 19],
        ["ledge", 17, 19, 2],
        ["bloom", 17, 18],
        ["seedRow", 15, 16, 18],
        ["ledge", 22, 18, 2],
        ["bloom", 22, 17],
        ["seedRow", 20, 21, 17],
        ["ledge", 27, 17, 3],
        ["seed", 28, 16],

        ["floor", 31, 43, 20],
        ["check", 32, 19],
        ["wisp", 36, 16, 4, 1.5],
        ["wisp", 40, 13, 3, 1.8],
        ["thorns", 38, 19, 3],
        ["seedRow", 33, 35, 19],
        ["plat", 36, 15, 4],
        ["seedRow", 37, 38, 14],
        ["ledge", 41, 12, 3],
        ["seed", 42, 11],

        ["block", 44, 6, 44, 21],
        ["block", 49, 10, 49, 21],
        ["floor", 45, 48, 20],
        ["seed", 46, 18],
        ["seed", 47, 15],
        ["bloom", 46, 13],
        ["seed", 47, 11],
        ["ledge", 45, 8, 4],
        ["petal", 47, 7],

        ["ledge", 50, 12, 4],
        ["seedRow", 51, 52, 11],
        ["ledge", 54, 15, 3],
        ["bloom", 55, 14],
        ["ledge", 57, 18, 3],
        ["floor", 60, 72, 20],
        ["check", 61, 19],
        ["wolf", 66, 19],
        ["wolf", 70, 19],
        ["crumble", 63, 19, 3],
        ["thorns", 68, 19, 2],
        ["seedRow", 64, 66, 17],
        ["shroom", 71, 19],
        ["ledge", 66, 14, 4],
        ["seedRow", 67, 68, 13],

        ["gloom", 73, 89, 24],
        ["mover", 74, 18, 3, "x", 6, 52],
        ["ledge", 78, 16, 2],
        ["bloom", 78, 15],
        ["seedRow", 79, 81, 14],
        ["mover", 82, 17, 3, "y", 5, 42],
        ["ledge", 86, 15, 3],
        ["bloom", 87, 14],
        ["seedRow", 86, 88, 13],

        ["floor", 90, 103, 18],
        ["check", 91, 17],
        ["thorns", 94, 17, 3],
        ["wisp", 97, 13, 4, 1.7],
        ["seedRow", 95, 97, 15],
        ["ledge", 98, 14, 3],
        ["seed", 99, 13],
        ["ledge", 100, 11, 3],
        ["seedRow", 100, 101, 10],
        ["exit", 102, 17],
      ],
    },

    {
      id: "crumble-bridge",
      name: "Crumble Bridge",
      biome: "sky",
      w: 56,
      h: 38,
      par: 60,
      unlocks: null,
      story: 8,
      ops: [
        ["spawn", 3, 33],
        ["floor", 0, 12, 34],
        ["seedRow", 6, 8, 33],
        ["hint", 4, 32, "The path only goes up", "Shrooms, vents and bridges — chain them"],
        ["shroom", 11, 33],

        ["ledge", 14, 29, 4],
        ["seedRow", 15, 16, 28],
        ["wolf", 16, 28],
        ["plat", 19, 26, 4],
        ["seed", 20, 25],
        ["ledge", 23, 24, 3],
        ["bloom", 24, 23],

        ["updraft", 27, 14, 33],
        ["seed", 27, 30],
        ["seed", 27, 26],
        ["seed", 27, 22],
        ["seed", 27, 18],
        ["ledge", 29, 22, 3],
        ["check", 30, 21],
        ["seedRow", 29, 31, 21],

        ["ledge", 33, 20, 3],
        ["wisp", 36, 18, 4, 1.4],
        ["ledge", 37, 18, 3],
        ["bloom", 38, 17],
        ["crumble", 41, 17, 3],
        ["seedRow", 41, 43, 16],
        ["ledge", 45, 16, 4],
        ["petal", 47, 15],

        ["ledge", 40, 13, 3],
        ["seed", 41, 12],
        ["mover", 34, 12, 3, "x", 5, 44],
        ["ledge", 30, 11, 4],
        ["check", 31, 10],
        ["seedRow", 32, 33, 10],
        ["shroom", 30, 10],

        ["ledge", 26, 7, 4],
        ["seedRow", 27, 28, 6],
        ["wisp", 23, 5, 3, 1.6],
        ["ledge", 20, 5, 4],
        ["bloom", 21, 4],
        ["mover", 15, 5, 3, "y", 4, 36],
        ["ledge", 9, 4, 5],
        ["seedRow", 10, 12, 3],
        ["exit", 11, 3],
      ],
    },

    {
      id: "lantern-lane",
      name: "Lantern Lane",
      biome: "sky",
      w: 108,
      h: 26,
      par: 72,
      unlocks: null,
      ops: [
        ["spawn", 2, 21],
        ["floor", 0, 10, 22],
        ["seedRow", 5, 7, 21],
        ["bloom", 9, 21],

        ["ledge", 14, 21, 3],
        ["seedRow", 11, 13, 19],
        ["bloom", 15, 20],
        ["ledge", 20, 20, 3],
        ["seedRow", 17, 19, 18],
        ["shroom", 22, 19],
        ["ledge", 25, 14, 4],
        ["seedRow", 26, 27, 13],
        ["bloom", 28, 13],

        ["ledge", 32, 15, 3],
        ["wisp", 35, 12, 4, 1.6],
        ["ledge", 36, 16, 3],
        ["seed", 37, 15],
        ["floor", 40, 52, 18],
        ["check", 41, 17],
        ["wolf", 46, 17],
        ["wolf", 50, 17],
        ["thorns", 44, 17, 3],
        ["crumble", 48, 17, 2],
        ["seedRow", 45, 47, 15],
        ["plat", 43, 13, 4],
        ["seedRow", 44, 45, 12],
        ["ledge", 49, 11, 4],
        ["petal", 51, 10],

        ["mover", 54, 17, 3, "x", 8, 56],
        ["seedRow", 56, 59, 14],
        ["ledge", 64, 16, 3],
        ["bloom", 65, 15],
        ["updraft", 68, 8, 24],
        ["seed", 68, 14],
        ["seed", 68, 11],
        ["ledge", 70, 10, 3],
        ["seedRow", 70, 72, 9],
        ["bloom", 73, 9],

        ["ledge", 76, 12, 3],
        ["wisp", 79, 14, 5, 1.8],
        ["ledge", 80, 14, 3],
        ["seedRow", 80, 82, 13],
        ["mover", 84, 15, 3, "y", 6, 44],
        ["ledge", 88, 13, 3],
        ["bloom", 89, 12],

        ["floor", 92, 107, 16],
        ["check", 93, 15],
        ["thorns", 96, 15, 3],
        ["wolf", 100, 15],
        ["wisp", 103, 11, 4, 2],
        ["seedRow", 97, 99, 13],
        ["shroom", 102, 15],
        ["ledge", 99, 10, 4],
        ["seedRow", 100, 101, 9],
        ["ledge", 104, 12, 4],
        ["seed", 105, 11],
        ["exit", 106, 15],
      ],
    },

    {
      id: "wolf-at-the-door",
      name: "Wolf at the Door",
      biome: "sky",
      w: 120,
      h: 24,
      par: 78,
      chase: { start: -14, speed: 52, ramp: 0.16 },
      story: 10,
      ops: [
        ["spawn", 2, 19],
        ["hint", 4, 18, "The wolf is coming. Don't look back.", "Blooms keep your cloak charged — run."],
        ["floor", 0, 14, 20],
        ["seedRow", 6, 9, 19],
        ["bloom", 13, 19],

        ["ledge", 18, 19, 3],
        ["seedRow", 15, 17, 17],
        ["bloom", 19, 18],
        ["ledge", 24, 18, 3],
        ["seedRow", 21, 23, 16],
        ["shroom", 26, 17],
        ["ledge", 29, 13, 4],
        ["seedRow", 30, 31, 12],
        ["bloom", 32, 12],

        ["floor", 36, 48, 18],
        ["thorns", 40, 17, 3],
        ["wolf", 45, 17],
        ["seedRow", 37, 39, 17],
        ["plat", 40, 14, 4],
        ["seedRow", 41, 42, 13],
        ["wisp", 44, 13, 4, 1.8],
        ["bloom", 47, 17],

        ["mover", 50, 17, 3, "x", 6, 62],
        ["seedRow", 52, 55, 15],
        ["ledge", 58, 16, 3],
        ["bloom", 59, 15],
        ["updraft", 62, 8, 22],
        ["seed", 62, 14],
        ["seed", 62, 11],
        ["ledge", 64, 10, 4],
        ["seedRow", 64, 66, 9],
        ["bloom", 67, 9],

        ["ledge", 70, 12, 3],
        ["crumble", 74, 13, 3],
        ["seedRow", 74, 76, 12],
        ["ledge", 78, 14, 3],
        ["bloom", 79, 13],
        ["wisp", 82, 12, 4, 2],
        ["ledge", 83, 15, 3],
        ["seedRow", 83, 85, 14],

        ["floor", 87, 99, 18],
        ["wolf", 92, 17],
        ["wolf", 96, 17],
        ["thorns", 94, 17, 2],
        ["seedRow", 88, 90, 17],
        ["bloom", 98, 17],
        ["ledge", 92, 13, 4],
        ["petal", 94, 12],

        ["mover", 101, 16, 3, "x", 5, 66],
        ["seedRow", 103, 105, 14],
        ["ledge", 108, 15, 3],
        ["bloom", 109, 14],
        ["shroom", 110, 14],
        ["ledge", 113, 10, 4],
        ["seedRow", 113, 115, 9],
        ["floor", 117, 119, 12],
        ["exit", 118, 11],
      ],
    },
  ];

  /* ---------------------------------------------------------------- builder */

  function buildLevel(def) {
    const { w, h } = def;
    const tiles = new Uint8Array(w * h);
    const entities = [];
    let spawn = { x: 2, y: h - 4 };
    let exit = { x: w - 3, y: h - 4 };

    const set = (x, y, v) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      tiles[y * w + x] = v;
    };

    for (const op of def.ops) {
      const kind = op[0];
      switch (kind) {
        case "floor": {
          const [, x0, x1, y] = op;
          for (let x = x0; x <= x1; x++) for (let yy = y; yy < h; yy++) set(x, yy, T.SOLID);
          break;
        }
        case "block": {
          const [, x0, y0, x1, y1] = op;
          for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) set(x, y, T.SOLID);
          break;
        }
        case "ledge": {
          const [, x, y, len, thick = 2] = op;
          for (let i = 0; i < len; i++) for (let t = 0; t < thick; t++) set(x + i, y + t, T.SOLID);
          break;
        }
        case "plat": {
          const [, x, y, len] = op;
          for (let i = 0; i < len; i++) set(x + i, y, T.ONEWAY);
          break;
        }
        case "thorns": {
          const [, x, y, len] = op;
          for (let i = 0; i < len; i++) set(x + i, y, T.THORN);
          break;
        }
        case "crumble": {
          const [, x, y, len] = op;
          for (let i = 0; i < len; i++) set(x + i, y, T.CRUMBLE);
          break;
        }
        case "gloom": {
          const [, x0, x1, y] = op;
          for (let x = x0; x <= x1; x++) for (let yy = y; yy < h; yy++) set(x, yy, T.GLOOM);
          break;
        }
        case "updraft": {
          const [, x, y0, y1] = op;
          for (let y = y0; y <= y1; y++) if (!tiles[y * w + x]) set(x, y, T.UPDRAFT);
          break;
        }
        case "spawn":
          spawn = { x: op[1], y: op[2] };
          break;
        case "exit":
          exit = { x: op[1], y: op[2] };
          break;
        case "seed":
          entities.push({ type: "seed", x: op[1], y: op[2] });
          break;
        case "seedRow": {
          const [, x0, x1, y] = op;
          for (let x = x0; x <= x1; x++) entities.push({ type: "seed", x, y });
          break;
        }
        case "petal":
          entities.push({ type: "petal", x: op[1], y: op[2] });
          break;
        case "bloom":
          entities.push({ type: "bloom", x: op[1], y: op[2] });
          break;
        case "shroom":
          entities.push({ type: "shroom", x: op[1], y: op[2] });
          break;
        case "check":
          entities.push({ type: "check", x: op[1], y: op[2] });
          break;
        case "bug":
        case "wolf":
          entities.push({ type: "wolf", x: op[1], y: op[2] });
          break;
        case "wisp":
          entities.push({ type: "wisp", x: op[1], y: op[2], amp: op[3] ?? 3, speed: op[4] ?? 1.3 });
          break;
        case "mover":
          entities.push({
            type: "mover",
            x: op[1],
            y: op[2],
            len: op[3],
            axis: op[4],
            dist: op[5],
            speed: op[6],
          });
          break;
        case "hint":
          entities.push({ type: "hint", x: op[1], y: op[2], lines: op.slice(3) });
          break;
        default:
          break;
      }
    }

    const seedTotal = entities.filter((e) => e.type === "seed").length;
    return { def, w, h, tiles, entities, spawn, exit, seedTotal };
  }

  const api = { LEVELS, buildLevel, T };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.CrimsonLevels = api;
})();
