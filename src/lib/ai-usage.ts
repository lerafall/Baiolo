import type { ProjectSubmission } from "@/lib/moderation";
import { PLAN_LIMITS, type UserPlan } from "@/lib/plans.config";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AiUsageSummary = {
  plan: UserPlan;
  periodStart: string;
  nextPeriodStart: string;
  activeAiCount: number;
  activeAiLimit: number;
  generationsUsed: number;
  generationsLimit: number;
  generationsRemaining: number;
  analytics: (typeof PLAN_LIMITS)[UserPlan]["analytics"];
  reviewQueue: (typeof PLAN_LIMITS)[UserPlan]["reviewQueue"];
};

export function startOfCurrentMonth(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

export function nextMonthStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    .toISOString()
    .slice(0, 10);
}

export function sourceTypeFromUploadType(
  uploadType: ProjectSubmission["uploadType"] | null | undefined,
): ProjectSubmission["sourceType"] {
  if (uploadType === "ai") return "ai_build";
  if (uploadType === "zip") return "zip";
  if (uploadType === "link") return "link";
  if (uploadType === "html" || uploadType === "template") return "html_starter";
  return "external";
}

export function isAiSlotActive(submission: Pick<ProjectSubmission, "sourceType" | "aiSlotActive" | "status" | "uploadType">) {
  const sourceType = submission.sourceType || sourceTypeFromUploadType(submission.uploadType);
  if (sourceType !== "ai_build") return false;
  if (typeof submission.aiSlotActive === "boolean") return submission.aiSlotActive;
  return submission.status !== "draft" && submission.status !== "rejected";
}

export function summarizeLocalAiUsage(
  plan: UserPlan,
  items: ProjectSubmission[],
  generationsUsed = 0,
): AiUsageSummary {
  const limits = PLAN_LIMITS[plan];
  const activeAiCount = items.filter(isAiSlotActive).length;
  return {
    plan,
    periodStart: startOfCurrentMonth(),
    nextPeriodStart: nextMonthStart(),
    activeAiCount,
    activeAiLimit: limits.activeAiProjects,
    generationsUsed,
    generationsLimit: limits.aiGenerationsPerMonth,
    generationsRemaining: Math.max(0, limits.aiGenerationsPerMonth - generationsUsed),
    analytics: limits.analytics,
    reviewQueue: limits.reviewQueue,
  };
}

export async function getOrCreateUsage(
  userId: string,
  periodStart: string,
) {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("storage_unavailable");

  const { data: existing, error: existingError } = await supabase
    .from("ai_generation_usage")
    .select("id, generations_used")
    .eq("user_id", userId)
    .eq("period_start", periodStart)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  const { data: inserted, error: insertError } = await supabase
    .from("ai_generation_usage")
    .insert({
      user_id: userId,
      period_start: periodStart,
      generations_used: 0,
    })
    .select("id, generations_used")
    .single();

  if (insertError) {
    const { data: retry, error: retryError } = await supabase
      .from("ai_generation_usage")
      .select("id, generations_used")
      .eq("user_id", userId)
      .eq("period_start", periodStart)
      .maybeSingle();
    if (retryError || !retry) throw retryError || insertError;
    return retry;
  }

  return inserted;
}

export async function incrementAiUsage(userId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("storage_unavailable");
  const periodStart = startOfCurrentMonth();
  const usage = await getOrCreateUsage(userId, periodStart);
  const next = (usage.generations_used ?? 0) + 1;
  const { error } = await supabase
    .from("ai_generation_usage")
    .update({ generations_used: next })
    .eq("id", usage.id);
  if (error) throw error;
  return { periodStart, generationsUsed: next };
}

export type ConsumeAiResult =
  | {
      allowed: true;
      generationsUsed: number;
      periodStart: string;
      summary: AiUsageSummary;
    }
  | {
      allowed: false;
      reason: string;
      code: "LIMIT_EXCEEDED" | "SLOT_LIMIT" | "QUOTA_UNAVAILABLE";
      generationsUsed: number;
      periodStart: string;
      summary: AiUsageSummary;
    };

/**
 * Hard server gate: check slots, then atomically reserve one generation.
 * Call this BEFORE invoking the LLM. Refund on model failure.
 */
