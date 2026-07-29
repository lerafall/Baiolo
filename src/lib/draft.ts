import type { UploadType } from "@/lib/moderation";
import type { ProjectCategory } from "@/lib/types";

export const DRAFT_KEY = "baiolo.create-draft.v1";

export type CreateDraft = {
  id: string;
  step: number;
  uploadType: UploadType | null;
  sourceLabel: string;
  packageReady: boolean;
  title: string;
  description: string;
  category: ProjectCategory | null;
  tags: string[];
  thumb: string;
  fileSizeLabel?: string;
  hints?: string[];
};

export const THUMB_OPTIONS = [
  "linear-gradient(145deg, #a78bfa 0%, #2dd4bf 55%, #fbbf24 100%)",
  "linear-gradient(145deg, #ff6b4a 0%, #fbbf24 45%, #2dd4bf 100%)",
  "linear-gradient(145deg, #f9a8d4 0%, #c4b5fd 50%, #99f6e4 100%)",
  "linear-gradient(145deg, #fbbf24 0%, #fdba74 40%, #c4b5fd 100%)",
];

export function newDraftId() {
  return `draft-${Date.now().toString(36)}`;
}

export function emptyDraft(): CreateDraft {
  return {
    id: newDraftId(),
    step: 0,
    uploadType: null,
    sourceLabel: "",
    packageReady: false,
    title: "",
    description: "",
    category: null,
    tags: [],
    thumb: THUMB_OPTIONS[0],
    hints: [],
  };
}

export function readDraft(): CreateDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CreateDraft;
    return { ...emptyDraft(), ...parsed, tags: parsed.tags ?? [] };
  } catch {
    return null;
  }
}

export function writeDraft(draft: CreateDraft) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

/** Map legacy English hint strings (old drafts) to translation keys. */
const LEGACY_HINT_KEYS: Record<string, string> = {
  "This works best as a ZIP. We’ll still try to help.": "create.hintNotZip",
  "This file is quite big. A smaller pack is easier to share.": "create.hintBig",
  "Looking good — your project package is ready.": "create.hintLookingGood",
  "Your project package is ready.": "create.hintPackageReady",
  "Tip: include a start file next time if you can.": "create.hintTipStart",
  "Add a file or folder name first.": "create.hintAddName",
};

/** Resolve a draft hint (key or legacy English) for display. */
export function resolveDraftHint(
  hint: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  if (hint.startsWith("create.")) return t(hint);
  const key = LEGACY_HINT_KEYS[hint];
  return key ? t(key) : hint;
}

/** Friendly packaging helper — never technical jargon. */
export function buildPackageFromFile(file: File): {
  sourceLabel: string;
  packageReady: boolean;
  fileSizeLabel: string;
  hints: string[];
  suggestedTitle: string;
} {
  const name = file.name;
  const sizeMb = file.size / (1024 * 1024);
  const fileSizeLabel =
    sizeMb < 0.1
      ? `${Math.round(file.size / 1024)} KB`
      : `${sizeMb.toFixed(1)} MB`;

  const hints: string[] = [];
  const lower = name.toLowerCase();
  const isZip = lower.endsWith(".zip");

  if (!isZip) {
    hints.push("create.hintNotZip");
  }
  if (sizeMb > 80) {
    hints.push("create.hintBig");
  }

  const base = name.replace(/\.(zip|rar|7z)$/i, "").replace(/[-_]+/g, " ");
  const suggestedTitle = base
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .slice(0, 40);

  return {
    sourceLabel: name,
    packageReady: true,
    fileSizeLabel,
    hints: hints.length > 0 ? hints : ["create.hintLookingGood"],
    suggestedTitle: suggestedTitle || "My project",
  };
}

export function buildPackageFromLabel(label: string): {
  sourceLabel: string;
  packageReady: boolean;
  hints: string[];
} {
  const trimmed = label.trim();
  if (!trimmed) {
    return {
      sourceLabel: "",
      packageReady: false,
      hints: ["create.hintAddName"],
    };
  }
  const hints = [".zip", ".html", "index"].some((p) =>
    trimmed.toLowerCase().includes(p.replace(".", "")),
  )
    ? ["create.hintPackageReady"]
    : ["create.hintPackageReady", "create.hintTipStart"];

  return { sourceLabel: trimmed, packageReady: true, hints };
}
