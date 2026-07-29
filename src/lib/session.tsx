"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { normalizePhone } from "@/lib/phone";
import {
  friendlyOAuthError,
  labelForProvider,
  type SocialProviderId,
} from "@/lib/social-auth";

import { DEFAULT_AVATAR } from "@/lib/avatars";

export type SessionRole = "guest" | "explorer" | "creator" | "admin";
export type SessionPlan = "free" | "pro" | "studio";

export type BaioloSession = {
  userId: string | null;
  email: string | null;
  name: string;
  role: SessionRole;
  plan: SessionPlan;
  avatar: string;
  interests: string[];
  authMode: "mock" | "supabase";
};

const STORAGE_KEY = "baiolo.session.v1";

const defaultSession: BaioloSession = {
  userId: null,
  email: null,
  name: "Guest",
  role: "guest",
  plan: "free",
  avatar: DEFAULT_AVATAR,
  interests: [],
  authMode: "mock",
};

type SessionContextValue = {
  session: BaioloSession;
  ready: boolean;
  isAdmin: boolean;
  signIn: (email: string) => Promise<string | null>;
  signInWithOAuth: (provider: SocialProviderId) => Promise<string | null>;
  signInWithWhatsApp: (phone: string) => Promise<string | null>;
  verifyWhatsAppOtp: (phone: string, token: string) => Promise<string | null>;
  completeOnboarding: (data: {
    role: "create" | "explore" | "both";
    avatar: string;
    interests: string[];
  }) => Promise<void>;
  unlockAdmin: (code: string) => boolean;
  setPlan: (plan: SessionPlan) => void;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function readLocal(): BaioloSession {
  if (typeof window === "undefined") return defaultSession;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSession;
    return { ...defaultSession, ...(JSON.parse(raw) as BaioloSession) };
  } catch {
    return defaultSession;
  }
}

