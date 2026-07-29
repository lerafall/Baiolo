import { NextResponse } from "next/server";
import {
  buildFromDescription,
  composeBuildAck,
  continueBuildChat,
  latestUserText,
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
  getAiUsageSummary,
  refundAiGeneration,
  tryConsumeAiGeneration,
} from "@/lib/ai-usage";
import {
  AI_BUILD_FAILED_PUBLIC,
  AI_UNAVAILABLE_PUBLIC,
  gateAiBuildReady,
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
  /** Live preview observation + optional JPEG data URL */
  previewInsight?: {
    summary?: string;
    imageDataUrl?: string;
    hasCanvas?: boolean;
    likelyBlank?: boolean;
  } | null;
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
    const previewInsight =
      body.previewInsight &&
      typeof body.previewInsight.summary === "string" &&
      body.previewInsight.summary.trim()
        ? {
            summary: body.previewInsight.summary.trim().slice(0, 2000),
            imageDataUrl:
              typeof body.previewInsight.imageDataUrl === "string" &&
              body.previewInsight.imageDataUrl.startsWith("data:image/")
                ? body.previewInsight.imageDataUrl.slice(0, 400_000)
                : undefined,
          }
        : null;
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

    async function quotaPayload(used?: number, remaining?: number) {
      if (userId && isSupabaseConfigured()) {
        try {
          const summary = await getAiUsageSummary(userId, plan);
          const u = used ?? summary.generationsUsed;
          return {
            plan,
            used: u,
            limit: summary.generationsLimit,
            remaining:
              remaining ?? Math.max(0, summary.generationsLimit - u),
          };
        } catch {
          /* fall through */
        }
      }
      const limit = aiBuildLimit(plan);
      return {
        plan,
        used: used ?? 0,
        limit,
        remaining: remaining ?? limit,
      };
    }

    // Chat-only clarify turns do not consume a generation.
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
          quota: await quotaPayload(),
        });
      }

      const nextMessages: ChatMessage[] = [
        ...messages,
        { role: "assistant", content: turn.message },
      ];
      return await runReservedBuild({
        prompt,
        messages: nextMessages,
        categoryHint: turn.categoryHint || body.categoryHint,
        ackFallback: turn.message,
      });
    }

    return await runReservedBuild({
      prompt,
      messages,
      categoryHint: body.categoryHint,
      ackFallback: null,
    });

    async function runReservedBuild(opts: {
      prompt: string;
      messages: ChatMessage[];
      categoryHint?: ProjectCategory | null;
      ackFallback: string | null;
    }) {
      let reservedPeriod: string | null = null;
      let generationsUsed = 0;

      if (userId && isSupabaseConfigured()) {
        let consume: Awaited<ReturnType<typeof tryConsumeAiGeneration>>;
        try {
          consume = await tryConsumeAiGeneration(userId, plan, mode);
        } catch (err) {
          console.error("[baiolo-ai] usage_consume_failed", {
            code: errorCode(err),
          });
          return NextResponse.json(
            {
              error:
                "Nie udało się sprawdzić limitu AI. Spróbuj ponownie za chwilę.",
              code: "QUOTA_UNAVAILABLE",
              quota: await quotaPayload(),
            },
            { status: 503 },
          );
        }

        if (!consume.allowed) {
          return NextResponse.json(
            {
              error: consume.reason,
              code: consume.code,
              quota: {
                plan,
                used: consume.generationsUsed,
                limit: consume.summary.generationsLimit,
                remaining: Math.max(
                  0,
                  consume.summary.generationsLimit - consume.generationsUsed,
                ),
              },
            },
            { status: 429 },
          );
        }

        reservedPeriod = consume.periodStart;
        generationsUsed = consume.generationsUsed;
      }

      try {
        const result = await buildFromDescription(opts.prompt, opts.messages, {
          categoryHint: opts.categoryHint,
          locale,
          existingFiles,
          previewInsight,
        });

        if (!result.files?.["index.html"]) {
          if (userId && reservedPeriod) {
            await refundAiGeneration(userId, reservedPeriod);
          }
          return NextResponse.json(
            {
              error: AI_BUILD_FAILED_PUBLIC,
              code: "ai_build_failed",
              quota: await quotaPayload(),
            },
            { status: 502 },
          );
        }

        const limit = aiBuildLimit(plan);
        return NextResponse.json({
          status: "built",
          message:
            result.message ||
            opts.ackFallback ||
            composeBuildAck({
              locale,
              userText: latestUserText(opts.prompt, opts.messages),
              repairing: Boolean(existingFiles),
            }),
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
            limit,
            remaining: Math.max(0, limit - generationsUsed),
          },
        });
      } catch (err) {
        if (userId && reservedPeriod) {
          try {
            await refundAiGeneration(userId, reservedPeriod);
          } catch (refundErr) {
            console.error("[baiolo-ai] usage_refund_failed", {
              code: errorCode(refundErr),
            });
          }
        }
        throw err;
      }
    }

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
