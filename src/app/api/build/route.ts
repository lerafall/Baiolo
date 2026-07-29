import { NextResponse } from "next/server";
import {
  buildFromDescription,
  continueBuildChat,
  normalizeChatMessages,
  type ChatMessage,
} from "@/lib/ai-build";
import {
  aiBuildLimit,
  resolveAiPlan,
  type AiPlan,
} from "@/lib/ai-quota";
import {
  canUseAiGeneration,
  getAiUsageSummary,
  incrementAiUsage,
} from "@/lib/ai-usage";
import {
  AI_BUILD_FAILED_PUBLIC,
  AI_UNAVAILABLE_PUBLIC,
  gateAiBuildReady,
  shouldChargeAiGeneration,
} from "@/lib/ai-public-errors";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServer } from "@/lib/supabase/server-auth";
import type { ProjectCategory } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

async function resolveUserPlan(options: {
  userId: string | null;
  email: string | null;
  explicit?: AiPlan | null;
}): Promise<AiPlan> {
  let explicit = options.explicit ?? null;
  if (isSupabaseConfigured() && options.userId) {
    const supabase = await createSupabaseServer();
    if (supabase) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", options.userId)
        .maybeSingle();
      explicit = "free";
      if (profile?.plan === "free") explicit = "free";
      else if (
        profile?.plan === "paid" ||
        profile?.plan === "paid_basic" ||
        profile?.plan === "pro"
      )
        explicit = "pro";
      else if (profile?.plan === "paid_pro" || profile?.plan === "studio")
        explicit = "studio";
    }
  }
  return resolveAiPlan({
    userId: options.userId,
    email: options.email,
    explicit,
  });
}

export async function GET(request: Request) {
  let userId: string | null = null;
  let email: string | null = null;

  if (!isSupabaseConfigured()) {
    const url = new URL(request.url);
    const qp = url.searchParams.get("plan");
    const plan: AiPlan =
      qp === "pro" ? "pro" : qp === "studio" ? "studio" : "free";
    return NextResponse.json({
      quota: {
        plan,
        used: 0,
        limit: aiBuildLimit(plan),
        remaining: aiBuildLimit(plan),
      },
    });
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  userId = user.id;
  email = user.email ?? null;

  const resolvedPlan = await resolveUserPlan({ userId, email });
  const summary = await getAiUsageSummary(userId, resolvedPlan);
  return NextResponse.json({
    quota: {
      plan: summary.plan,
      used: summary.generationsUsed,
      limit: summary.generationsLimit,
      remaining: summary.generationsRemaining,
    },
  });
}

type Body = {
  prompt?: string;
  userId?: string | null;
  email?: string | null;
  messages?: ChatMessage[];
  action?: "chat" | "build";
  locale?: string;
  categoryHint?: ProjectCategory | null;
  plan?: AiPlan | null;
  /** new_project = needs free AI slot; regenerate = existing AI build */
  mode?: "new_project" | "regenerate";
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

  let userId = body.userId ?? null;
  let email = body.email ?? null;

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
    userId = user.id;
    email = user.email ?? email;
  } else if (!userId && !email) {
    return NextResponse.json(
      { error: "Sign in to build with AI." },
      { status: 401 },
    );
  }

  const ready = gateAiBuildReady();
  if (!ready.ok) {
    return NextResponse.json(
      { error: ready.error, code: "ai_unavailable" },
      { status: ready.status },
    );
  }

  const messages = normalizeChatMessages(body.messages);
  const action = body.action === "build" ? "build" : "chat";
  const locale = body.locale === "pl" ? "pl" : "en";
  const plan = await resolveUserPlan({
    userId,
    email,
    explicit: body.plan ?? null,
  });
  const mode = body.mode === "regenerate" ? "regenerate" : "new_project";
  const usageGate =
    userId && isSupabaseConfigured()
      ? await canUseAiGeneration(userId, plan, mode)
      : null;
  const quotaPeek =
    userId && isSupabaseConfigured()
      ? {
          plan,
          used: usageGate?.summary.generationsUsed ?? 0,
          limit: usageGate?.summary.generationsLimit ?? aiBuildLimit(plan),
          remaining:
            usageGate?.summary.generationsRemaining ?? aiBuildLimit(plan),
        }
      : {
          plan,
          used: 0,
          limit: aiBuildLimit(plan),
          remaining: aiBuildLimit(plan),
        };

  try {
    if (usageGate && !usageGate.allowed) {
      return NextResponse.json(
        {
          error: usageGate.reason,
          quota: {
            plan,
            used: usageGate.summary.generationsUsed,
            limit: usageGate.summary.generationsLimit,
            remaining: usageGate.summary.generationsRemaining,
          },
        },
        { status: 429 },
      );
    }

    if (action === "chat") {
      const turn = await continueBuildChat({ prompt, messages, locale });
      if (turn.status === "chat") {
        return NextResponse.json({
          status: "chat",
          message: turn.message,
          categoryHint: turn.categoryHint ?? null,
          quota: quotaPeek,
        });
      }

      const nextMessages: ChatMessage[] = [
        ...messages,
        { role: "assistant", content: turn.message },
      ];
      const result = await buildFromDescription(prompt, nextMessages, {
        categoryHint: turn.categoryHint || body.categoryHint,
        locale,
      });
      const charge = shouldChargeAiGeneration({
        configured: true,
        producedBuild: Boolean(result.files?.["index.html"]),
      });
      const incremented =
        charge && userId && isSupabaseConfigured()
          ? await incrementAiUsage(userId)
          : {
              generationsUsed:
                usageGate?.summary.generationsUsed ?? 0,
            };
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
        quota: {
          plan,
          used: incremented.generationsUsed,
          limit: aiBuildLimit(plan),
          remaining: Math.max(0, aiBuildLimit(plan) - incremented.generationsUsed),
        },
      });
    }

    const result = await buildFromDescription(prompt, messages, {
      categoryHint: body.categoryHint,
      locale,
    });
    const charge = shouldChargeAiGeneration({
      configured: true,
      producedBuild: Boolean(result.files?.["index.html"]),
    });
    const incremented =
      charge && userId && isSupabaseConfigured()
        ? await incrementAiUsage(userId)
        : {
            generationsUsed: usageGate?.summary.generationsUsed ?? 0,
          };
    return NextResponse.json({
      status: "built",
      title: result.title,
      description: result.description,
      category: result.category,
      files: result.files,
      provider: result.provider,
      model: result.model,
      tier: result.tier,
      quota: {
        plan,
        used: incremented.generationsUsed,
        limit: aiBuildLimit(plan),
        remaining: Math.max(0, aiBuildLimit(plan) - incremented.generationsUsed),
      },
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "build_failed";
    console.error("[baiolo-ai] build_failed", { code });
    if (code === "missing_llm_key" || code === "missing_openai_key") {
      return NextResponse.json(
        { error: AI_UNAVAILABLE_PUBLIC, code: "ai_unavailable" },
        { status: 503 },
      );
    }
    if (code === "llm_http_401" || code === "llm_http_403") {
      return NextResponse.json(
        { error: AI_UNAVAILABLE_PUBLIC, code: "ai_provider_auth" },
        { status: 503 },
      );
    }
    if (code === "llm_http_402" || code === "llm_http_429") {
      return NextResponse.json(
        {
          error:
            "AI building is busy right now. Please try again in a few minutes.",
          code: "ai_provider_limit",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        error: AI_BUILD_FAILED_PUBLIC,
        code: "ai_build_failed",
      },
      { status: 502 },
    );
  }
}
