/**
 * Minimal client for TypeSafe's Jev (System One API).
 * Jev answers typed questions (noul / choice / score) with calibrated
 * probabilities — it never generates text. Docs: https://docs.typesafe.ai/api
 */

export type JevNoulQuestion = {
  type: "noul";
  instructions: string;
  criteria?: { true?: string; false?: string };
};

export type JevChoiceQuestion = {
  type: "choice";
  instructions: string;
  criteria: Record<string, string | null>;
};

export type JevScoreQuestion = {
  type: "score";
  instructions: string;
  criteria: string[];
};

export type JevQuestion = JevNoulQuestion | JevChoiceQuestion | JevScoreQuestion;

export type JevNoulAnswer = { type: "noul"; noul: number };
export type JevChoiceAnswer = {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
};
export type JevScoreAnswer = {
  type: "score";
  score: number;
  confidence: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
};
export type JevAnswer = JevNoulAnswer | JevChoiceAnswer | JevScoreAnswer;

export type JevResult = {
  model: string;
  answers: Record<string, JevAnswer>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

export type JevConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

function envTrim(name: string) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export function resolveJevConfig(): JevConfig | null {
  const apiKey = envTrim("TYPESAFE_API_KEY");
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (envTrim("TYPESAFE_BASE_URL") || "https://api.typesafe.ai/v1").replace(
      /\/$/,
      "",
    ),
    model: envTrim("JEV_MODEL") || "jev-latest",
  };
}

export class JevError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "JevError";
  }
}

/** One System One call. Throws JevError on HTTP / network / timeout failures. */
export async function askJev(
  state: string | Record<string, unknown> | unknown[],
  questions: Record<string, JevQuestion>,
  options: { config?: JevConfig | null; timeoutMs?: number } = {},
): Promise<JevResult> {
  const config = options.config ?? resolveJevConfig();
  if (!config) throw new JevError("jev_not_configured");

  let res: Response;
  try {
    res = await fetch(`${config.baseUrl}/systemone`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ state, model: config.model, questions }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 5000),
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    throw new JevError(name === "TimeoutError" ? "jev_timeout" : "jev_network");
  }

  if (!res.ok) throw new JevError(`jev_http_${res.status}`, res.status);

  const data = (await res.json().catch(() => null)) as JevResult | null;
  if (!data || typeof data.answers !== "object" || data.answers === null) {
    throw new JevError("jev_bad_payload");
  }
  return data;
}

/** P(yes) for a noul answer, or null when the answer is missing / malformed. */
export function noulValue(answer: JevAnswer | undefined): number | null {
  if (!answer || answer.type !== "noul") return null;
  return typeof answer.noul === "number" && Number.isFinite(answer.noul)
    ? answer.noul
    : null;
}
