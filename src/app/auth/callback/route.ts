import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { safeNextPath } from "@/lib/next-path";
import {
  getSupabasePublicEnv,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

/**
 * OAuth / magic-link return. Must set auth cookies on the redirect response
 * or the browser stays logged out and the header still shows Join.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"), "/explore");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(`${origin}/auth?error=oauth`);
  }

  if (!code || !isSupabaseConfigured()) {
    return NextResponse.redirect(
      `${origin}/auth?error=${code ? "oauth" : "link"}`,
    );
  }

  const { url, anonKey } = getSupabasePublicEnv();
  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/auth?error=oauth`);
  }

  return response;
}
