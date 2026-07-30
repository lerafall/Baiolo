"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProjectStatus } from "@/lib/moderation";

const KEY = "baiolo.notifications.v1";
const SEEN_KEY = "baiolo.status-seen.v1";

export type BaioloNotification = {
  id: string;
  projectId: string;
  title: string;
  status: ProjectStatus;
  /** Legacy English blob — UI should prefer i18n statusMsg.{status}. */
  message?: string;
  createdAt: string;
  read: boolean;
};

function readNotes(): BaioloNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BaioloNotification[]) : [];
  } catch {
    return [];
  }
}

function writeNotes(notes: BaioloNotification[]) {
  localStorage.setItem(KEY, JSON.stringify(notes.slice(0, 40)));
}

function readSeen(): Record<string, ProjectStatus> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ProjectStatus>) : {};
  } catch {
    return {};
  }
}

function writeSeen(seen: Record<string, ProjectStatus>) {
  localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
}

/** Keep only the newest notification per project (clearest current status). */
export function dedupeNotesByProject(
  notes: BaioloNotification[],
): BaioloNotification[] {
  const best = new Map<string, BaioloNotification>();
  for (const n of notes) {
    const prev = best.get(n.projectId);
    if (!prev || Date.parse(n.createdAt) >= Date.parse(prev.createdAt)) {
      best.set(n.projectId, n);
    }
  }
  return Array.from(best.values()).sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

export function useNotifications(
  projects: Array<{ id: string; title: string; status: ProjectStatus }>,
  /** When false, skip prune/sync so a loading empty list does not wipe notes. */
  watchReady = true,
) {
  const [notes, setNotes] = useState<BaioloNotification[]>([]);
  const [ready, setReady] = useState(false);

  const projectIds = useMemo(
    () => new Set(projects.map((p) => p.id)),
    [projects],
  );

  useEffect(() => {
    const stored = dedupeNotesByProject(readNotes());
    writeNotes(stored);
    setNotes(stored);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !watchReady) return;
    const seen = readSeen();
    const fresh: BaioloNotification[] = [];
    const nextSeen = { ...seen };

    for (const p of projects) {
      const prev = seen[p.id];
      if (prev && prev !== p.status) {
        fresh.push({
          id: `${p.id}-${p.status}-${Date.now()}`,
          projectId: p.id,
          title: p.title,
          status: p.status,
          createdAt: new Date().toISOString(),
          read: false,
        });
      }
      nextSeen[p.id] = p.status;
    }

    // Drop notes for projects we no longer watch (e.g. catalog demos).
    const allStored = readNotes();
    const existing = allStored.filter((n) => projectIds.has(n.projectId));

    if (fresh.length > 0 || existing.length !== allStored.length) {
      // New status replaces older rows for the same project.
      const withoutStaleProjects = existing.filter(
        (n) => !fresh.some((f) => f.projectId === n.projectId),
      );
      const merged = dedupeNotesByProject([...fresh, ...withoutStaleProjects]);
      writeNotes(merged);
      setNotes(merged);
    } else if (fresh.length === 0) {
      // Still surface deduped owned notes if storage was already clean.
      setNotes(dedupeNotesByProject(existing));
    }
    writeSeen(nextSeen);
  }, [projects, projectIds, ready, watchReady]);

  const displayNotes = useMemo(() => dedupeNotesByProject(notes), [notes]);
  const unread = displayNotes.filter((n) => !n.read).length;

  const markRead = useCallback((id: string) => {
    const next = dedupeNotesByProject(
      readNotes().map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    writeNotes(next);
    setNotes(next);
  }, []);

  const markAllRead = useCallback(() => {
    const next = dedupeNotesByProject(
      readNotes().map((n) => ({ ...n, read: true })),
    );
    writeNotes(next);
    setNotes(next);
  }, []);

  return { notes: displayNotes, unread, ready, markRead, markAllRead };
}
