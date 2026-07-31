import type { Project } from "@/lib/types";

export const projects: Project[] = [
  {
    id: "star-catch",
    title: "Star Catch",
    tagline: "Tap falling stars before they vanish.",
    description:
      "A 30-second arcade loop: catch yellow and teal stars, grab gold ones for bonus points. Built as a Baiolo-ready static demo — open and play in the browser with no install.",
    category: "game",
    tags: ["arcade", "tap", "cozy", "mobile"],
    creator: "Baiolo",
    thumbnail: "/demos/star-catch/thumb.jpg",
    cover: "/demos/star-catch/cover.jpg",
    playUrl: "/demos/star-catch/index.html",
    plays: 42,
    reactions: { fun: 28, interesting: 12, "would-use-again": 19 },
    featured: true,
    ownerId: "baiolo",
  },
  {
    id: "starfall-garden",
    title: "Starfall Garden",
    tagline: "Aim a star. Bounce soft leaves. Bloom the crystal.",
    description:
      "A polished fantasy puzzle-arcade: drag to launch a tiny falling star through floating gardens of mint leaves, soft thorns, portals, and light fragments. Eight short levels teach one idea at a time — then a finale that weaves them together. Built as a Baiolo-ready static demo for browser and mobile.",
    category: "game",
    tags: ["puzzle", "arcade", "fantasy", "cozy", "mobile"],
    creator: "Baiolo",
    thumbnail: "/demos/starfall-garden/thumb.png",
    cover: "/demos/starfall-garden/cover.png",
    playUrl: "/demos/starfall-garden/index.html",
    plays: 18,
    reactions: { fun: 14, interesting: 11, "would-use-again": 12 },
    featured: true,
    ownerId: "baiolo",
  },
  {
    id: "moonlight-bakery",
    title: "Moonlight Bakery",
    tagline: "Bake for forest friends under a soft moon.",
    description:
      "A cozy fantasy micro-management bakery: drag flour and berries, bake glowing pastries, and serve cute night visitors. Eight short bakery days unlock patience meters, a second recipe, a fairy helper, a longer queue, twin ovens, and a Moon Festival finale — Baiolo-ready static demo for browser and mobile.",
    category: "game",
    tags: ["cozy", "management", "fantasy", "mobile", "kids"],
    creator: "Baiolo",
    thumbnail: "/demos/moonlight-bakery/thumb.png",
    cover: "/demos/moonlight-bakery/cover.png",
    playUrl: "/demos/moonlight-bakery/index.html",
    plays: 12,
    reactions: { fun: 10, interesting: 9, "would-use-again": 11 },
    featured: true,
    ownerId: "baiolo",
  },
  {
    id: "fairy-blocks",
    title: "Fairy Blocks",
    tagline: "Classic falling crystals. Four fairy worlds.",
    description:
      "A Tetris-inspired puzzle with premium fairy-tale polish: glowing crystal blocks, ghost piece clarity, combo clears, and four themed boards — Moon Garden, Candy Cloud, Crystal Forest, and Aurora Castle. Eight short stages teach by play, then endless mode. Baiolo-ready static demo for browser and mobile.",
    category: "game",
    tags: ["puzzle", "arcade", "fantasy", "classic", "mobile"],
    creator: "Baiolo",
    thumbnail: "/demos/fairy-blocks/thumb.png",
    cover: "/demos/fairy-blocks/cover.png",
    playUrl: "/demos/fairy-blocks/index.html",
    plays: 8,
    reactions: { fun: 7, interesting: 6, "would-use-again": 7 },
    featured: true,
    ownerId: "baiolo",
  },
  {
    id: "lantern-munch",
    title: "Lantern Munch",
    tagline: "Collect sparks. Dodge spirits. Clear the maze.",
    description:
      "A fantasy Pac-Man-style maze chase: guide a glowing lantern through six themed boards — Firefly Courtyard, Crystal Halls, Mushroom Bazaar, Moonwell Ruins, Aurora Garden, and Castle of Lanterns. Eat power orbs, outwit distinct spirits, and clear every spark. Baiolo-ready static demo for browser and mobile.",
    category: "game",
    tags: ["arcade", "maze", "fantasy", "classic", "mobile"],
    creator: "Baiolo",
    thumbnail: "/demos/lantern-munch/thumb.png",
    cover: "/demos/lantern-munch/cover.png",
    playUrl: "/demos/lantern-munch/index.html",
    plays: 6,
    reactions: { fun: 5, interesting: 5, "would-use-again": 6 },
    featured: true,
    ownerId: "baiolo",
  },
  {
    id: "spark-nest",
    title: "Spark Nest",
    tagline: "Catch sparks. Dodge moths. Nest the night sky.",
    description:
      "A compact arcade catcher for Baiolo: drag your nest, catch falling star-sparks, dodge moths, stack combos through escalating waves, survive Storm Moth spikes, and unlock trail cosmetics with local stars. Fast to learn, sticky to replay.",
    category: "game",
    tags: ["arcade", "catch", "cozy", "mobile"],
    creator: "Baiolo",
    thumbnail: "/demos/spark-nest/thumb.png",
    cover: "/demos/spark-nest/cover.png",
    playUrl: "/demos/spark-nest/index.html",
    plays: 4,
    reactions: { fun: 4, interesting: 3, "would-use-again": 4 },
    featured: true,
    ownerId: "baiolo",
  },
  {
    id: "cloud-hopper",
    title: "Cloud Hopper",
    tagline: "Jump soft clouds. Catch sun coins.",
    description:
      "A tiny platformer where you bounce across pastel clouds and collect sunny coins. Made to test jump feel in one evening.",
    category: "game",
    tags: ["platformer", "cozy", "mobile"],
    creator: "Maya",
    thumbnail: "/demos/cloud-hopper/thumb.png",
    cover: "/demos/cloud-hopper/cover.png",
    playUrl: "/demos/cloud-hopper/index.html",
    plays: 1284,
    reactions: { fun: 420, interesting: 188, "would-use-again": 256 },
    featured: true,
    ownerId: "maya",
  },
  {
    id: "tiny-timer",
    title: "Tiny Timer",
    tagline: "Focus bubbles for short tasks.",
    description:
      "A gentle countdown with soft chimes and floating focus bubbles. Built to see if people want a calmer timer than the usual loud ones. Static Baiolo-ready demo — pick 1–25 minutes and go.",
    category: "tool",
    tags: ["focus", "utility", "calm"],
    creator: "Leo",
    thumbnail: "/demos/tiny-timer/thumb.png",
    cover: "/demos/tiny-timer/cover.png",
    playUrl: "/demos/tiny-timer/index.html",
    plays: 892,
    reactions: { fun: 96, interesting: 310, "would-use-again": 274 },
    featured: true,
    ownerId: "leo",
  },
  {
    id: "story-portal",
    title: "Story Portal",
    tagline: "Pick a door. Grow a tale.",
    description:
      "Three mysterious doors open short branching stories — Shadows of Eldoria, Whispers of the Ancients, and Rise of the Aurelian Order. An experiment in playful narrative choices.",
    category: "experiment",
    tags: ["story", "choice", "fantasy"],
    creator: "Nova",
    thumbnail: "/demos/story-portal/thumb.png",
    cover: "/demos/story-portal/cover.png",
    playUrl: "/demos/story-portal/index.html",
    plays: 643,
    reactions: { fun: 210, interesting: 240, "would-use-again": 120 },
    featured: true,
    ownerId: "nova",
  },
  {
    id: "color-splash",
    title: "Color Splash",
    tagline: "Paint tiles. Match the mood.",
    description:
      "A quick demo that turns taps into colorful tile waves. Testing how joyful color feedback feels on mobile.",
    category: "demo",
    tags: ["art", "color", "mobile"],
    creator: "Kai",
    thumbnail: "/demos/color-splash/thumb.png",
    cover: "/demos/color-splash/cover.png",
    playUrl: "/demos/color-splash/index.html",
    plays: 411,
    reactions: { fun: 180, interesting: 95, "would-use-again": 88 },
    ownerId: "kai",
  },
  {
    id: "petal-puzzle",
    title: "Petal Puzzle",
    tagline: "Arrange flowers. Calm your brain.",
    description:
      "Slide soft petals into place on a gentle 3×3 board. A peaceful mini-puzzle to test slow, satisfying motion — Baiolo-ready static demo with shuffle and bloom.",
    category: "game",
    tags: ["puzzle", "calm", "cozy"],
    creator: "Maya",
    thumbnail: "/demos/petal-puzzle/thumb.png",
    cover: "/demos/petal-puzzle/cover.png",
    playUrl: "/demos/petal-puzzle/index.html",
    plays: 520,
    reactions: { fun: 150, interesting: 130, "would-use-again": 160 },
    featured: true,
    ownerId: "maya",
  },
  {
    id: "idea-jar",
    title: "Idea Jar",
    tagline: "Shake for a random prompt.",
    description:
      "A jar full of tiny creative prompts. Built to spark weekend experiments.",
    category: "tool",
    tags: ["ideas", "utility", "creative"],
    creator: "Sam",
    thumbnail: "linear-gradient(145deg, #fbbf24 0%, #fdba74 40%, #c4b5fd 100%)",
    cover: "linear-gradient(160deg, #fde68a 0%, #fed7aa 50%, #ddd6fe 100%)",
    playUrl: "#play",
    plays: 305,
    reactions: { fun: 88, interesting: 142, "would-use-again": 110 },
    ownerId: "sam",
  },
];

