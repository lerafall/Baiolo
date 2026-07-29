import { NextResponse } from "next/server";
import {
  ADMIN_GATE_COOKIE,
  adminGateToken,
  promoteAdminWithServerCode,
  requireAdmin,
} from "@/lib/admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Body = { code?: string };

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
  const promoted = await promoteAdminWithServerCode(code);
  if (!promoted.ok) return promoted.response;

  if (!isSupabaseConfigured()) {
    const serverCode = (process.env.BAIOLO_ADMIN_CODE || "").trim();
    const token = await adminGateToken(serverCode);
    const res = NextResponse.json({ ok: true, mode: "mock", role: "admin" });
    res.cookies.set(ADMIN_GATE_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  }

  return NextResponse.json({
    ok: true,
    role: "admin",
    userId: promoted.userId,
  });
}

/** Lightweight check for the admin UI. */
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  return NextResponse.json({ ok: true, userId: gate.userId });
}
