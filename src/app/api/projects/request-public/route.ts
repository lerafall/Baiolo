import { NextResponse } from "next/server";
import type { ProjectSubmission } from "@/lib/moderation";
import { requestPublicShare } from "@/lib/pipeline";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { submissionToRow, submissionToRowLegacy } from "@/lib/supabase/map";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServer } from "@/lib/supabase/server-auth";

type Body = {
  project: ProjectSubmission;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.project?.id) {
    return NextResponse.json({ error: "Missing project." }, { status: 400 });
  }

  if (isSupabaseConfigured()) {
    const authed = await createSupabaseServer();
    const {
      data: { user },
    } = (await authed?.auth.getUser()) ?? { data: { user: null } };
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    if (body.project.ownerId && body.project.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Only the creator can request a public share." },
        { status: 403 },
      );
    }
  }

  if (body.project.status === "published") {
    return NextResponse.json({
      project: body.project,
      message: "Already public.",
    });
  }

  const next = requestPublicShare(body.project);

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      let { error } = await supabase.from("projects").upsert(submissionToRow(next));
      if (error && /column|schema cache/i.test(error.message ?? "")) {
        ({ error } = await supabase
          .from("projects")
          .upsert(submissionToRowLegacy(next)));
      }
      if (error) {
        return NextResponse.json(
          { error: "Couldn’t save public request.", detail: error.message },
          { status: 502 },
        );
      }

      let ownerEmail: string | null = null;
      if (next.ownerId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", next.ownerId)
          .maybeSingle();
        ownerEmail = profile?.email ?? null;
      }
      const { notifyCreatorEmail } = await import("@/lib/notify-email");
      await notifyCreatorEmail({
        to: ownerEmail,
        projectTitle: next.title || "Baiolo project",
        projectId: next.id,
        event: "request_public",
      });
    }
  }

  return NextResponse.json({
    project: next,
    message: "Queued for public review.",
  });
}
