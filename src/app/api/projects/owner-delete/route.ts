import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServer } from "@/lib/supabase/server-auth";

type Body = { id?: string };

/** Owner deletes their own project. */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "Missing project id." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ mode: "mock", deleted: body.id });
  }

  const authed = await createSupabaseServer();
  const {
    data: { user },
  } = (await authed?.auth.getUser()) ?? { data: { user: null } };
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });
  }

  const { data: row, error: fetchError } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", body.id)
    .maybeSingle();

  if (fetchError || !row) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (row.owner_id !== user.id) {
    return NextResponse.json({ error: "Not your project." }, { status: 403 });
  }

  const { error } = await supabase.from("projects").delete().eq("id", body.id);
  if (error) {
    return NextResponse.json(
      { error: "Couldn’t delete that project.", detail: error.message },
      { status: 502 },
    );
  }

  return NextResponse.json({ mode: "supabase", deleted: body.id });
}
