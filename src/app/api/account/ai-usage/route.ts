import { NextResponse } from "next/server";
import { summarizeLocalAiUsage } from "@/lib/ai-usage";
import { isUserPlan } from "@/lib/plans.config";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServer } from "@/lib/supabase/server-auth";
import { getAiUsageSummary } from "@/lib/ai-usage";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    const qp = new URL(request.url).searchParams.get("plan");
    const plan = isUserPlan(qp) ? qp : "free";
    return NextResponse.json({
      summary: summarizeLocalAiUsage(plan, []),
    });
  }

  const supabase = await createSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });
  }
  const {
    data: { user },
  } = (await supabase.auth.getUser()) ?? { data: { user: null } };
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();

  const plan =
    profile?.plan === "studio"
      ? "studio"
      : profile?.plan === "pro" ||
          profile?.plan === "paid" ||
          profile?.plan === "paid_basic"
        ? "pro"
        : "free";

  const summary = await getAiUsageSummary(user.id, plan);
  return NextResponse.json({ summary });
}

