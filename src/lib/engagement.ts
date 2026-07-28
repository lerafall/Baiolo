"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactionKind } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useSession } from "@/lib/session";

const KEY = "baiolo.engagement.v1";
const ANON_KEY = "baiolo.anon-id.v1";

type ProjectEngagement = {
  reaction: ReactionKind | null;
  feedbackNotes: string[];
  reported: boolean;
  plays: number;
};

type Store = Record<string, ProjectEngagement>;

function empty(): ProjectEngagement {
  return {
    reaction: null,
    feedbackNotes: [],
    reported: false,
    plays: 0,
  };
}

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

function anonId() {
  if (typeof window === "undefined") return "anon:ssr";
  try {
    const existing = localStorage.getItem(ANON_KEY);
    if (existing) return existing;
    const id = `anon:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(ANON_KEY, id);
    return id;
  } catch {
    return "anon:local";
  }
}

export type CreatorFeedbackItem = {
  projectId: string;
  notes: string[];
};

/** Notes left on the creator's projects (local engagement store). */
export function readCreatorFeedback(
  projectIds: string[],
): CreatorFeedbackItem[] {
  const store = read();
  return projectIds
    .map((projectId) => ({
      projectId,
      notes: store[projectId]?.feedbackNotes ?? [],
    }))
    .filter((item) => item.notes.length > 0);
}

export function useCreatorFeedback(projectIds: string[]) {
  const [items, setItems] = useState<CreatorFeedbackItem[]>([]);
  const [ready, setReady] = useState(false);
  const key = projectIds.join("|");

  useEffect(() => {
    setItems(readCreatorFeedback(projectIds));
    setReady(true);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps -- key encodes ids

  return { items, ready };
}

function pushRemote(projectId: string, userKey: string, next: ProjectEngagement) {
  if (!isSupabaseConfigured()) return;
  void fetch("/api/engagement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      userKey,
      reaction: next.reaction,
      feedbackNotes: next.feedbackNotes,
      reported: next.reported,
      plays: next.plays,
    }),
  });
}

export function useProjectEngagement(projectId: string) {
  const { session } = useSession();
  const userKey = session.userId || anonId();
  const [data, setData] = useState<ProjectEngagement>(empty);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const store = read();
    setData(store[projectId] ?? empty());
    setReady(true);

    if (!isSupabaseConfigured()) return;
    void fetch(
      `/api/engagement?projectId=${encodeURIComponent(projectId)}&userKey=${encodeURIComponent(userKey)}`,
    )
      .then((r) => r.json())
      .then((payload: { item?: {
        reaction: string | null;
        feedback_notes: string[];
        reported: boolean;
        plays: number;
      } | null }) => {
        if (!payload.item) return;
        const remote: ProjectEngagement = {
          reaction: (payload.item.reaction as ReactionKind | null) ?? null,
          feedbackNotes: payload.item.feedback_notes ?? [],
          reported: payload.item.reported,
          plays: payload.item.plays ?? 0,
        };
        const merged = {
          reaction: remote.reaction ?? store[projectId]?.reaction ?? null,
          feedbackNotes:
            remote.feedbackNotes.length > 0
              ? remote.feedbackNotes
              : store[projectId]?.feedbackNotes ?? [],
          reported: remote.reported || store[projectId]?.reported || false,
          plays: Math.max(remote.plays, store[projectId]?.plays ?? 0),
        };
        const nextStore = read();
        nextStore[projectId] = merged;
        write(nextStore);
        setData(merged);
      })
      .catch(() => undefined);
  }, [projectId, userKey]);

  const persist = useCallback(
    (next: ProjectEngagement) => {
      const store = read();
      store[projectId] = next;
      write(store);
      setData(next);
      pushRemote(projectId, userKey, next);
    },
    [projectId, userKey],
  );

  const setReaction = useCallback(
    (kind: ReactionKind | null) => {
      persist({ ...data, reaction: kind });
    },
    [data, persist],
  );

  const addFeedback = useCallback(
    (note: string) => {
      const trimmed = note.trim();
      if (!trimmed) return;
      persist({
        ...data,
        feedbackNotes: [...data.feedbackNotes, trimmed].slice(-20),
      });
    },
    [data, persist],
  );

  const report = useCallback(() => {
    persist({ ...data, reported: true });
  }, [data, persist]);

  const recordPlay = useCallback(() => {
    persist({ ...data, plays: data.plays + 1 });
  }, [data, persist]);

  return {
    ready,
    reaction: data.reaction,
    feedbackNotes: data.feedbackNotes,
    reported: data.reported,
    localPlays: data.plays,
    setReaction,
    addFeedback,
    report,
    recordPlay,
  };
}
