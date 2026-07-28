import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { rowToSubmission, type ProjectRow } from "@/lib/supabase/map";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") || "published";

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      mode: "mock",
      message: "Supabase not configured — use local submissions store.",
      items: [],
    });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ mode: "mock", items: [] });
  }

  let query = supabase.from("projects").select("*").order("updated_at", {
    ascending: false,
  });

  if (scope === "published") {
    query = query.eq("status", "published");
  } else if (scope === "queue") {
    query = query.in("status", [
      "submitted",
      "checking",
      "in_review",
      "needs_changes",
    ]);
  } else if (scope === "all") {
    // service role — full list for dashboard / hydrate
  } else {
    return NextResponse.json(
      { error: "Unknown scope. Use published, queue, or all." },
      { status: 400 },
    );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: "We couldn’t load projects yet.", detail: error.message },
      { status: 502 },
    );
  }

  const items = ((data ?? []) as ProjectRow[]).map(rowToSubmission);

  return NextResponse.json({ mode: "supabase", items });
}
