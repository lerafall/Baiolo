import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

export type AdminAuthOk = {
  ok: true;
  userId: string;
  email: string | null;
};

export type AdminAuthFail = {
  ok: false;
  response: NextResponse;
};

export const ADMIN_GATE_COOKIE = "baiolo_admin_gate";

export function adminGateToken(serverCode: string) {
  return createHmac("sha256", serverCode).update("baiolo-admin-gate").digest("hex");
}

function cookieMatchesAdminGate(token: string | undefined, serverCode: string) {
  if (!token || !serverCode) return false;
  const expected = adminGateToken(serverCode);
  try {
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Server-only admin gate.
 * Accepts signed-in users with profiles.role = 'admin' or JWT app_metadata.role = 'admin'.
 * Optional bootstrap: BAIOLO_ADMIN_CODE (server env only) promotes the signed-in user once.
 * Mock mode: httpOnly cookie set by /api/admin/session after verifying the server code.
 * NEVER accepts NEXT_PUBLIC_BAIOLO_ADMIN_CODE as auth.
 */
export async function requireAdmin(options?: {
  adminCode?: string | null;
}): Promise<AdminAuthOk | AdminAuthFail> {
  const serverCode = (process.env.BAIOLO_ADMIN_CODE || "").trim();
  const publicCode = (process.env.NEXT_PUBLIC_BAIOLO_ADMIN_CODE || "").trim();
  const provided = (options?.adminCode || "").trim();

  const secretOk =
    Boolean(serverCode) &&
    provided === serverCode &&
    (!publicCode || serverCode !== publicCode);

  if (!isSupabaseConfigured()) {
    if (secretOk) {
      return { ok: true, userId: "local-admin", email: null };
    }
    const jar = await cookies();
    if (cookieMatchesAdminGate(jar.get(ADMIN_GATE_COOKIE)?.value, serverCode)) {
      return { ok: true, userId: "local-admin", email: null };
    }
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Brak uprawnień administratora.",
        },
        { status: 403 },
      ),
    };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "UNAUTHORIZED",
          message: "Zaloguj się, żeby użyć panelu admina.",
        },
        { status: 401 },
      ),
    };
  }

  const jwtRole =
    typeof user.app_metadata?.role === "string"
      ? user.app_metadata.role
      : null;

  const admin = getSupabaseServerClient();
  let profileRole: string | null = null;
  if (admin) {
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    profileRole = typeof profile?.role === "string" ? profile.role : null;
  }

  if (profileRole === "admin" || jwtRole === "admin") {
    return {
      ok: true,
      userId: user.id,
      email: user.email ?? null,
    };
  }

  if (secretOk && admin) {
    await admin.from("profiles").upsert({
      id: user.id,
      email: user.email ?? null,
      role: "admin",
      updated_at: new Date().toISOString(),
    });
    return {
      ok: true,
      userId: user.id,
      email: user.email ?? null,
    };
  }

  return {
    ok: false,
    response: NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "Brak uprawnień administratora.",
      },
      { status: 403 },
    ),
  };
}
