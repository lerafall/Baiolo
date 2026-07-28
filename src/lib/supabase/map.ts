import type {
  ProjectSubmission,
  ProjectStatus,
  RiskLevel,
  UploadType,
} from "@/lib/moderation";
import type { ProjectCategory } from "@/lib/types";

/** Raw row shape from public.projects */
export type ProjectRow = {
  id: string;
  owner_id?: string | null;
  upload_type: UploadType | null;
  source_label: string | null;
  title: string | null;
  description: string | null;
  category: ProjectCategory | null;
  tags: string[] | null;
  thumbnail_path: string | null;
  storage_path?: string | null;
  play_url?: string | null;
  status: ProjectStatus;
  risk: RiskLevel | null;
  ai_flags: string[] | null;
  change_request: string | null;
  plays: number | null;
  reactions: number | null;
  updated_at: string | null;
  published_at?: string | null;
};

export function rowToSubmission(row: ProjectRow): ProjectSubmission {
  return {
    id: row.id,
    uploadType: row.upload_type,
    sourceLabel: row.source_label ?? "",
    title: row.title ?? "",
    description: row.description ?? "",
    category: row.category,
    tags: row.tags ?? [],
    thumbnail: row.thumbnail_path ?? "",
    status: row.status,
    risk: row.risk,
    aiFlags: row.ai_flags ?? [],
    changeRequest: row.change_request,
    updatedAt: row.updated_at ?? new Date().toISOString(),
    plays: row.plays ?? 0,
    reactions: row.reactions ?? 0,
    ownerId: row.owner_id ?? null,
    storagePath: row.storage_path ?? null,
    playUrl: row.play_url ?? null,
  };
}

export function submissionToRow(s: ProjectSubmission) {
  return {
    id: s.id,
    owner_id: s.ownerId ?? null,
    upload_type: s.uploadType,
    source_label: s.sourceLabel,
    title: s.title,
    description: s.description,
    category: s.category,
    tags: s.tags ?? [],
    thumbnail_path: s.thumbnail,
    storage_path: s.storagePath ?? null,
    play_url: s.playUrl ?? null,
    status: s.status,
    risk: s.risk,
    ai_flags: s.aiFlags ?? [],
    change_request: s.changeRequest,
    plays: s.plays,
    reactions: s.reactions,
    updated_at: s.updatedAt,
    published_at: s.status === "published" ? s.updatedAt : null,
  };
}
