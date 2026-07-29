import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import {
  ADMIN_GATE_COOKIE,
  cookieMatchesAdminGate,
} from "@/lib/admin-auth-shared";

/**
 * Edge-safe admin check for middleware /admin routes.
 * Fail-closed: missing config or role → not admin.
 */
export async function middlewareUserIsAdmin(
  request: NextRequest,
): Promise<"admin" | "user" | "anon" | "unknown"> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon) {
    const serverCode = (process.env.BAIOLO_ADMIN_CODE || "").trim();
    const token = request.cookies.get(ADMIN_GATE_COOKIE)?.value;
    if (await cookieMatchesAdminGate(token, serverCode)) return "admin";
    return "anon";
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        /* middleware session refresh handled elsewhere */
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "anon";

  const jwtRole =
    typeof user.app_metadata?.role === "string"
      ? user.app_metadata.role
      : null;
  if (jwtRole === "admin") return "admin";

  if (!service) return "unknown";

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile, error } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return "unknown";
  if (profile?.role === "admin") return "admin";
  return "user";
}

/** Unused helper kept for typing clarity when composing responses. */
export function nextPassthrough(request: NextRequest) {
  return NextResponse.next({ request });
}
