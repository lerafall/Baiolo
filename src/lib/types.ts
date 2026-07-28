export type ProjectCategory = "game" | "tool" | "experiment" | "demo";

export type ReactionKind = "fun" | "interesting" | "would-use-again";

export type Project = {
  id: string;
  title: string;
  tagline: string;
  description: string;
  category: ProjectCategory;
  tags: string[];
  creator: string;
  thumbnail: string;
  cover: string;
  playUrl: string;
  plays: number;
  reactions: Record<ReactionKind, number>;
  featured?: boolean;
  ownerId?: string;
};

export type UserProfile = {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  role: "create" | "explore" | "both";
  interests: string[];
};
