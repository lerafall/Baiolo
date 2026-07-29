import { NextResponse } from "next/server";
import type { ProjectSubmission } from "@/lib/moderation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { rowToSubmission } from "@/lib/supabase/map";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServer } from "@/lib/supabase/server-auth";

type Body = {
  project?: ProjectSubmission;
  id?: string;
};

/** Free an AI slot without deleting the project. */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const project = body.project;
  const id = body.id || project?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing project id." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    if (!project) {
      return NextResponse.json({ error: "Missing project." }, { status: 400 });
    }
    const next: ProjectSubmission = {
      ...project,
      aiSlotActive: false,
      updatedAt: new Date().toISOString(),
    };
    return NextResponse.json({ mode: "mock", project: next });
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
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !row) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (row.owner_id !== user.id) {
    return NextResponse.json({ error: "Not your project." }, { status: 403 });
  }

  const { data: updated, error } = await supabase
    .from("projects")
    .update({
      ai_slot_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: "Couldn’t archive that project.", detail: error?.message },
      { status: 502 },
    );
  }

  return NextResponse.json({
    mode: "supabase",
    project: rowToSubmission(updated),
  });
}
