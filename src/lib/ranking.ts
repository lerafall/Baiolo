import type { Project } from "@/lib/types";

export function scoreProject(p: Project) {
  const reactions =
    p.reactions.fun +
    p.reactions.interesting +
    p.reactions["would-use-again"];
  return p.plays * 2 + reactions * 3 + (p.featured ? 40 : 0);
}

export function rankProjects(projects: Project[], limit = 10) {
  return [...projects]
    .sort((a, b) => scoreProject(b) - scoreProject(a))
    .slice(0, limit)
    .map((project, index) => ({
      rank: index + 1,
      score: scoreProject(project),
      project,
    }));
}
