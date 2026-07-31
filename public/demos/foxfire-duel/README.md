# Foxfire Duel

One phone, two thumbs. Put it down between you, each take an edge, and knock the other fox off the island.

## How to zip for Baiolo

Zip the **contents** of this folder so the archive root contains `index.html`, `thumb.png`, and `cover.png` (not a nested parent folder).

## Baiolo metadata

- **Title:** Foxfire Duel
- **Tagline:** One phone, two thumbs, one island.
- **Category:** Game
- **Tags:** versus, local-multiplayer, party, fantasy, mobile

## Controls

Each player has exactly one button, at their end of the screen.

| Input | Action |
| --- | --- |
| Tap | Hop backwards — dodge a lunge, or step away from the edge |
| Hold | Charge an ember bash; you glow brighter and stand still |
| Release | Lunge forward, as hard as you charged |
| Keyboard | **A** for Ember · **L** for Frost |

Your fox always faces the opponent, so one button covers both directions: tapping retreats, charging attacks.

## The rules that make it a duel

- **Scorch** builds with every hit. At 0 you barely move; at 80 the same bash sends you flying. Rounds escalate on their own.
- **Charging is a commitment.** Stand still to charge and you hit harder — but taking a hit mid-charge throws you 1.7× further.
- **Bash meets bash** and both foxes bounce off, so a mirror match is not a stalemate.
- **The island crumbles** after 13 seconds, one strip per side, down to a sliver. Nobody can stall a round out.
- **Boons drift in** mid-round: bigger bash, a second hop, or half knockback taken, for 7 seconds.

## Solo

Three bot levels for playing alone. Against a player who never presses anything, the bot reaches 5 points in roughly 92 seconds on easy, 61 on normal and 42 on hard — the levels differ in reaction delay, aggression and how reliably the bot reads a charge and dodges.

## Files

| File | What it holds |
| --- | --- |
| `art.js` | Palettes, baked parallax, the fox, the island — shared look with Foxfire Hollow |
| `game.js` | Duel rules, physics, the bot, match flow and rendering |

No build step, no dependencies, no image assets. Landscape only — the game asks you to turn the phone, because both players need an edge to hold. `window.Duel` is exposed as a debug handle.
