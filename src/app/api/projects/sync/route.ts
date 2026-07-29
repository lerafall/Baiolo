import { NextResponse } from "next/server";
import type { ProjectStatus, ProjectSubmission } from "@/lib/moderation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { rowToSubmission, submissionToRow } from "@/lib/supabase/map";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Higher = more advanced in the pipeline. Used to block stale client downgrades. */
export function statusRank(status: ProjectStatus | null | undefined): number {
  switch (status) {
    case "draft":
      return 0;
    case "submitted":
      return 1;
    case "checking":
      return 2;
    case "in_review":
      return 3;
    case "needs_changes":
      return 4;
    case "approved":
      return 5;
    case "published":
      return 6;
    case "rejected":
      return 5;
    default:
      return 0;
  }
}

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

  const { data: existingRow } = await supabase
    .from("projects")
    .select("*")
    .eq("id", body.id)
    .maybeSingle();

  if (existingRow) {
    const existing = rowToSubmission(existingRow);
    const incomingRank = statusRank(body.status);
    const existingRank = statusRank(existing.status);

    // Never let a stale browser tab downgrade a published / approved project.
    if (
      existingRank > incomingRank &&
      (existing.status === "published" ||
        existing.status === "approved" ||
        existing.status === "rejected")
    ) {
      return NextResponse.json({
        mode: "supabase",
        skipped: true,
        reason: "stale_status_downgrade",
        project: existing,
      });
    }

    const existingTs = Date.parse(existing.updatedAt);
    const incomingTs = Date.parse(body.updatedAt);
    if (
      Number.isFinite(existingTs) &&
      Number.isFinite(incomingTs) &&
      existingTs > incomingTs &&
      existingRank >= incomingRank
    ) {
      return NextResponse.json({
        mode: "supabase",
        skipped: true,
        reason: "stale_updated_at",
        project: existing,
      });
    }
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
