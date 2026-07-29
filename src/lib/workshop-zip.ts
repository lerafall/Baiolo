import JSZip from "jszip";
import type { StarterFiles } from "@/lib/html-starters";

/** Pack workshop files into a Baiolo-ready ZIP (index.html at root). */
export async function zipWorkshopFiles(files: StarterFiles): Promise<Blob> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }
  return zip.generateAsync({ type: "blob" });
}
