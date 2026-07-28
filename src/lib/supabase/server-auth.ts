import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/config";

/** Cookie-aware server client (user session). */
export async function createSupabaseServer() {
  if (!isSupabaseConfigured()) return null;
  const { url, anonKey } = getSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* called from a Server Component — ignore */
        }
      },
    },
  });
}
