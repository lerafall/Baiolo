import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Body = { id?: string };

/** Hard-delete a project from Supabase (admin only). */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = (await request.json()) as Body;

  if (!body.id) {
    return NextResponse.json({ error: "Missing project id." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ mode: "mock", deleted: body.id });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ mode: "mock", deleted: body.id });
  }

  const { error } = await supabase.from("projects").delete().eq("id", body.id);
  if (error) {
    return NextResponse.json(
      { error: "We couldn’t remove that project.", detail: error.message },
      { status: 502 },
    );
  }

  return NextResponse.json({ mode: "supabase", deleted: body.id });
}
