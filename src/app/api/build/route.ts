import { NextResponse } from "next/server";
import {
  buildFromDescription,
  continueBuildChat,
  normalizeChatMessages,
  type ChatMessage,
} from "@/lib/ai-build";
import { isLlmConfigured } from "@/lib/llm";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServer } from "@/lib/supabase/server-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  prompt?: string;
  userId?: string | null;
  email?: string | null;
  /** Conversation so far (assistant/user). */
  messages?: ChatMessage[];
  /** chat = next friendly turn; build = skip more chat and generate. */
  action?: "chat" | "build";
  locale?: string;
};

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

  const messages = normalizeChatMessages(body.messages);
  const action = body.action === "build" ? "build" : "chat";
  const locale = body.locale === "pl" ? "pl" : "en";

  try {
    if (action === "chat") {
      const turn = await continueBuildChat({ prompt, messages, locale });
      if (turn.status === "chat") {
        return NextResponse.json({
          status: "chat",
          message: turn.message,
        });
      }
      // Ready — build immediately after a warm confirmation message.
      const nextMessages: ChatMessage[] = [
        ...messages,
        { role: "assistant", content: turn.message },
      ];
      const result = await buildFromDescription(prompt, nextMessages);
      return NextResponse.json({
        status: "built",
        message: turn.message,
        title: result.title,
        description: result.description,
        category: result.category,
        files: result.files,
        provider: result.provider,
        model: result.model,
        tier: result.tier,
      });
    }

    const result = await buildFromDescription(prompt, messages);
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
