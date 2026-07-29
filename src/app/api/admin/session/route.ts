import { NextResponse } from "next/server";
import {
  ADMIN_GATE_COOKIE,
  adminGateToken,
  requireAdmin,
} from "@/lib/admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServer } from "@/lib/supabase/server-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Body = { code?: string };

function attachMockGateCookie(response: NextResponse, serverCode: string) {
  response.cookies.set(ADMIN_GATE_COOKIE, adminGateToken(serverCode), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/**
 * Unlock admin for the current signed-in user by verifying BAIOLO_ADMIN_CODE
 * (server env only) and setting profiles.role = admin.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  const serverCode = (process.env.BAIOLO_ADMIN_CODE || "").trim();
  const publicCode = (process.env.NEXT_PUBLIC_BAIOLO_ADMIN_CODE || "").trim();

  if (!serverCode || code !== serverCode) {
    return NextResponse.json(
      { error: "That admin code didn’t work." },
      { status: 401 },
    );
  }

  if (publicCode && serverCode === publicCode) {
    return NextResponse.json(
      {
        error:
          "Server misconfigured: BAIOLO_ADMIN_CODE must differ from NEXT_PUBLIC_BAIOLO_ADMIN_CODE (leave the public one empty).",
      },
      { status: 503 },
    );
  }

  if (!isSupabaseConfigured()) {
    const res = NextResponse.json({ ok: true, mode: "mock", role: "admin" });
    attachMockGateCookie(res, serverCode);
    return res;
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  if (!user) {
    return NextResponse.json(
      { error: "Sign in first, then unlock admin." },
      { status: 401 },
    );
  }

  const admin = getSupabaseServerClient();
  if (!admin) {
    return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });
  }

  const { error } = await admin.from("profiles").upsert({
    id: user.id,
    email: user.email ?? null,
    role: "admin",
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json(
      { error: "Couldn’t grant admin role.", detail: error.message },
      { status: 502 },
    );
  }

  const gate = await requireAdmin({ adminCode: code });
  if (!gate.ok) return gate.response;

  return NextResponse.json({ ok: true, role: "admin", userId: user.id });
}

/** Lightweight check for the admin UI. */
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  return NextResponse.json({ ok: true, userId: gate.userId });
}
