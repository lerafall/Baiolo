import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server-auth";

export async function GET(request: Request) {
  const supabase = await createSupabaseServer();
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/explore";

  if (supabase && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/explore"}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=link`);
}
