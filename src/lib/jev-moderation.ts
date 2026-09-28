import type { RiskLevel } from "@/lib/moderation";
import { mockAiPrecheck } from "@/lib/ai-precheck";
import {
  askJev,
  noulValue,
  resolveJevConfig,
  type JevConfig,
  type JevQuestion,
  type JevResult,
} from "@/lib/jev";

/**
 * off    — keyword mock only (default).
 * shadow — mock decides; Jev's verdict is recorded next to it for admins to compare.
 * on     — Jev decides; mock is the fallback when Jev is unreachable.
 */
export type JevModerationMode = "off" | "shadow" | "on";

export function jevModerationMode(): JevModerationMode {
  const raw = (process.env.JEV_MODERATION ?? "").trim().toLowerCase();
  if (raw === "shadow" || raw === "on") return raw;
  return "off";
}

type PrecheckInput = { title: string; description: string; sourceLabel: string };
export type Precheck = { risk: RiskLevel; flags: string[] };

const LANGUAGE_NOTE =
  "The project text may be written in Polish or English. Judge only what the text says or clearly implies.";

/** One atomic yes/no question per concern; `flag` is what admins see. */
export const JEV_MODERATION_QUESTIONS: Record<
  string,
  { flag: string; question: JevQuestion }
> = {
  sexual: {
    flag: "Sexual or adult content",
    question: {
      type: "noul",
      instructions: `Does this project describe sexual, pornographic or adults-only content? ${LANGUAGE_NOTE}`,
    },
  },
  gore: {
    flag: "Graphic violence or gore",
    question: {
      type: "noul",
      instructions: `Does this project focus on graphic violence, gore or cruelty (beyond cartoon-style action like jumping on enemies)? ${LANGUAGE_NOTE}`,
    },
  },
  hate: {
    flag: "Hate or harassment",
    question: {
      type: "noul",
      instructions: `Does this project promote hate, harassment or mockery of a group or a real person? ${LANGUAGE_NOTE}`,
    },
  },
  scam: {
    flag: "Possible phishing or scam",
    question: {
      type: "noul",
      instructions: `Does this project look like phishing, a scam, or a page that asks for passwords, card numbers or other personal data? ${LANGUAGE_NOTE}`,
    },
  },
  spam: {
    flag: "Looks like spam or advertising",
    question: {
      type: "noul",
      instructions: `Is this project mainly spam, an advertisement or a link farm rather than a playable prototype, tool or game? ${LANGUAGE_NOTE}`,
    },
  },
};

export const JEV_FLAG_AT = 0.5;
export const JEV_HIGH_AT = 0.8;

/** Turn Jev's answers into the same risk / flags shape the pipeline already uses. */
export function precheckFromJev(result: JevResult): Precheck {
  const flags: string[] = [];
  let strong = 0;
  for (const [key, { flag }] of Object.entries(JEV_MODERATION_QUESTIONS)) {
    const p = noulValue(result.answers[key]);
    if (p === null || p < JEV_FLAG_AT) continue;
    if (p >= JEV_HIGH_AT) strong += 1;
    flags.push(`${flag} (${Math.round(p * 100)}%)`);
  }
  if (strong > 0 || flags.length >= 2) return { risk: "high", flags };
  if (flags.length === 1) return { risk: "medium", flags };
  return { risk: "low", flags };
}

export type ModerationPrecheck = Precheck & {
  /** Human-readable note for the pipeline stage. */
  source: "mock" | "jev" | "mock_fallback";
  jevModel?: string;
  /** Shadow mode only: Jev's verdict, stored for admins, never shown to creators. */
  shadowNote?: string;
};

export async function runModerationPrecheck(
  input: PrecheckInput,
  deps: {
    mode?: JevModerationMode;
    config?: JevConfig | null;
    ask?: typeof askJev;
  } = {},
): Promise<ModerationPrecheck> {
  const mock = mockAiPrecheck(input);
  const mode = deps.mode ?? jevModerationMode();
  const config = deps.config !== undefined ? deps.config : resolveJevConfig();
  if (mode === "off" || !config) return { ...mock, source: "mock" };

  const ask = deps.ask ?? askJev;
  const questions = Object.fromEntries(
    Object.entries(JEV_MODERATION_QUESTIONS).map(([k, v]) => [k, v.question]),
  );

  let jev: Precheck;
  let jevModel: string;
  try {
    const result = await ask(
      {
        title: input.title.slice(0, 200),
        description: input.description.slice(0, 4000),
        source: input.sourceLabel.slice(0, 300),
      },
      questions,
      { config, timeoutMs: 5000 },
    );
    jev = precheckFromJev(result);
    jevModel = result.model;
  } catch (err) {
    const reason = err instanceof Error ? err.message : "jev_failed";
    console.warn(`[jev-moderation] ${mode}: ${reason}`);
    if (mode === "shadow") return { ...mock, source: "mock" };
    return {
      ...mock,
      flags: [...mock.flags, "Jev unavailable — used keyword check"],
      source: "mock_fallback",
    };
  }

  console.info(
    `[jev-moderation] ${mode} model=${jevModel} jev=${jev.risk} mock=${mock.risk}`,
  );

  if (mode === "on") return { ...jev, source: "jev", jevModel };

  // Shadow: keep the mock's decision; admins see Jev's verdict next to it.
  const shadowNote =
    jev.flags.length > 0
      ? `Jev (shadow): ${jev.risk} — ${jev.flags.join("; ")}`
      : `Jev (shadow): ${jev.risk} — no flags`;
  return { ...mock, source: "mock", jevModel, shadowNote };
}
