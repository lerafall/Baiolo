import JSZip from "jszip";
import type { SupabaseClient } from "@supabase/supabase-js";
import { contentTypeFor } from "@/lib/content-type";

function shouldSkipZipEntry(name: string) {
  const base = name.split("/").pop() || "";
  return (
    name.includes("__MACOSX/") ||
    base.startsWith(".") ||
    base === "Thumbs.db" ||
    base === "desktop.ini"
  );
}

/** If every file shares one top folder, strip it so index.html lands at site root. */
function sharedRootPrefix(paths: string[]) {
  if (paths.length === 0) return "";
  const first = paths[0];
  const slash = first.indexOf("/");
  if (slash <= 0) return "";
  const prefix = first.slice(0, slash + 1);
  return paths.every((p) => p.startsWith(prefix)) ? prefix : "";
}

export type ExtractStage = "review" | "published";

/**
 * Download a private ZIP, extract static files, return a Baiolo proxy URL to index.
 * - review → project-private review/{id}/site (owner private play + admin preview)
 * - published → project-public published/{id}/site (public Explore play)
 */
export async function extractZipForPlay(
  supabase: SupabaseClient,
  storagePath: string,
  projectId: string,
  stage: ExtractStage = "published",
): Promise<string | null> {
  const { data: file, error: downloadError } = await supabase.storage
    .from("project-private")
    .download(storagePath);
  if (downloadError || !file) return null;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const bucket = stage === "published" ? "project-public" : "project-private";
  const root = stage === "published" ? `published/${projectId}` : `review/${projectId}`;

  if (stage === "published") {
    await supabase.storage.from(bucket).upload(`${root}/package.zip`, bytes, {
      contentType: "application/zip",
      upsert: true,
    });
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    if (stage === "published") {
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(`${root}/package.zip`);
      return data.publicUrl || null;
    }
    return null;
  }

  const entryNames = Object.keys(zip.files).filter(
    (name) => !zip.files[name].dir && !shouldSkipZipEntry(name),
  );
  const prefix = sharedRootPrefix(entryNames);
  const siteRoot = `${root}/site`;

  let rootIndex: string | null = null;
  let nestedIndex: string | null = null;

  for (const name of entryNames) {
    const relative = prefix ? name.slice(prefix.length) : name;
    if (!relative) continue;
    const data = await zip.files[name].async("uint8array");
    const dest = `${siteRoot}/${relative}`.replace(/\\/g, "/");
    await supabase.storage.from(bucket).upload(dest, data, {
      contentType: contentTypeFor(relative),
      upsert: true,
    });

    const lower = relative.toLowerCase();
    if (lower === "index.html" || lower === "index.htm") {
      rootIndex = dest;
    } else if (
      !nestedIndex &&
      (lower.endsWith("/index.html") || lower.endsWith("/index.htm"))
    ) {
      nestedIndex = dest;
    }
  }

  const playPath = rootIndex || nestedIndex;
  if (playPath) {
    const relative = playPath.slice(`${siteRoot}/`.length);
    if (stage === "review") {
      return `/api/owner-play-site/${projectId}/${relative}`;
    }
    return `/api/play-site/${projectId}/${relative}`;
  }

  if (stage === "published") {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(`${root}/package.zip`);
    return data.publicUrl || null;
  }
  return null;
}

/** @deprecated Prefer extractZipForPlay(..., "published") */
export async function publishZipForPlay(
  supabase: SupabaseClient,
  storagePath: string,
  projectId: string,
): Promise<string | null> {
  return extractZipForPlay(supabase, storagePath, projectId, "published");
}
