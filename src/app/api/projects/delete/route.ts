import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Body = { id?: string; adminCode?: string };

/** Hard-delete a project from Supabase (admin only). */
export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const expected = process.env.BAIOLO_ADMIN_CODE || "baiolo-admin";
  const publicCode = process.env.NEXT_PUBLIC_BAIOLO_ADMIN_CODE || "baiolo-admin";

  if (body.adminCode !== expected && body.adminCode !== publicCode) {
    return NextResponse.json(
      { error: "That admin code didn’t work." },
      { status: 401 },
    );
  }

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
