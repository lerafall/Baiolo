import { isCatalogDemoId } from "@/lib/ownership";
import type { SupabaseClient } from "@supabase/supabase-js";

export type WriteGuardResult =
  | { ok: true; id: string; renamed: boolean }
  | { ok: false; reason: "foreign_owner" };

/** Fresh id for a submission that may not keep the one it asked for. */
export function freshProjectId() {
  const rand =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `p-${Date.now().toString(36)}-${rand}`;
}

/**
 * Decide whether a submission may be written under the id it asked for.
 *
 * Both write endpoints used to upsert straight onto a client-supplied id, so a
 * submission could land on top of any existing row — a curated catalog demo, or
 * somebody else's project. Curated ids get moved aside onto a fresh id so the
 * creator keeps their work; a row owned by another account is refused.
 */
export async function guardProjectWrite(
  supabase: SupabaseClient,
  requestedId: string,
  ownerId: string | null,
): Promise<WriteGuardResult> {
  if (isCatalogDemoId(requestedId)) {
    return { ok: true, id: freshProjectId(), renamed: true };
  }

  const { data: existing } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", requestedId)
    .maybeSingle();

  if (!existing) return { ok: true, id: requestedId, renamed: false };

  const existingOwner = (existing as { owner_id?: string | null }).owner_id ?? null;
  if (existingOwner && ownerId && existingOwner !== ownerId) {
    return { ok: false, reason: "foreign_owner" };
  }
  // Legacy rows with no owner recorded stay writable by the signed-in creator.
  return { ok: true, id: requestedId, renamed: false };
}
