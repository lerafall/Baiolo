/** Only allow same-origin relative paths for post-auth redirects. */
export function safeNextPath(
  raw: string | null | undefined,
  fallback = "/explore",
) {
  if (!raw) return fallback;
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return fallback;
  }
  return value;
}

export function authHref(next?: string | null) {
  if (!next) return "/auth";
  const path = safeNextPath(next, "");
  if (!path) return "/auth";
  return `/auth?next=${encodeURIComponent(path)}`;
}
