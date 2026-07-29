import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { demoSeedSubmissions } from "@/lib/seed-demo";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { submissionToRow } from "@/lib/supabase/map";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Upsert demo catalog projects as published (admin only). */
export async function POST() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

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
