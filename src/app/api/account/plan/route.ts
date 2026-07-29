import { NextResponse } from "next/server";
import { canSelfServeSetPlan } from "@/lib/billing/provider";
import { isUserPlan, type UserPlan } from "@/lib/plans.config";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServer } from "@/lib/supabase/server-auth";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Cloud auth is off — plan selection needs Supabase." },
      { status: 503 },
    );
  }

  let body: { plan?: UserPlan | null };
  try {
    body = (await request.json()) as { plan?: UserPlan | null };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const plan = body?.plan ?? null;
  if (!plan || !isUserPlan(plan)) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  if (!canSelfServeSetPlan(plan)) {
    return NextResponse.json(
      {
        error:
          "Pro and Studio are assigned by Baiolo (or a future billing provider). Use /pricing to request an upgrade.",
        code: "upgrade_not_self_serve",
      },
      { status: 403 },
    );
  }

  const supabase = await createSupabaseServer();
  if (!supabase) {
    return NextResponse.json(
      { error: "Storage unavailable." },
      { status: 503 },
    );
  }
  const {
    data: { user },
  } = (await supabase.auth.getUser()) ?? { data: { user: null } };
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ plan, plan_renewed_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Couldn’t update plan." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, plan });
}
