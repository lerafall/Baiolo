import { NextResponse } from "next/server";
import type { ProjectSubmission } from "@/lib/moderation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { submissionToRow, submissionToRowLegacy } from "@/lib/supabase/map";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServer } from "@/lib/supabase/server-auth";

type Body = {
  project: ProjectSubmission;
  email?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (!body.project?.id || !email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Add a valid email to invite." },
      { status: 400 },
    );
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
        { error: "Only the creator can invite people." },
        { status: 403 },
      );
    }
  }

  const shared = new Set(
    (body.project.sharedWith || []).map((s) => s.toLowerCase()),
  );
  shared.add(email);
  const next: ProjectSubmission = {
    ...body.project,
    sharedWith: Array.from(shared).slice(0, 20),
    updatedAt: new Date().toISOString(),
  };

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
          { error: "Couldn’t save invite.", detail: error.message },
          { status: 502 },
        );
      }
    }
  }

  const { notifyCreatorEmail } = await import("@/lib/notify-email");
  await notifyCreatorEmail({
    to: email,
    projectTitle: next.title || "Baiolo project",
    projectId: next.id,
    event: "invite",
  });

  return NextResponse.json({ project: next });
}
