import { NextResponse } from "next/server";
import { contentTypeFor } from "@/lib/content-type";
import { patchPlayCss, patchPlayScript } from "@/lib/patch-play-package";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServer } from "@/lib/supabase/server-auth";

export const runtime = "nodejs";

type Params = { projectId: string; path: string[] };

/**
 * Serve review-stage extracts for the project owner only.
 * Public Explore still uses /api/play-site after admin publish.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<Params> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Private play needs Supabase." },
      { status: 503 },
    );
  }

  const { projectId, path: parts } = await context.params;
  if (!projectId || !parts?.length) {
    return NextResponse.json({ error: "Missing play path." }, { status: 400 });
  }
  if (parts.some((p) => p === ".." || p.includes("\\"))) {
    return NextResponse.json({ error: "Bad path." }, { status: 400 });
  }

  const authed = await createSupabaseServer();
  const {
    data: { user },
  } = (await authed?.auth.getUser()) ?? { data: { user: null } };
  if (!user) {
    return NextResponse.json({ error: "Sign in to play your project." }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });
  }

  const { data: row, error: rowError } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .maybeSingle();

  if (rowError || !row?.owner_id || row.owner_id !== user.id) {
    return NextResponse.json(
      { error: "Only the creator can play this private build." },
      { status: 403 },
    );
  }

  const relative = parts.join("/");
  const storagePath = `review/${projectId}/site/${relative}`;
  const { data, error } = await supabase.storage
    .from("project-private")
    .download(storagePath);

  if (error || !data) {
    return NextResponse.json(
      { error: "That private play file wasn’t found yet." },
      { status: 404 },
    );
  }

  const raw = new Uint8Array(await data.arrayBuffer());
  let body: BodyInit = raw;

  if (/\.m?js$/i.test(relative)) {
    body = patchPlayScript(new TextDecoder().decode(raw));
  } else if (/\.css$/i.test(relative)) {
    body = patchPlayCss(new TextDecoder().decode(raw));
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentTypeFor(relative),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
