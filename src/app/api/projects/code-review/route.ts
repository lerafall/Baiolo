import { NextResponse } from "next/server";
import type { ProjectSubmission } from "@/lib/moderation";
import { reviewLinkPackage, reviewZipBytes } from "@/lib/code-review";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  submissionToRow,
  submissionToRowLegacy,
} from "@/lib/supabase/map";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Body = {
  project: ProjectSubmission;
  adminCode?: string;
};

export const runtime = "nodejs";

async function upsertProject(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  project: ProjectSubmission,
) {
  const full = submissionToRow(project);
  let { error } = await supabase.from("projects").upsert(full);
  if (error && /column|schema cache/i.test(error.message ?? "")) {
    ({ error } = await supabase
      .from("projects")
      .upsert(submissionToRowLegacy(project)));
  }
  return error as { message: string } | null;
}

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

  if (!body.project) {
    return NextResponse.json({ error: "Missing project." }, { status: 400 });
  }

  const project = body.project;
  let review;

  if (project.uploadType === "link") {
    review = reviewLinkPackage(project.sourceLabel);
  } else if (project.storagePath && isSupabaseConfigured()) {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Storage unavailable." },
        { status: 503 },
      );
    }
    const { data: file, error } = await supabase.storage
      .from("project-private")
      .download(project.storagePath);
    if (error || !file) {
      return NextResponse.json(
        { error: "Couldn’t download the ZIP to review." },
        { status: 404 },
      );
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    review = await reviewZipBytes(bytes, {
      title: project.title,
      description: project.description,
    });
  } else {
    return NextResponse.json(
      {
        error:
          "Need a stored ZIP (or https link) to run a code check. Upload may still be local-only.",
      },
      { status: 400 },
    );
  }

  const checkedAt = new Date().toISOString();
  const next: ProjectSubmission = {
    ...project,
    risk: review.risk,
    aiFlags: review.flags,
    reviewNotes: [
      review.summary,
      ...review.findings.map((f) => `[${f.severity}] ${f.message}`),
    ].join("\n"),
    codeCheckedAt: review.ok ? checkedAt : null,
    playCheckedAt: null,
    status:
      project.status === "published"
        ? project.status
        : review.ok
          ? project.status === "checking"
            ? "in_review"
            : project.status
          : project.status,
    updatedAt: checkedAt,
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const error = await upsertProject(supabase, next);
      if (error) {
        return NextResponse.json(
          {
            error: "Reviewed, but saving failed.",
            detail: error.message,
            review,
            project: next,
          },
          { status: 502 },
        );
      }
      await supabase.from("moderation_events").insert({
        project_id: next.id,
        action: "code_checked",
        note: review.summary,
        risk: next.risk,
      });
    }
  }

  return NextResponse.json({
    mode: isSupabaseConfigured() ? "supabase" : "mock",
    review,
    project: next,
  });
}
