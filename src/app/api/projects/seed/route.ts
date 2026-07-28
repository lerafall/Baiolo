import { NextResponse } from "next/server";
import { demoSeedSubmissions } from "@/lib/seed-demo";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { submissionToRow } from "@/lib/supabase/map";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Body = { adminCode?: string };

/** Upsert demo catalog projects as published (admin only). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const expected = process.env.BAIOLO_ADMIN_CODE || "baiolo-admin";
  const publicCode = process.env.NEXT_PUBLIC_BAIOLO_ADMIN_CODE || "baiolo-admin";

  if (body.adminCode !== expected && body.adminCode !== publicCode) {
    return NextResponse.json(
      { error: "That admin code didn’t work." },
      { status: 401 },
    );
  }

  const seeds = demoSeedSubmissions();

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      mode: "mock",
      message: "Supabase off — return seeds for local merge.",
      items: seeds,
    });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ mode: "mock", items: seeds });
  }

  const rows = seeds.map(submissionToRow);
  const { error } = await supabase.from("projects").upsert(rows);
  if (error) {
    return NextResponse.json(
      { error: "We couldn’t seed demo projects.", detail: error.message },
      { status: 502 },
    );
  }

  return NextResponse.json({
    mode: "supabase",
    seeded: rows.length,
    items: seeds,
  });
}
