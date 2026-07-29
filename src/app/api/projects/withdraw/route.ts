import { NextResponse } from "next/server";
import type { ProjectSubmission } from "@/lib/moderation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { submissionToRow, submissionToRowLegacy } from "@/lib/supabase/map";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServer } from "@/lib/supabase/server-auth";

type Body = {
  project?: ProjectSubmission;
  id?: string;
};

/** Owner withdraws a submission back to draft (out of review queue). */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const project = body.project;
  const id = body.id || project?.id;
  if (!id || !project) {
    return NextResponse.json({ error: "Missing project." }, { status: 400 });
  }

  const next: ProjectSubmission = {
    ...project,
    status: "draft",
    visibility: "private",
    changeRequest: null,
    updatedAt: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ mode: "mock", project: next });
  }

  const authed = await createSupabaseServer();
  const {
    data: { user },
  } = (await authed?.auth.getUser()) ?? { data: { user: null } };
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (project.ownerId && project.ownerId !== user.id) {
    return NextResponse.json({ error: "Not your project." }, { status: 403 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });
  }

  let { error } = await supabase.from("projects").upsert(submissionToRow(next));
  if (error && /column|schema cache/i.test(error.message ?? "")) {
    ({ error } = await supabase
      .from("projects")
      .upsert(submissionToRowLegacy(next)));
  }
  if (error) {
    return NextResponse.json(
      { error: "Couldn’t withdraw that submission.", detail: error.message },
      { status: 502 },
    );
  }

  return NextResponse.json({ mode: "supabase", project: next });
}
