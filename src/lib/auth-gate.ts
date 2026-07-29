"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authHref } from "@/lib/next-path";
import { useSession } from "@/lib/session";

/** True when the user has a Baiolo account session. */
export function useSignedIn() {
  const { session, ready } = useSession();
  const signedIn = ready && Boolean(session.userId || session.email);
  return { signedIn, ready, session };
}

/**
 * Returns a guard that redirects guests to /auth?next=… then runs the action.
 * Use for play, reactions, favorites, and other member-only actions.
 */
export function useRequireAuth(returnPath?: string) {
  const router = useRouter();
  const pathname = usePathname();
  const { signedIn, ready, session } = useSignedIn();
  const next = returnPath || pathname || "/explore";

  const requireAuth = useCallback(
    (action?: () => void) => {
      if (!ready) return false;
      if (signedIn) {
        action?.();
        return true;
      }
      router.push(authHref(next));
      return false;
    },
    [ready, signedIn, router, next],
  );

  return { requireAuth, signedIn, ready, session, authUrl: authHref(next) };
}

export function projectPublicUrl(projectId: string, origin?: string) {
  const base =
    origin ||
    (typeof window !== "undefined" ? window.location.origin : "https://baiolo.com");
  return `${base}/project/${projectId}`;
}

export function shareText(title: string, tagline: string) {
  return `Try “${title}” on Baiolo — ${tagline}`;
}

export function useShareLinks(projectId: string, title: string, tagline: string) {
  return useMemo(() => {
    const url =
      typeof window !== "undefined"
        ? projectPublicUrl(projectId)
        : `https://baiolo.com/project/${projectId}`;
    const text = shareText(title, tagline);
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);
    return {
      url,
      text,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    };
  }, [projectId, title, tagline]);
}
