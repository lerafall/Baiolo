import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AiPlan } from "@/lib/ai-quota";

const allowedPlans: AiPlan[] = ["free", "pro", "studio"];

function adminOk(code?: string) {
  const expected = process.env.BAIOLO_ADMIN_CODE || "baiolo-admin";
  const publicCode = process.env.NEXT_PUBLIC_BAIOLO_ADMIN_CODE || "baiolo-admin";
  return code === expected || code === publicCode;
}

/** Manually set plan for any account (trial/award) — admin code required. */
export async function POST(request: Request) {
  const body = (await request.json()) as { id?: string; plan?: AiPlan | null; adminCode?: string };

  if (!adminOk(body.adminCode)) {
    return NextResponse.json(
      { error: "That admin code didn’t work." },
      { status: 401 },
    );
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

  const { error } = await supabase
    .from("profiles")
    .update({ plan, plan_renewed_at: new Date().toISOString() })
    .eq("id", body.id);
  if (error) {
    return NextResponse.json(
      { error: "Couldn’t update plan.", detail: error.message },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, id: body.id, plan });
}

