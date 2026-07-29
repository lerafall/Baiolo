import { NextResponse } from "next/server";
import { contentTypeFor } from "@/lib/content-type";
import { patchPlayCss, patchPlayScript } from "@/lib/patch-play-package";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Params = { projectId: string; path: string[] };

function adminOk(request: Request) {
  const expected = process.env.BAIOLO_ADMIN_CODE || "baiolo-admin";
  const publicCode = process.env.NEXT_PUBLIC_BAIOLO_ADMIN_CODE || "baiolo-admin";
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("adminCode");
  const fromHeader = request.headers.get("x-baiolo-admin");
  const code = fromQuery || fromHeader || "";
  return code === expected || code === publicCode;
}

/**
 * Serve staged review extracts from project-private.
 * Requires admin code (query or header) so unpublished games stay private.
 */
export async function GET(
  request: Request,
  context: { params: Promise<Params> },
) {
  if (!adminOk(request)) {
    return NextResponse.json({ error: "Admin only." }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Preview hosting needs Supabase." },
      { status: 503 },
    );
  }

  const { projectId, path: parts } = await context.params;
  if (!projectId || !parts?.length) {
    return NextResponse.json({ error: "Missing preview path." }, { status: 400 });
  }

  if (parts.some((p) => p === ".." || p.includes("\\"))) {
    return NextResponse.json({ error: "Bad path." }, { status: 400 });
  }

  const relative = parts.join("/");
  const storagePath = `review/${projectId}/site/${relative}`;
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });
  }

  const { data, error } = await supabase.storage
    .from("project-private")
    .download(storagePath);

  if (error || !data) {
    return NextResponse.json(
      { error: "That preview file wasn’t found. Prepare play first." },
      { status: 404 },
    );
  }

  const raw = new Uint8Array(await data.arrayBuffer());
  let body: BodyInit = raw;

  if (/\.m?js$/i.test(relative)) {
    body = patchPlayScript(new TextDecoder().decode(raw));
  } else if (/\.css$/i.test(relative)) {
    body = patchPlayCss(new TextDecoder().decode(raw));
  } else if (/\.html?$/i.test(relative)) {
    const html = new TextDecoder().decode(raw);
    const code =
      new URL(request.url).searchParams.get("adminCode") ||
      process.env.NEXT_PUBLIC_BAIOLO_ADMIN_CODE ||
      "baiolo-admin";
    body = stampAdminCodeOnHtml(html, code);
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

/** Append adminCode to relative src/href so iframe assets stay authorized. */
function stampAdminCodeOnHtml(html: string, adminCode: string) {
  const q = `adminCode=${encodeURIComponent(adminCode)}`;
  return html.replace(
    /\b(src|href)=["']([^"']+)["']/gi,
    (full, attr: string, url: string) => {
      if (
        !url ||
        url.includes("adminCode=") ||
        /^(https?:|data:|blob:|#|mailto:)/i.test(url)
      ) {
        return full;
      }
      const next = url.includes("?") ? `${url}&${q}` : `${url}?${q}`;
      return `${attr}="${next}"`;
    },
  );
}
