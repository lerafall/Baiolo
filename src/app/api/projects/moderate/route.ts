import { NextResponse } from "next/server";
import type { ProjectSubmission } from "@/lib/moderation";
import { applyAdminAction, type AdminAction } from "@/lib/pipeline";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { submissionToRow } from "@/lib/supabase/map";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Body = {
  project: ProjectSubmission;
  action: AdminAction;
  note?: string;
  adminCode?: string;
};

async function publicPlayUrl(
  storagePath: string | null | undefined,
): Promise<string | null> {
  if (!storagePath || !isSupabaseConfigured()) return null;
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  // Copy private package into the public bucket when approving.
  const { data: file, error: downloadError } = await supabase.storage
    .from("project-private")
    .download(storagePath);
  if (downloadError || !file) return null;

  const publicPath = storagePath.replace(/^[^/]+\//, "published/");
  const bytes = new Uint8Array(await file.arrayBuffer());
  await supabase.storage.from("project-public").upload(publicPath, bytes, {
    contentType: "application/zip",
    upsert: true,
  });

  const { data } = supabase.storage
    .from("project-public")
    .getPublicUrl(publicPath);
  return data.publicUrl || null;
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

  if (!body.project || !body.action) {
    return NextResponse.json(
      { error: "Missing project or action." },
      { status: 400 },
    );
  }

  let next = applyAdminAction(body.project, body.action, body.note);

  if (next.status === "published") {
    if (next.uploadType === "link" && /^https?:\/\//i.test(next.sourceLabel)) {
      next = { ...next, playUrl: next.sourceLabel };
    } else if (next.storagePath) {
      const url = await publicPlayUrl(next.storagePath);
      if (url) next = { ...next, playUrl: url };
    }
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const row = submissionToRow(next);
      const { error } = await supabase.from("projects").upsert(row);

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
  }

  return NextResponse.json({
    mode: isSupabaseConfigured() ? "supabase" : "mock",
    project: next,
  });
}
