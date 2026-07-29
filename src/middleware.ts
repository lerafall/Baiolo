import { type NextRequest, NextResponse } from "next/server";
import {
  isLocale,
  LOCALE_COOKIE,
  localeFromAcceptLanguage,
  type Locale,
} from "@/lib/i18n/config";
import { middlewareUserIsAdmin } from "@/lib/admin-middleware";
import { updateSession } from "@/lib/supabase/middleware";

function resolveLocale(request: NextRequest): Locale {
  const fromQuery = request.nextUrl.searchParams.get("lang");
  if (isLocale(fromQuery)) return fromQuery;
  const fromCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  return localeFromAcceptLanguage(request.headers.get("accept-language"));
}

function setLocaleCookie(response: NextResponse, locale: Locale) {
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

function isAdminPagePath(pathname: string) {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    // Unlock bootstrap page is auth-only (not role-admin).
    if (pathname === "/admin/unlock" || pathname.startsWith("/admin/unlock/")) {
      return false;
    }
    return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const locale = resolveLocale(request);
  const wantedLang = request.nextUrl.searchParams.get("lang");

  if (isLocale(wantedLang)) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("lang");
    const redirect = NextResponse.redirect(url);
    setLocaleCookie(redirect, locale);
    return redirect;
  }

  // Hard gate for /admin UI before any page JS runs.
  if (isAdminPagePath(request.nextUrl.pathname)) {
    const status = await middlewareUserIsAdmin(request);
    if (status === "anon") {
      const login = new URL("/auth", request.url);
      login.searchParams.set("next", "/admin");
      return NextResponse.redirect(login);
    }
    if (status !== "admin") {
      // Explorers / creators / unknown → home (no PII panel).
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Signed-in required for unlock page; role not required.
  if (
    request.nextUrl.pathname === "/admin/unlock" ||
    request.nextUrl.pathname.startsWith("/admin/unlock/")
  ) {
    const status = await middlewareUserIsAdmin(request);
    if (status === "anon") {
      const login = new URL("/auth", request.url);
      login.searchParams.set("next", "/admin/unlock");
      return NextResponse.redirect(login);
    }
    if (status === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  const response = await updateSession(request);
  const existing = request.cookies.get(LOCALE_COOKIE)?.value;
  if (!isLocale(existing)) {
    setLocaleCookie(response, locale);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
