/**
 * Offline / mock private play — store workshop files in localStorage
 * so creators can play without Supabase unpack.
 */

import type { StarterFiles } from "@/lib/html-starters";
import { buildPreviewHtml } from "@/lib/html-starters";

const PREFIX = "baiolo.mock-play.v1.";

export function mockPlayStorageKey(projectId: string) {
  return `${PREFIX}${projectId}`;
}

export function saveMockPlayFiles(
  projectId: string,
  files: StarterFiles,
): string {
  if (typeof window === "undefined") return `#mock-play/${projectId}`;
  try {
    localStorage.setItem(
      mockPlayStorageKey(projectId),
      JSON.stringify({ files, savedAt: new Date().toISOString() }),
    );
  } catch {
    /* quota */
  }
  return `#mock-play/${projectId}`;
}

export function readMockPlayFiles(projectId: string): StarterFiles | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(mockPlayStorageKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { files?: StarterFiles };
    if (!parsed.files?.["index.html"]) return null;
    return parsed.files;
  } catch {
    return null;
  }
}

export function mockPlaySrcDoc(projectId: string): string | null {
  const files = readMockPlayFiles(projectId);
  if (!files) return null;
  return buildPreviewHtml(files);
}

export function isMockPlayUrl(url: string | null | undefined) {
  return Boolean(url && url.startsWith("#mock-play/"));
}

export function mockPlayIdFromUrl(url: string) {
  if (!isMockPlayUrl(url)) return null;
  return url.replace(/^#mock-play\//, "").split(/[?#]/)[0] || null;
}
