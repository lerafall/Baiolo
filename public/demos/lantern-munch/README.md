# Lantern Munch

Fantasy Pac-Man-style maze chase for Baiolo. Collect every spark, dodge spirits, eat a power orb, then clear the maze.

## Art direction

- **Mood:** Magical night courtyards — glowing lantern player, ornate pastel walls, soft particles.
- **Readability:** Paths = dark luminous floor (high contrast vs walls); dots = bright gold pops; enemies = distinct silhouettes + unique hues; power orbs pulse larger than dots.
- **UI:** Glass pills, short level cards, child-friendly D-pad; teach by play.

## Maze rules

- Orthogonal grid only; 1-cell corridors stay readable.
- Walls never use the same hue family as dots or the player glow.
- Ghost house / spawn clearly marked; exits always visible.

## Enemies

| Spirit | Color | Behavior |
|--------|-------|----------|
| Ember | coral | Direct chase (fair speed) |
| Mist | lilac | Aims 2 tiles ahead of player |
| Pebble | mint | Hesitates at junctions; wanders / flees if too close |
| Wisp | cyan | Patrols loop, then short chase bursts |

Frightened mode: all turn soft blue-white, reverse once, slower.

## Power orbs

- 2–4 per maze; ~6s frighten; eating a spirit = combo points + home respawn.

## Levels (6)

1. **Firefly Courtyard** — open, teach collect + one Ember  
2. **Crystal Halls** — corridors, Ember + Mist  
3. **Mushroom Bazaar** — junctions, + Pebble  
4. **Moonwell Ruins** — denser, three spirits  
5. **Aurora Garden** — complex, all four  
6. **Castle of Lanterns** — finale rush  

## Juice

Trail behind lantern · spark collect puffs · frighten transform · wall fairy-lights · level wipe transition.

## Controls

Tap / press a direction to step one tile (hold to keep walking).
Spirits move on their own — collect sparks and dodge them.
←↑↓→ or WASD · touch D-pad · swipe.

## Files

```
public/demos/lantern-munch/
  index.html  styles.css  script.js
  thumb.png   cover.png   README.md
```
