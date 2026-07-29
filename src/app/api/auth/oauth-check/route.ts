import { NextResponse } from "next/server";

/**
 * Probe a Supabase /auth/v1/authorize URL server-side.
 * Disabled providers return JSON 400 — browsers show a blank Pretty-print page.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as { url?: string };
  const url = body.url?.trim();
  if (!url || !/^https:\/\//i.test(url)) {
    return NextResponse.json({ ok: false, message: "Missing OAuth URL." }, { status: 400 });
  }

  try {
    const target = new URL(url);
    if (!target.hostname.endsWith("supabase.co")) {
      return NextResponse.json({ ok: false, message: "Unexpected auth host." }, { status: 400 });
    }

    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: { Accept: "application/json" },
    });

    const type = res.headers.get("content-type") || "";
    if (res.status >= 400 || type.includes("application/json")) {
      let detail = "";
      try {
        const json = (await res.json()) as { msg?: string; error_code?: string };
        detail = json.msg || json.error_code || "";
      } catch {
        detail = await res.text();
      }
      return NextResponse.json({
        ok: false,
        message: detail || "Provider is not available.",
      });
    }

    // 302/303 to Google/Facebook/etc. means the provider is enabled.
    return NextResponse.json({ ok: true });
  } catch {
    // If probe fails, let the client try the redirect anyway.
    return NextResponse.json({ ok: true, probed: false });
  }
}
