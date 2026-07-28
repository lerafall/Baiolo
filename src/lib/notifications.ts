"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProjectStatus } from "@/lib/moderation";
import { statusCopy } from "@/lib/moderation";

const KEY = "baiolo.notifications.v1";
const SEEN_KEY = "baiolo.status-seen.v1";

export type BaioloNotification = {
  id: string;
  projectId: string;
  title: string;
  status: ProjectStatus;
  message: string;
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

export function useNotifications(
  projects: Array<{ id: string; title: string; status: ProjectStatus }>,
) {
  const [notes, setNotes] = useState<BaioloNotification[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setNotes(readNotes());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || projects.length === 0) return;
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
          message: statusCopy[p.status].message,
          createdAt: new Date().toISOString(),
          read: false,
        });
      }
      nextSeen[p.id] = p.status;
    }

    if (fresh.length > 0) {
      const merged = [...fresh, ...readNotes()];
      writeNotes(merged);
      setNotes(merged);
    }
    writeSeen(nextSeen);
  }, [projects, ready]);

  const unread = notes.filter((n) => !n.read).length;

  const markRead = useCallback((id: string) => {
    const next = readNotes().map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    writeNotes(next);
    setNotes(next);
  }, []);

  const markAllRead = useCallback(() => {
    const next = readNotes().map((n) => ({ ...n, read: true }));
    writeNotes(next);
    setNotes(next);
  }, []);

  return { notes, unread, ready, markRead, markAllRead };
}