export function getProject(id: string) {
  return projects.find((p) => p.id === id);
}

function tagOverlap(a: string[], b: string[]) {
  const set = new Set(a.map((t) => t.toLowerCase()));
  return b.reduce((n, t) => n + (set.has(t.toLowerCase()) ? 1 : 0), 0);
}

export function getSimilarProjects(
  seed: Project | string,
  pool: Project[] = projects,
  limit = 3,
) {
  const current = typeof seed === "string" ? getProject(seed) : seed;
  if (!current) return pool.slice(0, limit);
  return pool
    .filter((p) => p.id !== current.id)
    .sort((a, b) => {
      const aScore =
        (a.category === current.category ? 2 : 0) +
        tagOverlap(current.tags, a.tags);
      const bScore =
        (b.category === current.category ? 2 : 0) +
        tagOverlap(current.tags, b.tags);
      return bScore - aScore;
    })
    .slice(0, limit);
}

export function allTags(list: Project[] = projects) {
  return Array.from(new Set(list.flatMap((p) => p.tags))).sort();
}

export const categoryLabels: Record<Project["category"], string> = {
  game: "Game",
  tool: "Tool",
  experiment: "Experiment",
  demo: "Demo",
};

export const defaultTagsForCategory: Record<Project["category"], string[]> = {
  game: ["game", "play"],
  tool: ["tool", "utility"],
  experiment: ["experiment"],
  demo: ["demo"],
};

/** Friendly suggestions for the create wizard (beyond category defaults). */
export const suggestedTags = [
  "cozy",
  "mobile",
  "puzzle",
  "calm",
  "creative",
  "utility",
  "story",
  "art",
  "focus",
  "ideas",
] as const;

export function normalizeTag(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 24);
}
