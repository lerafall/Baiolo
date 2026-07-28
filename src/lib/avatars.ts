/** Playful Baiolo avatars — faces, kids, animals, and soft vibes. */
export const BAILO_AVATARS = [
  // Smileys / faces
  "😀",
  "😄",
  "🥳",
  "😎",
  "🤩",
  "😇",
  "🤗",
  "😋",
  // Kids / people
  "👦",
  "👧",
  "🧒",
  "👶",
  "🧑",
  "👩",
  "👨",
  "🧔",
  // Animals
  "🐱",
  "🐶",
  "🐰",
  "🐻",
  "🐼",
  "🦊",
  "🐯",
  "🦁",
  "🐸",
  "🦄",
  "🐧",
  "🐥",
  // Soft extras
  "🌸",
  "🌟",
  "🌈",
  "🍀",
  "🎵",
  "🎮",
] as const;

export type BaioloAvatar = (typeof BAILO_AVATARS)[number];

export function isBaioloAvatar(value: string): value is BaioloAvatar {
  return (BAILO_AVATARS as readonly string[]).includes(value);
}

export const DEFAULT_AVATAR: BaioloAvatar = "😄";
