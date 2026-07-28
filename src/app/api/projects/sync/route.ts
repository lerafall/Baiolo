import { NextResponse } from "next/server";
import type { ProjectSubmission } from "@/lib/moderation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { submissionToRow } from "@/lib/supabase/map";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Upsert one submission (used by client hydrate sync / status progress). */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ mode: "mock", skipped: true });
  }

  const body = (await request.json()) as ProjectSubmission;
  if (!body?.id || !body.title?.trim()) {
    return NextResponse.json(
      { error: "Missing project to sync." },
      { status: 400 },
    );
  }

  // Keep unfinished drafts local-only for now.
  if (body.status === "draft") {
    return NextResponse.json({ mode: "supabase", skipped: true });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ mode: "mock", skipped: true });
  }

  const { error } = await supabase
    .from("projects")
    .upsert(submissionToRow(body));

  if (error) {
    return NextResponse.json(
      { error: "We couldn’t sync this project yet.", detail: error.message },
      { status: 502 },
    );
  }

  return NextResponse.json({ mode: "supabase", id: body.id });
}
