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

/**
 * Download a private ZIP, extract static files into project-public,
 * and return a public URL to index.html when possible.
 */
export async function publishZipForPlay(
  supabase: SupabaseClient,
  storagePath: string,
  projectId: string,
): Promise<string | null> {
  const { data: file, error: downloadError } = await supabase.storage
    .from("project-private")
    .download(storagePath);
  if (downloadError || !file) return null;

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Keep raw ZIP as download fallback.
  const zipPublicPath = `published/${projectId}/package.zip`;
  await supabase.storage.from("project-public").upload(zipPublicPath, bytes, {
    contentType: "application/zip",
    upsert: true,
  });

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    const { data } = supabase.storage
      .from("project-public")
      .getPublicUrl(zipPublicPath);
    return data.publicUrl || null;
  }

  const entryNames = Object.keys(zip.files).filter(
    (name) => !zip.files[name].dir && !shouldSkipZipEntry(name),
  );
  const prefix = sharedRootPrefix(entryNames);
  const siteRoot = `published/${projectId}/site`;

  let rootIndex: string | null = null;
  let nestedIndex: string | null = null;

  for (const name of entryNames) {
    const relative = prefix ? name.slice(prefix.length) : name;
    if (!relative) continue;
    const data = await zip.files[name].async("uint8array");
    const dest = `${siteRoot}/${relative}`.replace(/\\/g, "/");
    await supabase.storage.from("project-public").upload(dest, data, {
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
    // Serve through Baiolo proxy so HTML/CSS/JS get correct MIME types.
    const relative = playPath.slice(`published/${projectId}/site/`.length);
    return `/api/play-site/${projectId}/${relative}`;
  }

  const { data } = supabase.storage
    .from("project-public")
    .getPublicUrl(zipPublicPath);
  return data.publicUrl || null;
}
