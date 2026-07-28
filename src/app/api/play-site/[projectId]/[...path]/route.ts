import { NextResponse } from "next/server";
import { contentTypeFor } from "@/lib/content-type";
import { patchPlayCss, patchPlayScript } from "@/lib/patch-play-package";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Params = { projectId: string; path: string[] };

/**
 * Proxy extracted ZIP files so browsers get correct Content-Type.
 * Also patches common canvas/CSS drag bugs for iframe + mouse + touch.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<Params> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Play hosting needs Supabase." },
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

  const relative = parts.join("/");
  const storagePath = `published/${projectId}/site/${relative}`;
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });
  }

  const { data, error } = await supabase.storage
    .from("project-public")
    .download(storagePath);

  if (error || !data) {
    return NextResponse.json(
      { error: "That play file wasn’t found." },
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
