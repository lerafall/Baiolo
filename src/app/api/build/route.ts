import { NextResponse } from "next/server";
import {
  buildFromDescription,
  clarifyBuildPrompt,
  type AiAnswer,
} from "@/lib/ai-build";
import { isLlmConfigured } from "@/lib/llm";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServer } from "@/lib/supabase/server-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  prompt?: string;
  /** Mock-mode identity when Supabase auth isn’t configured. */
  userId?: string | null;
  email?: string | null;
  /** Answers to prior clarification questions. */
  answers?: AiAnswer[];
  /** Skip clarify and build immediately. */
  skipClarify?: boolean;
};

function normalizeAnswers(raw: unknown): AiAnswer[] {
  if (!Array.isArray(raw)) return [];
  const out: AiAnswer[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as AiAnswer;
    const question = typeof row.question === "string" ? row.question.trim() : "";
    const answer = typeof row.answer === "string" ? row.answer.trim() : "";
    if (!question || !answer) continue;
    out.push({
      id: typeof row.id === "string" ? row.id : undefined,
      question: question.slice(0, 200),
      answer: answer.slice(0, 400),
    });
  }
  return out.slice(0, 4);
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (prompt.length < 12) {
    return NextResponse.json(
      { error: "Describe your idea in a bit more detail." },
      { status: 400 },
    );
  }
  if (prompt.length > 2000) {
    return NextResponse.json(
      { error: "Keep the description under 2000 characters." },
      { status: 400 },
    );
  }

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
    if (!user) {
      return NextResponse.json(
        { error: "Sign in to build with AI." },
        { status: 401 },
      );
    }
  } else if (!body.userId && !body.email) {
    return NextResponse.json(
      { error: "Sign in to build with AI." },
      { status: 401 },
    );
  }

  if (!isLlmConfigured()) {
    return NextResponse.json(
      {
        error:
          "AI building isn’t configured yet. Set OPENROUTER_API_KEY or OPENAI_API_KEY (or BUILDER_API_URL) on the server.",
      },
      { status: 503 },
    );
  }

  const answers = normalizeAnswers(body.answers);
  const skipClarify = Boolean(body.skipClarify) || answers.length > 0;

  try {
    if (!skipClarify) {
      const clarify = await clarifyBuildPrompt(prompt);
      if (clarify.status === "clarify") {
        return NextResponse.json({
          status: "clarify",
          questions: clarify.questions,
        });
      }
    }

    const result = await buildFromDescription(prompt, answers);
    return NextResponse.json({
      status: "built",
      title: result.title,
      description: result.description,
      category: result.category,
      files: result.files,
      provider: result.provider,
      model: result.model,
      tier: result.tier,
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "build_failed";
    if (code === "missing_llm_key" || code === "missing_openai_key") {
      return NextResponse.json(
        { error: "AI building isn’t configured yet." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        error:
          "Couldn’t build that right now. Try a simpler description, or try again.",
        detail: code,
      },
      { status: 502 },
    );
  }
}
