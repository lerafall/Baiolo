import type { NextRequest } from "next/server";

/**
 * Public site origin for redirects (OAuth callback, etc.).
 * Never use 0.0.0.0 / bind addresses from Docker HOSTNAME.
 */
export function getPublicSiteOrigin(request?: NextRequest): string {
  const fromEnv = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    ""
  ).trim().replace(/\/$/, "");
  if (fromEnv && !isBadHost(fromEnv)) return fromEnv;

  if (request) {
    const forwardedHost = firstHeader(request, "x-forwarded-host");
    const hostHeader = firstHeader(request, "host");
    const host = forwardedHost || hostHeader;
    const proto =
      firstHeader(request, "x-forwarded-proto") ||
      (request.nextUrl.protocol === "http:" ? "http" : "https");

    if (host && !isBadHost(host)) {
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  }

  const domain = (process.env.BAIOLO_DOMAIN || "baiolo.com").trim();
  return `https://${domain.replace(/^https?:\/\//, "")}`;
}

function firstHeader(request: NextRequest, name: string) {
  return request.headers.get(name)?.split(",")[0]?.trim() || "";
}

function isBadHost(value: string) {
  const lower = value.toLowerCase();
  return (
    lower.includes("0.0.0.0") ||
    lower.includes("127.0.0.1") ||
    (lower.includes("localhost") && process.env.NODE_ENV === "production")
  );
}
