import type { Project } from "@/lib/types";

export const projects: Project[] = [
  {
    id: "cloud-hopper",
    title: "Cloud Hopper",
    tagline: "Jump soft clouds. Catch sun coins.",
    description:
      "A tiny platformer where you bounce across pastel clouds and collect sunny coins. Made to test jump feel in one evening.",
    category: "game",
    tags: ["platformer", "cozy", "mobile"],
    creator: "Maya",
    thumbnail: "linear-gradient(145deg, #a78bfa 0%, #2dd4bf 55%, #fbbf24 100%)",
    cover: "linear-gradient(160deg, #c4b5fd 0%, #5eead4 50%, #fde68a 100%)",
    playUrl: "#play",
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
      "A gentle countdown with soft chimes. Built to see if people want a calmer timer than the usual loud ones.",
    category: "tool",
    tags: ["focus", "utility", "calm"],
    creator: "Leo",
    thumbnail: "linear-gradient(145deg, #2dd4bf 0%, #67e8f9 50%, #e0cfff 100%)",
    cover: "linear-gradient(160deg, #99f6e4 0%, #a5f3fc 50%, #ddd6fe 100%)",
    playUrl: "#play",
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
      "Three mysterious doors open short branching stories. An experiment in playful narrative choices.",
    category: "experiment",
    tags: ["story", "choice", "fantasy"],
    creator: "Nova",
    thumbnail: "linear-gradient(145deg, #8b5cf6 0%, #ff6b4a 60%, #fbbf24 100%)",
    cover: "linear-gradient(160deg, #c4b5fd 0%, #fda4af 55%, #fde68a 100%)",
    playUrl: "#play",
    plays: 643,
    reactions: { fun: 210, interesting: 240, "would-use-again": 120 },
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
    thumbnail: "linear-gradient(145deg, #ff6b4a 0%, #fbbf24 45%, #2dd4bf 100%)",
    cover: "linear-gradient(160deg, #fda4af 0%, #fde68a 50%, #99f6e4 100%)",
    playUrl: "#play",
    plays: 411,
    reactions: { fun: 180, interesting: 95, "would-use-again": 88 },
    ownerId: "kai",
  },
  {
    id: "petal-puzzle",
    title: "Petal Puzzle",
    tagline: "Arrange flowers. Calm your brain.",
    description:
      "Slide soft petals into place. A peaceful mini-puzzle to test slow, satisfying motion.",
    category: "game",
    tags: ["puzzle", "calm", "cozy"],
    creator: "Maya",
    thumbnail: "linear-gradient(145deg, #f9a8d4 0%, #c4b5fd 50%, #99f6e4 100%)",
    cover: "linear-gradient(160deg, #fbcfe8 0%, #ddd6fe 50%, #a7f3d0 100%)",
    playUrl: "#play",
    plays: 520,
    reactions: { fun: 150, interesting: 130, "would-use-again": 160 },
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
