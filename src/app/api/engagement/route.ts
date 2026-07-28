import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Body = {
  projectId: string;
  userKey: string;
  reaction: string | null;
  feedbackNotes: string[];
  reported: boolean;
  plays: number;
};

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ mode: "mock", skipped: true });
  }

  const body = (await request.json()) as Body;
  if (!body.projectId || !body.userKey) {
    return NextResponse.json({ error: "Missing engagement." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ mode: "mock", skipped: true });
  }

  const { error } = await supabase.from("project_engagement").upsert({
    project_id: body.projectId,
    user_key: body.userKey,
    reaction: body.reaction,
    feedback_notes: body.feedbackNotes ?? [],
    reported: body.reported ?? false,
    plays: body.plays ?? 0,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json(
      { error: "Couldn’t sync engagement.", detail: error.message },
      { status: 502 },
    );
  }

  return NextResponse.json({ mode: "supabase", ok: true });
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ mode: "mock", item: null });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const userKey = searchParams.get("userKey");
  if (!projectId || !userKey) {
    return NextResponse.json({ error: "Missing keys." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ mode: "mock", item: null });
  }

  const { data, error } = await supabase
    .from("project_engagement")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_key", userKey)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Couldn’t load engagement.", detail: error.message },
      { status: 502 },
    );
  }

  return NextResponse.json({ mode: "supabase", item: data });
}
