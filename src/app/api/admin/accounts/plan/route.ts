import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AiPlan } from "@/lib/ai-quota";

const allowedPlans: AiPlan[] = ["free", "pro", "studio"];

/** Older DBs (schema v5) only accept paid_basic / paid_pro. */
function legacyDbPlan(plan: AiPlan): string {
  if (plan === "pro") return "paid_basic";
  if (plan === "studio") return "paid_pro";
  return "free";
}

function normalizePlan(raw: string | null | undefined): AiPlan {
  if (raw === "pro" || raw === "paid" || raw === "paid_basic") return "pro";
  if (raw === "studio" || raw === "paid_pro") return "studio";
  return "free";
}

function isCheckConstraintError(message: string) {
  return /check constraint|profiles_plan_check|violates/i.test(message);
}

function isMissingColumnError(message: string) {
  return /plan_renewed_at|column .* does not exist/i.test(message);
}

/** Manually set plan for any account (trial/award) — real admin session required. */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let body: { id?: string; plan?: AiPlan | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "Missing account id." }, { status: 400 });
  }

  const plan = body.plan ?? null;
  if (!plan || !allowedPlans.includes(plan)) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });
  }

  const now = new Date().toISOString();

  async function writePlan(dbPlan: string, withRenewedAt: boolean) {
    const row: Record<string, unknown> = {
      id: body.id,
      plan: dbPlan,
    };
    if (withRenewedAt) row.plan_renewed_at = now;

    const { data, error } = await supabase!
      .from("profiles")
      .upsert(row, { onConflict: "id" })
      .select("id, plan")
      .maybeSingle();
    return { data, error };
  }

  let result = await writePlan(plan, true);

  if (result.error && isMissingColumnError(result.error.message)) {
    result = await writePlan(plan, false);
  }

  if (result.error && isCheckConstraintError(result.error.message)) {
    result = await writePlan(legacyDbPlan(plan), false);
  }

  if (result.error) {
    result = await writePlan(plan, false);
  }

  if (result.error) {
    const detail = result.error.message;
    const hint = isCheckConstraintError(detail)
      ? " Run supabase/schema-v6.sql in the Supabase SQL editor so plans free/pro/studio are allowed."
      : isMissingColumnError(detail)
        ? " Run supabase/schema-v6.sql to add plan columns."
        : "";
    return NextResponse.json(
      {
        error: `Couldn't update plan.${hint}`,
        detail,
      },
      { status: 502 },
    );
  }

  const stored = normalizePlan(
    (result.data as { plan?: string } | null)?.plan ?? plan,
  );

  return NextResponse.json({
    ok: true,
    id: body.id,
    plan: stored,
    storedPlan: (result.data as { plan?: string } | null)?.plan ?? plan,
  });
}
