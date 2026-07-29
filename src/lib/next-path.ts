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

export type AuthMode = "join" | "signin";

export function authModeFromSearch(raw: string | null | undefined): AuthMode {
  return raw === "signin" ? "signin" : "join";
}

export function authHref(
  next?: string | null,
  options?: { mode?: AuthMode },
) {
  const params = new URLSearchParams();
  if (next) {
    const path = safeNextPath(next, "");
    if (path) params.set("next", path);
  }
  if (options?.mode === "signin") params.set("mode", "signin");
  const qs = params.toString();
  return qs ? `/auth?${qs}` : "/auth";
}
