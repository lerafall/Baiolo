import { NextResponse } from "next/server";
import { contentTypeFor } from "@/lib/content-type";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Params = { projectId: string; path: string[] };

/** Make slingshot / drag games work inside Baiolo iframes. */
function patchScriptForIframe(source: string) {
  let out = source;
  // Prefer canvas listeners + pointer capture over window (parent page steals move/up).
  out = out.replace(
    /window\.addEventListener\(\s*(['"])pointermove\1/g,
    "canvas.addEventListener($1pointermove$1",
  );
  out = out.replace(
    /window\.addEventListener\(\s*(['"])pointerup\1/g,
    "canvas.addEventListener($1pointerup$1",
  );
  out = out.replace(
    /window\.addEventListener\(\s*(['"])pointercancel\1/g,
    "canvas.addEventListener($1pointercancel$1",
  );

  if (
    out.includes("pointerdown") &&
    !out.includes("setPointerCapture") &&
    out.includes("canvas.addEventListener")
  ) {
    out = out.replace(
      /canvas\.addEventListener\(\s*(['"])pointerdown\1\s*,\s*\(e\)\s*=>\s*\{/g,
      `canvas.addEventListener($1pointerdown$1, (e) => {\n    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}\n`,
    );
  }
  return out;
}

/**
 * Proxy extracted ZIP files so browsers get correct Content-Type.
 * Supabase Storage often serves .html as octet-stream (source dump in iframe).
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

  // Prevent path traversal
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

  let body: BodyInit = new Uint8Array(await data.arrayBuffer());
  if (/\.m?js$/i.test(relative)) {
    const text = new TextDecoder().decode(body as Uint8Array);
    body = patchScriptForIframe(text);
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentTypeFor(relative),
      "Cache-Control": "public, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
