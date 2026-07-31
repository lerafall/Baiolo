# Crimson Path

**A hand-painted precision platformer.** Ten baskets. One wolf. Reach grandmother.

> Part of the [Baiolo](https://baiolo.com) collection — single-ZIP browser games with no dependencies.

---

## Play

Open `index.html` in any modern browser. No server, no install, no build step.

**Controls:**
- Arrow keys / WASD — run
- Space / W / Z / J — jump (hold for height)
- Shift / X / K — cloak dash (8-way)
- Esc / P — pause
- R — restart level

Touch controls appear automatically on mobile.

---

## The Story

Little Red Riding Hood sets out through ten woodland paths to deliver a basket to her grandmother's cottage. Wolves prowl the trails, brambles block the way, and mist wisps drift between the trees. Dash through danger with your enchanted cloak, stomp wolves from above, and light shrines along the way.

---

## Why Come Back

| Goal | How |
|------|-----|
| Gold medals | Beat each level's par time |
| Full basket | Collect every crumb in a level |
| Wildflowers | Find the hidden bloom in each path (10 total) |
| Cloaks | Unlock 5 cloaks with crumbs and wildflowers |
| Clean runs | Zero deaths, gold time, all crumbs |

---

## Extras

1. **Story cards** — fairy-tale narration at key moments (levels 1, 5, 8, 10)
2. **Basket meter** — prominent crumb counter; "Full basket!" on 100% collection
3. **Wolf stomp & dash** — wolves die to stomp OR cloak-dash through them
4. **Grandmother's cottage** — warm-lit exit with fairy-tale win copy
5. **5 cloaks** — Crimson (default), Rose, Midnight, Meadow, Goldstitch

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | Game shell, HUD, cards, touch controls |
| `styles.css` | Warm fairy-tale UI palette, responsive layout |
| `levels.js` | 10 levels in op DSL (`window.CrimsonLevels`) |
| `art.js` | Painted backgrounds, terrain bake, hero sprite (`window.CrimsonArt`) |
| `game.js` | 120 Hz physics engine, entities, audio, UI (`window.Crimson`) |
| `README.md` | This file |

---

## Metadata

| Key | Value |
|-----|-------|
| **Title** | Crimson Path |
| **Slug** | `crimson-path` |
| **Genre** | Precision platformer |
| **Engine** | Vanilla JS, Canvas 2D |
| **Save key** | `baiolo.crimson-path.v1` |
| **Levels** | 10 across 3 biomes |
| **Duration** | 15–40 min first clear |
| **Replayability** | Gold medals, wildflowers, cloaks |

---

## ZIP Instructions

1. Place all files in a folder named `crimson-path/`
2. ZIP the folder
3. Upload to Baiolo as a static game package
4. The entry point is `index.html`

---

*Made with care. No frameworks, no build tools, no external assets — just canvas and code.*
