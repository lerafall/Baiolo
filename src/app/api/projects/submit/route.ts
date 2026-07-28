import { NextResponse } from "next/server";
import type { PipelineSubmitInput } from "@/lib/pipeline";
import { runSubmitPipeline } from "@/lib/pipeline";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { submissionToRow } from "@/lib/supabase/map";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServer } from "@/lib/supabase/server-auth";

export async function POST(request: Request) {
  const body = (await request.json()) as PipelineSubmitInput & {
    ownerId?: string | null;
    storagePath?: string | null;
    playUrl?: string | null;
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
    playUrl:
      body.playUrl ??
      (body.uploadType === "link" ? body.sourceLabel : null),
  });

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase
        .from("projects")
        .upsert(submissionToRow(result.submission));
      if (error) {
        return NextResponse.json(
          {
            error: "We couldn’t save this project yet.",
            detail: error.message,
            fallback: result,
          },
          { status: 502 },
        );
      }
    }
  }

  return NextResponse.json({
    mode: isSupabaseConfigured() ? "supabase" : "mock",
    ...result,
  });
}
