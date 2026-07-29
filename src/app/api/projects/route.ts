import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { rowToSubmission, type ProjectRow } from "@/lib/supabase/map";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServer } from "@/lib/supabase/server-auth";

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
  } else if (scope === "mine") {
    const auth = await createSupabaseServer();
    const {
      data: { user },
    } = (await auth?.auth.getUser()) ?? { data: { user: null } };
    if (!user) {
      return NextResponse.json({ mode: "supabase", items: [] });
    }
    query = query.eq("owner_id", user.id);
  } else if (scope === "queue" || scope === "all") {
    const gate = await requireAdmin();
    if (!gate.ok) return gate.response;
    if (scope === "queue") {
      query = query.in("status", [
        "submitted",
        "checking",
        "in_review",
        "needs_changes",
        "approved",
        "published",
      ]);
    }
  } else {
    return NextResponse.json(
      { error: "Unknown scope. Use published, mine, queue, or all." },
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
