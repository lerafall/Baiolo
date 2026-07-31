# Foxfire Hollow

A hand-painted precision platformer. Run, wall-jump and ember-dash a little fox spirit through ten hollows across three worlds — then chase par times, hidden moonpetals and unlockable coats.

## How to zip for Baiolo

Zip the **contents** of this folder so the archive root contains `index.html`, `thumb.png`, and `cover.png` (not a nested parent folder).

## Baiolo metadata

- **Title:** Foxfire Hollow
- **Tagline:** Ten hollows. One ember. Light them all.
- **Category:** Game
- **Tags:** platformer, precision, fantasy, arcade, mobile

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Run | ← → / A D | D-pad |
| Jump (hold = higher) | Space / W / ↑ / Z | ⤒ button |
| Ember dash (8-way) | Shift / X / K | ✦ button |
| Drop through a vine bridge | ↓ / S | ▼ |
| Pause · restart | Esc · R | ⏸ pill |

## Why come back tomorrow?

Every hollow keeps a best time with a gold/silver/bronze medal, an emberseed count and one well-hidden moonpetal. Emberseeds unlock four fox coats; all ten moonpetals unlock a fifth. Progress lives in `localStorage`.

## Creator note

- **Core loop:** run · variable jump · wall-jump · 8-way ember dash · light the lantern
- **Feel:** 0.10s coyote time, 0.13s jump buffer, instant respawn at lit shrines, no lives
- **Teaching:** the dash arrives in hollow 2 and wall-jumps in hollow 5, each behind a sign and a safe rehearsal space
- **Escalation:** thistlebugs → gloomwisps (dash through them to burst them) → crumbling stone, vents, moving slabs → a chasing wall of gloom in the finale
- **Replay hook:** par times, all-emberseed runs, moonpetal hunting, coat unlocks

## Files

| File | What it holds |
| --- | --- |
| `levels.js` | The ten level definitions, written with a small op DSL so every gap and ledge height is an exact, checkable number |
| `art.js` | Palettes, baked parallax strips, baked level terrain, the fox, ember effects |
| `game.js` | Physics, entities, camera, audio, HUD and screens |

No build step, no dependencies, no external assets — every pixel is drawn with canvas 2D at runtime. `window.Foxfire` is exposed as a small debug handle (state, fox, input, `startLevel`, `step`, `render`).

Anything thrown at boot, during a level load or inside the frame loop surfaces as a readable overlay instead of a blank canvas, and is also left on `window.__foxfireError`.

`index.html?safe=1` renders in flat colours — no gradient-clipped text, translucent panels or shadows. It exists as an escape hatch for devices whose GPU mishandles those effects.

## Promotional art

`promo/` holds key art (1920×1080), a social card (1200×630) and a square card (1080×1080). All of it is rendered by the game's own engine, so the art always matches what the game actually looks like.
