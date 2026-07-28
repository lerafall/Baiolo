import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/config";

export function createSupabaseBrowser() {
  if (!isSupabaseConfigured()) return null;
  const { url, anonKey } = getSupabasePublicEnv();
  return createBrowserClient(url, anonKey);
}
