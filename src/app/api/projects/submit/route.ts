import { NextResponse } from "next/server";
import type { PipelineSubmitInput } from "@/lib/pipeline";
import { runSubmitPipeline } from "@/lib/pipeline";
import { extractZipForPlay } from "@/lib/publish-zip";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { submissionToRow } from "@/lib/supabase/map";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServer } from "@/lib/supabase/server-auth";

export async function POST(request: Request) {
  const body = (await request.json()) as PipelineSubmitInput & {
    ownerId?: string | null;
    storagePath?: string | null;
    playUrl?: string | null;
    shareIntent?: "private" | "public";
    mockPreviewUrl?: string | null;
  };

  if (!body?.id || !body.title?.trim()) {
    return NextResponse.json(
      { error: "Add a title before you submit." },
      { status: 400 },
    );
  }

  let ownerId = body.ownerId ?? null;
  if (isSupabaseConfigured()) {
    const authed = await createSupabaseServer();
    const {
      data: { user },
    } = (await authed?.auth.getUser()) ?? { data: { user: null } };
    if (user?.id) ownerId = user.id;
  }

  const result = await runSubmitPipeline({
    ...body,
    ownerId,
    storagePath: body.storagePath ?? null,
    shareIntent: body.shareIntent === "public" ? "public" : "private",
    playUrl:
      body.playUrl ??
      (body.uploadType === "link" ? body.sourceLabel : null),
  });

  let submission = result.submission;

  // Private play for the creator immediately (public Explore still needs admin publish).
  if (
    submission.uploadType === "link" &&
    /^https?:\/\//i.test(submission.sourceLabel)
  ) {
    submission = {
      ...submission,
      previewUrl: submission.sourceLabel,
    };
  } else if (submission.storagePath && isSupabaseConfigured()) {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const previewUrl = await extractZipForPlay(
        supabase,
        submission.storagePath,
        submission.id,
        "review",
      );
      if (previewUrl) {
        submission = { ...submission, previewUrl };
      }
    }
  } else if (
    typeof body.mockPreviewUrl === "string" &&
    body.mockPreviewUrl.startsWith("#mock-play/")
  ) {
    submission = { ...submission, previewUrl: body.mockPreviewUrl };
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase
        .from("projects")
        .upsert(submissionToRow(submission));
      if (error) {
        return NextResponse.json(
          {
            error: "We couldn’t save this project yet.",
            detail: error.message,
            fallback: { ...result, submission },
          },
          { status: 502 },
        );
      }
    }
  }

  return NextResponse.json({
    mode: isSupabaseConfigured() ? "supabase" : "mock",
    ...result,
    submission,
  });
}
