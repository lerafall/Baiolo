import type { ProjectSubmission } from "@/lib/moderation";
import { rowToSubmission } from "@/lib/supabase/map";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The project a moderation action should act on.
 *
 * Both admin endpoints used to trust the whole project object posted by the
 * browser, which made them fragile — a tab opened before a change carried stale
 * paths and the action failed — and unsound, since `canPublish` was checked
 * against state the caller supplied. The row in the database is the truth; the
 * request only says which project.
 */
export async function loadModerationTarget(
  projectId: string | null | undefined,
  posted: ProjectSubmission | null | undefined,
): Promise<{ project: ProjectSubmission | null; source: "db" | "posted" }> {
  const id = (projectId || posted?.id || "").trim();
  if (!id) return { project: null, source: "posted" };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (data) return { project: rowToSubmission(data), source: "db" };
      return { project: null, source: "db" };
    }
  }

  // Mock mode keeps working from the posted copy — there is no row to read.
  return { project: posted ?? null, source: "posted" };
}