function writeLocal(next: BaioloSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function identityFromAuthUser(user: {
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, unknown> | null;
  identities?: Array<{ identity_data?: Record<string, unknown> | null }> | null;
}) {
  const meta = user.user_metadata ?? {};
  const identityData = user.identities?.[0]?.identity_data ?? {};
  const pick = (...vals: unknown[]) => {
    for (const v of vals) {
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return null;
  };
  return pick(
    user.email,
    user.phone,
    meta.email,
    meta.full_name,
    meta.name,
    meta.preferred_username,
    meta.custom_claims &&
      typeof meta.custom_claims === "object" &&
      (meta.custom_claims as { global_name?: string }).global_name,
    identityData.email,
    identityData.full_name,
    identityData.name,
    identityData.preferred_username,
  );
}

function mapRole(
  role: "create" | "explore" | "both" | SessionRole | string | undefined,
): SessionRole {
  if (role === "create" || role === "creator") return "creator";
  if (role === "explore" || role === "explorer") return "explorer";
  if (role === "both") return "creator";
  if (role === "admin") return "admin";
  return "explorer";
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<BaioloSession>(defaultSession);
  const [ready, setReady] = useState(false);

  const persist = useCallback((next: BaioloSession) => {
    setSession(next);
    writeLocal(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const local = readLocal();

    void (async () => {
      if (!isSupabaseConfigured()) {
        if (!cancelled) {
          persist({ ...local, authMode: "mock" });
          setReady(true);
        }
        return;
      }

      const supabase = createSupabaseBrowser();
      if (!supabase) {
        if (!cancelled) {
          persist({ ...local, authMode: "mock" });
          setReady(true);
        }
        return;
      }

      const applyUser = async (
        userId: string,
        identity: string | null,
      ) => {
        const meta = (
          await supabase.auth.getUser()
        ).data.user?.app_metadata?.role as string | undefined;
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        const cur = readLocal();
        const label = identity || cur.email;
        const nextSession = {
          userId,
          email: label,
          name:
            profile?.name ||
            (label?.includes("@") ? label.split("@")[0] : null) ||
            (label?.startsWith("+") ? `WhatsApp ${label.slice(-4)}` : null) ||
            label ||
            cur.name ||
            "Friend",
          avatar: profile?.avatar || cur.avatar || DEFAULT_AVATAR,
          interests: profile?.interests || cur.interests || [],
          plan:
            profile?.plan === "free"
              ? "free"
              : profile?.plan === "pro" ||
                  profile?.plan === "paid" ||
                  profile?.plan === "paid_basic"
                ? "pro"
                : profile?.plan === "studio" || profile?.plan === "paid_pro"
                  ? "studio"
                  : cur.plan || "free",
          role:
            meta === "admin"
              ? ("admin" as const)
              : mapRole(profile?.role || cur.role || "explorer"),
          authMode: "supabase" as const,
        };
        persist(nextSession);

        if (!profile) {
          void supabase.from("profiles").upsert({
            id: userId,
            email: label,
            name: nextSession.name,
            avatar: nextSession.avatar,
            role: nextSession.role,
            plan: nextSession.plan,
            interests: nextSession.interests,
            updated_at: new Date().toISOString(),
          });
        }
      };

      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (authSession?.user) {
        await applyUser(
          authSession.user.id,
          identityFromAuthUser(authSession.user) ?? local.email,
        );
      } else {
        persist({
          ...defaultSession,
          ...local,
          userId: null,
          authMode: "supabase",
          role:
            local.role === "admin"
              ? "admin"
              : local.email
                ? local.role
                : "guest",
        });
      }
      if (!cancelled) setReady(true);

      const { data } = supabase.auth.onAuthStateChange(async (_event, next) => {
        if (!next?.user) {
          const cur = readLocal();
          persist({
            ...defaultSession,
            avatar: cur.avatar,
            interests: cur.interests,
            authMode: "supabase",
          });
          return;
        }
        await applyUser(
          next.user.id,
          identityFromAuthUser(next.user),
        );
      });
      unsubscribe = () => data.subscription.unsubscribe();
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [persist]);

  const signIn = useCallback(
    async (email: string) => {
      const trimmed = email.trim();
      if (!trimmed.includes("@")) return "Add a valid email.";

      if (!isSupabaseConfigured()) {
        persist({
          ...readLocal(),
          email: trimmed,
          name: trimmed.split("@")[0] || "Friend",
          role: "explorer",
          authMode: "mock",
        });
        return null;
      }

      const supabase = createSupabaseBrowser();
      if (!supabase) {
        persist({
          ...readLocal(),
          email: trimmed,
          name: trimmed.split("@")[0] || "Friend",
          role: "explorer",
          authMode: "mock",
        });
        return null;
      }

      const origin = window.location.origin;
      const next = new URLSearchParams(window.location.search).get("next");
      const redirectTo = `${origin}/auth/callback${
        next ? `?next=${encodeURIComponent(next)}` : ""
      }`;

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        persist({
          ...readLocal(),
          email: trimmed,
          name: trimmed.split("@")[0] || "Friend",
          role: "explorer",
          authMode: "supabase",
        });
        return `Magic link couldn’t send (${error.message}). Continuing in demo mode for this browser.`;
      }

      persist({
        ...readLocal(),
        email: trimmed,
        name: trimmed.split("@")[0] || "Friend",
        role: "explorer",
        authMode: "supabase",
      });
      return null;
    },
    [persist],
  );

  const signInWithOAuth = useCallback(
    async (provider: SocialProviderId) => {
      if (!isSupabaseConfigured()) {
        return "Social login needs cloud auth. Enable Supabase providers first.";
      }

      const supabase = createSupabaseBrowser();
      if (!supabase) {
        return "Social login isn’t available right now.";
      }

      const origin = window.location.origin;
      const next = new URLSearchParams(window.location.search).get("next");
      const redirectTo = `${origin}/auth/callback${
        next ? `?next=${encodeURIComponent(next)}` : ""
      }`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          // Stay on Baiolo until we know the provider is enabled.
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        return friendlyOAuthError(provider, error.message);
      }
      if (!data?.url) {
        return `Couldn’t start ${labelForProvider(provider)} sign-in.`;
      }

      // Disabled providers return JSON 400 on /authorize (blank “Pretty-print” page).
      try {
        const probe = await fetch("/api/auth/oauth-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: data.url }),
        });
        const result = (await probe.json()) as {
          ok?: boolean;
          message?: string;
        };
        if (!result.ok) {
          return friendlyOAuthError(provider, result.message || "");
        }
      } catch {
        // Probe failed — still try the normal redirect.
      }

      window.location.assign(data.url);
      return null;
    },
    [],
  );

  const signInWithWhatsApp = useCallback(async (phone: string) => {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      return "Add a phone number with country code, e.g. +48…";
    }

    if (!isSupabaseConfigured()) {
      persist({
        ...readLocal(),
        email: normalized,
        name: `WhatsApp ${normalized.slice(-4)}`,
        role: "explorer",
        authMode: "mock",
      });
      return null;
    }

    const supabase = createSupabaseBrowser();
    if (!supabase) {
      return "WhatsApp login isn’t available right now.";
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone: normalized,
      options: { channel: "whatsapp" },
    });

    if (error) {
      return error.message || "Couldn’t send a WhatsApp code.";
    }
    return null;
  }, [persist]);

  const verifyWhatsAppOtp = useCallback(
    async (phone: string, token: string) => {
      const normalized = normalizePhone(phone);
      const code = token.replace(/\s/g, "");
      if (!normalized) return "Add a valid phone number.";
      if (code.length < 4) return "Enter the code from WhatsApp.";

      if (!isSupabaseConfigured()) {
        persist({
          ...readLocal(),
          email: normalized,
          name: `WhatsApp ${normalized.slice(-4)}`,
          role: "explorer",
          authMode: "mock",
        });
        return null;
      }

      const supabase = createSupabaseBrowser();
      if (!supabase) return "WhatsApp login isn’t available right now.";

      const { data, error } = await supabase.auth.verifyOtp({
        phone: normalized,
        token: code,
        type: "sms",
      });

      if (error) {
        return error.message || "That code didn’t work.";
      }

      const user = data.user;
      if (user) {
        persist({
          ...readLocal(),
          userId: user.id,
          email: user.phone ?? normalized,
          name: `WhatsApp ${(user.phone ?? normalized).slice(-4)}`,
          role: "explorer",
          authMode: "supabase",
        });
      }
      return null;
    },
    [persist],
  );

  const completeOnboarding = useCallback(
    async (data: {
      role: "create" | "explore" | "both";
      avatar: string;
      interests: string[];
    }) => {
      const current = readLocal();
      const role = mapRole(data.role);
      const next: BaioloSession = {
        ...current,
        avatar: data.avatar,
        interests: data.interests,
        role: current.role === "admin" ? "admin" : role,
      };
      persist(next);

      if (isSupabaseConfigured() && next.userId) {
        const supabase = createSupabaseBrowser();
        await supabase?.from("profiles").upsert({
          id: next.userId,
          email: next.email,
          name: next.name,
          avatar: next.avatar,
          role: next.role,
          plan: next.plan,
          interests: next.interests,
          updated_at: new Date().toISOString(),
        });
      }
    },
    [persist],
  );

  const unlockAdmin = useCallback(
    (code: string) => {
      const expected =
        process.env.NEXT_PUBLIC_BAIOLO_ADMIN_CODE || "baiolo-admin";
      if (code.trim() !== expected) return false;
      persist({ ...readLocal(), role: "admin" });
      return true;
    },
    [persist],
  );

  const setPlan = useCallback(
    (plan: SessionPlan) => {
      persist({ ...readLocal(), plan });
    },
    [persist],
  );

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured()) {
      await createSupabaseBrowser()?.auth.signOut();
    }
    localStorage.removeItem(STORAGE_KEY);
    setSession({
      ...defaultSession,
      authMode: isSupabaseConfigured() ? "supabase" : "mock",
    });
  }, []);

  const value = useMemo(
    () => ({
      session,
      ready,
      isAdmin: session.role === "admin",
      signIn,
      signInWithOAuth,
      signInWithWhatsApp,
      verifyWhatsAppOtp,
      completeOnboarding,
      unlockAdmin,
      setPlan,
      signOut,
    }),
    [
      session,
      ready,
      signIn,
      signInWithOAuth,
      signInWithWhatsApp,
      verifyWhatsAppOtp,
      completeOnboarding,
      unlockAdmin,
      setPlan,
      signOut,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
