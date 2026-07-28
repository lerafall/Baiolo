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

import { DEFAULT_AVATAR } from "@/lib/avatars";

export type SessionRole = "guest" | "explorer" | "creator" | "admin";

export type BaioloSession = {
  userId: string | null;
  email: string | null;
  name: string;
  role: SessionRole;
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
  avatar: DEFAULT_AVATAR,
  interests: [],
  authMode: "mock",
};

type SessionContextValue = {
  session: BaioloSession;
  ready: boolean;
  isAdmin: boolean;
  signIn: (email: string) => Promise<string | null>;
  completeOnboarding: (data: {
    role: "create" | "explore" | "both";
    avatar: string;
    interests: string[];
  }) => Promise<void>;
  unlockAdmin: (code: string) => boolean;
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

      const applyUser = async (userId: string, email: string | null) => {
        const meta = (
          await supabase.auth.getUser()
        ).data.user?.app_metadata?.role as string | undefined;
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        const cur = readLocal();
        persist({
          userId,
          email,
          name: profile?.name || email?.split("@")[0] || cur.name || "Friend",
          avatar: profile?.avatar || cur.avatar || DEFAULT_AVATAR,
          interests: profile?.interests || cur.interests || [],
          role:
            meta === "admin"
              ? "admin"
              : mapRole(profile?.role || cur.role || "explorer"),
          authMode: "supabase",
        });
      };

      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (authSession?.user) {
        await applyUser(
          authSession.user.id,
          authSession.user.email ?? local.email,
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
        await applyUser(next.user.id, next.user.email ?? null);
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
      completeOnboarding,
      unlockAdmin,
      signOut,
    }),
    [session, ready, signIn, completeOnboarding, unlockAdmin, signOut],
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
