import type { Project } from "@/lib/types";
import type { ProjectSubmission } from "@/lib/moderation";
import { projects as catalog } from "@/lib/data/projects";

/** Catalog → published submission shape for seeding Supabase / mock. */
export function catalogToSubmission(p: Project): ProjectSubmission {
  const total =
    p.reactions.fun +
    p.reactions.interesting +
    p.reactions["would-use-again"];
  return {
    id: p.id,
    uploadType: "link",
    sourceLabel: p.playUrl,
    title: p.title,
    description: p.description,
    category: p.category,
    tags: p.tags,
    thumbnail: p.thumbnail,
    status: "published",
    risk: "low",
    aiFlags: [],
    changeRequest: null,
    updatedAt: new Date().toISOString(),
    plays: p.plays,
    reactions: total,
    playUrl: p.playUrl.startsWith("#") ? null : p.playUrl,
  };
}

export function demoSeedSubmissions() {
  return catalog.map(catalogToSubmission);
}
