import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/config";

let serverClient: SupabaseClient | null = null;

/** Server client for Route Handlers. Falls back to null in mock mode. */
export function getSupabaseServerClient() {
  if (!isSupabaseConfigured()) return null;
  if (serverClient) return serverClient;
  const { url, anonKey } = getSupabasePublicEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;
  serverClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serverClient;
}