export async function tryConsumeAiGeneration(
  userId: string,
  plan: UserPlan,
  mode: "new_project" | "regenerate" = "new_project",
): Promise<ConsumeAiResult> {
  const periodStart = startOfCurrentMonth();
  const summary = await getAiUsageSummary(userId, plan);
  const gate = evaluateAiGate(summary, mode);
  if (!gate.allowed) {
    const slotBlocked =
      /aktywnych projektów AI|AI project limit/i.test(gate.reason) ||
      summary.activeAiCount > summary.activeAiLimit ||
      (mode === "new_project" &&
        summary.activeAiCount >= summary.activeAiLimit);
    return {
      allowed: false,
      reason: gate.reason,
      code: slotBlocked ? "SLOT_LIMIT" : "LIMIT_EXCEEDED",
      generationsUsed: summary.generationsUsed,
      periodStart,
      summary,
    };
  }

  const limit = summary.generationsLimit;
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("storage_unavailable");

  // Atomic FOR UPDATE reservation (requires schema-v7).
  const { data: rpcRows, error: rpcError } = await supabase.rpc(
    "try_consume_ai_generation",
    {
      p_user_id: userId,
      p_period_start: periodStart,
      p_limit: limit,
    },
  );

  if (rpcError) {
    console.error("[baiolo-ai] try_consume_rpc_failed", {
      detail: rpcError.message,
    });
    // Fail closed — never call the model if we cannot reserve a slot safely.
    return {
      allowed: false,
      reason:
        "Nie udało się sprawdzić limitu AI. Uruchom supabase/schema-v7.sql albo spróbuj za chwilę.",
      code: "QUOTA_UNAVAILABLE",
      generationsUsed: summary.generationsUsed,
      periodStart,
      summary,
    };
  }

  const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
  const allowed = Boolean(
    row && (row.allowed === true || row.allowed === "t"),
  );
  const used = Number(row?.used ?? summary.generationsUsed);

  if (!allowed) {
    return {
      allowed: false,
      reason: `Wykorzystano ${used}/${limit} generowań w tym miesiącu. Odnowienie: ${summary.nextPeriodStart}.`,
      code: "LIMIT_EXCEEDED",
      generationsUsed: used,
      periodStart,
      summary: {
        ...summary,
        generationsUsed: used,
        generationsRemaining: Math.max(0, limit - used),
      },
    };
  }

  return {
    allowed: true,
    generationsUsed: used,
    periodStart,
    summary: {
      ...summary,
      generationsUsed: used,
      generationsRemaining: Math.max(0, limit - used),
    },
  };
}

/** Undo a reservation after a failed model call. */
export async function refundAiGeneration(
  userId: string,
  periodStart = startOfCurrentMonth(),
) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  const { error: rpcError } = await supabase.rpc("refund_ai_generation", {
    p_user_id: userId,
    p_period_start: periodStart,
  });
  if (!rpcError) return;

  const usage = await getOrCreateUsage(userId, periodStart);
  const next = Math.max(0, (usage.generations_used ?? 0) - 1);
  await supabase
    .from("ai_generation_usage")
    .update({ generations_used: next })
    .eq("id", usage.id);
}

export async function getAiUsageSummary(
  userId: string,
  plan: UserPlan,
): Promise<AiUsageSummary> {
  const limits = PLAN_LIMITS[plan];
  const periodStart = startOfCurrentMonth();

  if (!isSupabaseConfigured()) {
    return summarizeLocalAiUsage(plan, [], 0);
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("storage_unavailable");

  const [usage, active] = await Promise.all([
    getOrCreateUsage(userId, periodStart),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .eq("source_type", "ai_build")
      .eq("ai_slot_active", true),
  ]);

  if (active.error) throw active.error;

  return {
    plan,
    periodStart,
    nextPeriodStart: nextMonthStart(),
    activeAiCount: active.count ?? 0,
    activeAiLimit: limits.activeAiProjects,
    generationsUsed: usage.generations_used ?? 0,
    generationsLimit: limits.aiGenerationsPerMonth,
    generationsRemaining: Math.max(
      0,
      limits.aiGenerationsPerMonth - (usage.generations_used ?? 0),
    ),
    analytics: limits.analytics,
    reviewQueue: limits.reviewQueue,
  };
}

/**
 * Pure gate used by API + tests.
 * - new_project: needs a free AI slot + monthly generation remaining
 * - regenerate: needs monthly generation remaining; if over slot limit after
 *   downgrade (active > limit), editing is blocked until user archives extras
 */
export function evaluateAiGate(
  summary: AiUsageSummary,
  mode: "new_project" | "regenerate",
) {
  if (summary.generationsUsed >= summary.generationsLimit) {
    return {
      allowed: false as const,
      reason: `Wykorzystano ${summary.generationsUsed}/${summary.generationsLimit} generowań w tym miesiącu. Odnowienie: ${summary.nextPeriodStart}.`,
      summary,
    };
  }

  if (summary.activeAiCount > summary.activeAiLimit) {
    return {
      allowed: false as const,
      reason:
        summary.activeAiLimit === Number.POSITIVE_INFINITY
          ? "AI project limit reached."
          : `Masz ${summary.activeAiCount} aktywnych projektów AI przy limicie ${summary.activeAiLimit}. Zarchiwizuj nadmiarowe, zanim użyjesz AI ponownie.`,
      summary,
    };
  }

  if (mode === "new_project" && summary.activeAiCount >= summary.activeAiLimit) {
    return {
      allowed: false as const,
      reason:
        summary.activeAiLimit === Number.POSITIVE_INFINITY
          ? "AI project limit reached."
          : `Masz już ${summary.activeAiCount}/${summary.activeAiLimit} aktywnych projektów AI. Usuń lub zarchiwizuj jeden albo przejdź na wyższy plan.`,
      summary,
    };
  }

  return { allowed: true as const, summary };
}

export async function canUseAiGeneration(
  userId: string,
  plan: UserPlan,
  mode: "new_project" | "regenerate" = "new_project",
) {
  const summary = await getAiUsageSummary(userId, plan);
  return evaluateAiGate(summary, mode);
}

