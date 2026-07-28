import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/config";

let browserClient: SupabaseClient | null = null;

/** Browser client — null when env is not configured (mock mode). */
export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) return null;
  if (browserClient) return browserClient;
  const { url, anonKey } = getSupabasePublicEnv();
  browserClient = createClient(url, anonKey);
  return browserClient;
}
