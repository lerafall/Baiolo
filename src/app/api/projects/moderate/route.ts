import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { loadModerationTarget } from "@/lib/admin-project-source";
import type { ProjectSubmission } from "@/lib/moderation";
import {
  applyAdminAction,
  canPublish,
  type AdminAction,
  adminActions,
} from "@/lib/pipeline";
import { extractZipForPlay } from "@/lib/publish-zip";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  submissionToRow,
  submissionToRowLegacy,
} from "@/lib/supabase/map";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Body = {
  /** Preferred: the server reads the row itself. */
  projectId?: string;
  /** Legacy / mock mode only. */
  project?: ProjectSubmission;
  action: AdminAction;
  note?: string;
};

function isAdminAction(value: string): value is AdminAction {
  return (adminActions as readonly string[]).includes(value);
}

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
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = (await request.json()) as Body;

  if ((!body.projectId && !body.project) || !body.action || !isAdminAction(body.action)) {
    return NextResponse.json(
      { error: "Missing project or action." },
      { status: 400 },
    );
  }

  // Act on the stored row, never on whatever the browser happened to hold.
  const { project: target } = await loadModerationTarget(
    body.projectId,
    body.project,
  );
  if (!target) {
    return NextResponse.json(
      { error: "That project no longer exists — refresh the queue." },
      { status: 404 },
    );
  }

  if (body.action === "publish" && !canPublish(target)) {
    return NextResponse.json(
      {
        error:
          "Publish is locked until you check the code and play-test the game.",
      },
      { status: 403 },
    );
  }

  let next = applyAdminAction(target, body.action, body.note);

  if (
    body.action === "publish" &&
    next.status !== "published" &&
    target.status !== "published"
  ) {
    return NextResponse.json(
      {
        error:
          "Publish is locked until you check the code and play-test the game.",
      },
      { status: 403 },
    );
  }

  const supabase = getSupabaseServerClient();

  if (body.action === "prepare_preview") {
    if (next.uploadType === "link" && /^https?:\/\//i.test(next.sourceLabel)) {
      next = { ...next, previewUrl: next.sourceLabel };
    } else if (next.storagePath && supabase) {
      const url = await extractZipForPlay(
        supabase,
        next.storagePath,
        next.id,
        "review",
      );
      if (!url) {
        return NextResponse.json(
          { error: "Couldn’t unpack this ZIP for preview." },
          { status: 502 },
        );
      }
      next = { ...next, previewUrl: url };
    } else if (!next.storagePath && next.uploadType !== "link") {
      return NextResponse.json(
        { error: "No package file to preview yet." },
        { status: 400 },
      );
    }
  }

  if (next.status === "published" && body.action === "publish") {
    if (!next.category) {
      next = { ...next, category: "experiment" };
    }
    if (next.uploadType === "link" && /^https?:\/\//i.test(next.sourceLabel)) {
      next = { ...next, playUrl: next.sourceLabel };
    } else if (next.storagePath && supabase) {
      const url = await extractZipForPlay(
        supabase,
        next.storagePath,
        next.id,
        "published",
      );
      if (!url) {
        return NextResponse.json(
          {
            error:
              "Couldn’t unpack the package for public play. Check storage buckets and re-prepare preview, then publish again.",
          },
          { status: 502 },
        );
      }
      next = { ...next, playUrl: url };
    } else if (
      next.previewUrl?.startsWith("#mock-play/") ||
      !next.storagePath
    ) {
      return NextResponse.json(
        {
          error:
            "This project has no cloud package yet (only a local preview). Ask the creator to re-submit so the ZIP uploads, then publish.",
        },
        { status: 400 },
      );
    }

    if (!next.playUrl) {
      return NextResponse.json(
        {
          error:
            "Publish needs a public play URL. Prepare play / unpack the package first.",
        },
        { status: 400 },
      );
    }
  }

  if (isSupabaseConfigured() && supabase) {
    const error = await upsertProject(supabase, next);
    if (error) {
      return NextResponse.json(
        {
          error: "We couldn’t update that project yet.",
          detail: error.message,
        },
        { status: 502 },
      );
    }

    await supabase.from("moderation_events").insert({
      project_id: next.id,
      action: body.action,
      note: body.note ?? null,
      risk: next.risk,
    });
  }

  // Optional email notify (Resend) + client bell still tracks status diffs.
  if (
    body.action === "publish" ||
    body.action === "ask_for_changes" ||
    body.action === "reject" ||
    body.action === "escalate"
  ) {
    const { notifyCreatorEmail } = await import("@/lib/notify-email");
    let to: string | null = null;
    if (isSupabaseConfigured() && next.ownerId) {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", next.ownerId)
          .maybeSingle();
        to = (profile as { email?: string } | null)?.email ?? null;
      }
    }
    const event =
      body.action === "publish"
        ? "published"
        : body.action === "ask_for_changes"
          ? "needs_changes"
          : body.action === "reject"
            ? "rejected"
            : "in_review";
    await notifyCreatorEmail({
      to,
      projectTitle: next.title,
      projectId: next.id,
      event,
      note: body.note,
    });
  }

  return NextResponse.json({
    mode: isSupabaseConfigured() ? "supabase" : "mock",
    project: next,
  });
}
