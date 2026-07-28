import type { RiskLevel } from "@/lib/moderation";

/** Mock AI precheck — keyword heuristics only for demo */
export function mockAiPrecheck(input: {
  title: string;
  description: string;
  sourceLabel: string;
}): { risk: RiskLevel; flags: string[] } {
  const blob =
    `${input.title} ${input.description} ${input.sourceLabel}`.toLowerCase();
  const flags: string[] = [];
  if (/(kill|blood|gore|hate|nsfw|sex)/.test(blob)) {
    flags.push("Possible unsafe words in title or description");
  }
  if (/(weapon|gun|violent)/.test(blob)) {
    flags.push("Possible intense theme");
  }
  if (flags.length >= 2) return { risk: "high", flags };
  if (flags.length === 1) return { risk: "medium", flags };
  return { risk: "low", flags: [] };
}
