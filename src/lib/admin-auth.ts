import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cookies } from "next/headers";
import {
  ADMIN_GATE_COOKIE,
  adminGateToken,
  cookieMatchesAdminGate,
} from "@/lib/admin-auth-shared";

export type AdminAuthOk = {
  ok: true;
  userId: string;
  email: string | null;
};

export type AdminAuthFail = {
  ok: false;
  response: NextResponse;
};

export { ADMIN_GATE_COOKIE, adminGateToken } from "@/lib/admin-auth-shared";

function forbidden(message = "Brak uprawnień administratora.") {
  return {
    ok: false as const,
    response: NextResponse.json(
      { error: "FORBIDDEN", message },
      { status: 403 },
    ),
  };
}

function unauthorized(message = "Zaloguj się, żeby użyć panelu admina.") {
  return {
    ok: false as const,
    response: NextResponse.json(
      { error: "UNAUTHORIZED", message },
      { status: 401 },
    ),
  };
}

/**
 * Server-only admin gate (fail-closed).
 * Admin = signed-in user with profiles.role = 'admin' OR JWT app_metadata.role = 'admin'.
 * Does NOT accept NEXT_PUBLIC_BAIOLO_ADMIN_CODE.
 * Does NOT auto-promote — only /api/admin/session may promote.
 */
export async function requireAdmin(): Promise<AdminAuthOk | AdminAuthFail> {
  const serverCode = (process.env.BAIOLO_ADMIN_CODE || "").trim();

  if (!isSupabaseConfigured()) {
    const jar = await cookies();
    if (
      await cookieMatchesAdminGate(jar.get(ADMIN_GATE_COOKIE)?.value, serverCode)
    ) {
      return { ok: true, userId: "local-admin", email: null };
    }
    return forbidden();
  }

  const supabase = await createSupabaseServer();
  if (!supabase) return unauthorized();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return unauthorized();

  const jwtRole =
    typeof user.app_metadata?.role === "string"
      ? user.app_metadata.role
      : null;
  if (jwtRole === "admin") {
    return { ok: true, userId: user.id, email: user.email ?? null };
  }

  // Fail closed: without service role we cannot verify profiles.role safely.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return forbidden("Admin gate misconfigured (missing service role).");
  }

  const admin = getSupabaseServerClient();
  if (!admin) {
    return forbidden("Admin gate misconfigured (missing service role).");
  }

  const { data: profile, error } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return forbidden("Could not verify admin role.");
  }

  if (profile?.role === "admin") {
    return { ok: true, userId: user.id, email: user.email ?? null };
  }

  return forbidden();
}

/**
 * Promote signed-in user to admin after verifying BAIOLO_ADMIN_CODE.
 * Call only from /api/admin/session.
 */
export async function promoteAdminWithServerCode(
  code: string,
): Promise<AdminAuthOk | AdminAuthFail> {
  const serverCode = (process.env.BAIOLO_ADMIN_CODE || "").trim();
  const publicCode = (process.env.NEXT_PUBLIC_BAIOLO_ADMIN_CODE || "").trim();
  const provided = code.trim();

  if (!serverCode || provided !== serverCode) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "That admin code didn’t work." },
        { status: 401 },
      ),
    };
  }

  if (publicCode && serverCode === publicCode) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Server misconfigured: BAIOLO_ADMIN_CODE must differ from NEXT_PUBLIC_BAIOLO_ADMIN_CODE (leave the public one empty).",
        },
        { status: 503 },
      ),
    };
  }

  if (!isSupabaseConfigured()) {
    return { ok: true, userId: "local-admin", email: null };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  if (!user) return unauthorized("Sign in first, then unlock admin.");

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return forbidden("Admin gate misconfigured (missing service role).");
  }

  const admin = getSupabaseServerClient();
  if (!admin) {
    return forbidden("Admin gate misconfigured (missing service role).");
  }

  const { error } = await admin.from("profiles").upsert({
    id: user.id,
    email: user.email ?? null,
    role: "admin",
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Couldn’t grant admin role.", detail: error.message },
        { status: 502 },
      ),
    };
  }

  return { ok: true, userId: user.id, email: user.email ?? null };
}
