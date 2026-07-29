import { NextResponse } from "next/server";
import {
  buildFromDescription,
  continueBuildChat,
  normalizeAiBuildFiles,
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
export const maxDuration = 90;

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

function errorCode(err: unknown) {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg.slice(0, 180);
  }
  return "build_failed";
}

export async function GET(request: Request) {
  try {
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

    const resolvedPlan = await resolveUserPlan({
      userId: user.id,
      email: user.email ?? null,
    });
    const summary = await getAiUsageSummary(user.id, resolvedPlan);
    return NextResponse.json({
      quota: {
        plan: summary.plan,
        used: summary.generationsUsed,
        limit: summary.generationsLimit,
        remaining: summary.generationsRemaining,
      },
    });
  } catch (err) {
    console.error("[baiolo-ai] quota_get_failed", { code: errorCode(err) });
    return NextResponse.json(
      {
        quota: {
          plan: "free",
          used: 0,
          limit: aiBuildLimit("free"),
          remaining: aiBuildLimit("free"),
        },
      },
      { status: 200 },
    );
  }
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
  /** Current editor files — used to repair/refine instead of blind rebuild */
  files?: Record<string, string> | null;
};

export async function POST(request: Request) {
  try {
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
    const existingFiles = normalizeAiBuildFiles(body.files ?? undefined);
    const action = body.action === "build" ? "build" : "chat";
    const locale = body.locale === "pl" ? "pl" : "en";
    const plan = await resolveUserPlan({
      userId,
      email,
      explicit: body.plan ?? null,
    });
    const mode =
      body.mode === "regenerate" || existingFiles
        ? "regenerate"
        : "new_project";

    let usageGate: Awaited<ReturnType<typeof canUseAiGeneration>> | null = null;
    if (userId && isSupabaseConfigured()) {
      try {
        usageGate = await canUseAiGeneration(userId, plan, mode);
      } catch (err) {
        // Missing schema / table should not hard-crash AI — log and continue.
        console.error("[baiolo-ai] usage_gate_failed", { code: errorCode(err) });
        usageGate = null;
      }
    }

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
      const turn = await continueBuildChat({
        prompt,
        messages,
        locale,
        existingFiles,
      });
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
        existingFiles,
      });
      const charge = shouldChargeAiGeneration({
        configured: true,
        producedBuild: Boolean(result.files?.["index.html"]),
      });
      let generationsUsed = usageGate?.summary.generationsUsed ?? 0;
      if (charge && userId && isSupabaseConfigured()) {
        try {
          const incremented = await incrementAiUsage(userId);
          generationsUsed = incremented.generationsUsed;
        } catch (err) {
          console.error("[baiolo-ai] usage_increment_failed", {
            code: errorCode(err),
          });
        }
      }
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
          used: generationsUsed,
          limit: aiBuildLimit(plan),
          remaining: Math.max(0, aiBuildLimit(plan) - generationsUsed),
        },
      });
    }

    const result = await buildFromDescription(prompt, messages, {
      categoryHint: body.categoryHint,
      locale,
      existingFiles,
    });
    const charge = shouldChargeAiGeneration({
      configured: true,
      producedBuild: Boolean(result.files?.["index.html"]),
    });
    let generationsUsed = usageGate?.summary.generationsUsed ?? 0;
    if (charge && userId && isSupabaseConfigured()) {
      try {
        const incremented = await incrementAiUsage(userId);
        generationsUsed = incremented.generationsUsed;
      } catch (err) {
        console.error("[baiolo-ai] usage_increment_failed", {
          code: errorCode(err),
        });
      }
    }
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
        used: generationsUsed,
        limit: aiBuildLimit(plan),
        remaining: Math.max(0, aiBuildLimit(plan) - generationsUsed),
      },
    });
  } catch (err) {
    const code = errorCode(err);
    console.error("[baiolo-ai] build_failed", { code });
    if (
      code === "missing_llm_key" ||
      code === "missing_openai_key" ||
      code.includes("llm_http_401") ||
      code.includes("llm_http_403")
    ) {
      return NextResponse.json(
        { error: AI_UNAVAILABLE_PUBLIC, code: "ai_unavailable" },
        { status: 503 },
      );
    }
    if (code.includes("llm_http_402") || code.includes("llm_http_429")) {
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
        detail: code.slice(0, 120),
      },
      { status: 502 },
    );
  }
}
