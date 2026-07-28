"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProjectSubmission } from "@/lib/moderation";
import { progressCheckingSubmissions } from "@/lib/status-progress";

const STORAGE_KEY = "baiolo.submissions.v1";

const seed: ProjectSubmission[] = [
  {
    id: "cloud-hopper",
    uploadType: "zip",
    sourceLabel: "cloud-hopper.zip",
    title: "Cloud Hopper",
    description: "Jump soft clouds. Catch sun coins.",
    category: "game",
    tags: ["platformer", "cozy", "mobile"],
    thumbnail:
      "linear-gradient(145deg, #a78bfa 0%, #2dd4bf 55%, #fbbf24 100%)",
    status: "published",
    risk: "low",
    aiFlags: [],
    changeRequest: null,
    updatedAt: new Date().toISOString(),
    plays: 1284,
    reactions: 864,
  },
  {
    id: "petal-puzzle",
    uploadType: "template",
    sourceLabel: "Starter · Game",
    title: "Petal Puzzle",
    description: "Arrange flowers. Calm your brain.",
    category: "game",
    tags: ["puzzle", "calm", "cozy"],
    thumbnail:
      "linear-gradient(145deg, #f9a8d4 0%, #c4b5fd 50%, #99f6e4 100%)",
    status: "in_review",
    risk: "low",
    aiFlags: [],
    changeRequest: null,
    updatedAt: new Date().toISOString(),
    plays: 0,
    reactions: 0,
  },
  {
    id: "shadow-lab",
    uploadType: "link",
    sourceLabel: "https://example.com/shadow-lab",
    title: "Shadow Lab",
    description: "A spooky lighting experiment.",
    category: "experiment",
    tags: ["experiment", "art"],
    thumbnail:
      "linear-gradient(145deg, #312e81 0%, #7c3aed 50%, #f472b6 100%)",
    status: "needs_changes",
    risk: "medium",
    aiFlags: ["Cover looks a bit intense for younger players"],
    changeRequest: "Please soften the cover colors a little.",
    updatedAt: new Date().toISOString(),
    plays: 0,
    reactions: 0,
  },
];

function readStore(): ProjectSubmission[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as ProjectSubmission[];
    return parsed.map((s) => ({ ...s, tags: s.tags ?? [] }));
  } catch {
    return seed;
  }
}

function writeStore(items: ProjectSubmission[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function mergeRemoteWithLocalDrafts(
  remote: ProjectSubmission[],
  local: ProjectSubmission[],
) {
  const byId = new Map(remote.map((r) => [r.id, r]));
  for (const item of local) {
    if (item.status === "draft" && !byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}

async function pushRemote(submission: ProjectSubmission) {
  if (submission.status === "draft") return;
  try {
    await fetch("/api/projects/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    });
  } catch {
    /* keep local; next tick / refresh can retry */
  }
}

export function useSubmissions() {
  const [items, setItems] = useState<ProjectSubmission[]>([]);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"mock" | "supabase">("mock");
  const modeRef = useRef<"mock" | "supabase">("mock");

  const saveAll = useCallback((next: ProjectSubmission[]) => {
    setItems(next);
    writeStore(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const health = await fetch("/api/health").then(
        (r) => r.json() as Promise<{ mode?: string }>,
      );
      if (health.mode !== "supabase") {
        modeRef.current = "mock";
        setMode("mock");
        const initial = progressCheckingSubmissions(readStore());
        writeStore(initial);
        setItems(initial);
        return;
      }

      modeRef.current = "supabase";
      setMode("supabase");
      const res = await fetch("/api/projects?scope=all");
      const data = (await res.json()) as {
        items?: ProjectSubmission[];
        error?: string;
      };
      if (!res.ok || !data.items) return;

      const local = readStore();
      const merged = mergeRemoteWithLocalDrafts(data.items, local);
      writeStore(merged);
      setItems(merged);
    } catch {
      /* stay on current local cache */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const health = await fetch("/api/health").then(
          (r) => r.json() as Promise<{ mode?: string }>,
        );
        if (cancelled) return;

        if (health.mode === "supabase") {
          modeRef.current = "supabase";
          setMode("supabase");
          const res = await fetch("/api/projects?scope=all");
          const data = (await res.json()) as {
            items?: ProjectSubmission[];
          };
          if (cancelled) return;
          if (res.ok && data.items) {
            const merged = mergeRemoteWithLocalDrafts(data.items, readStore());
            writeStore(merged);
            setItems(merged);
            setReady(true);
          } else {
            const initial = progressCheckingSubmissions(readStore());
            writeStore(initial);
            setItems(initial);
            setReady(true);
          }
        } else {
          modeRef.current = "mock";
          setMode("mock");
          const initial = progressCheckingSubmissions(readStore());
          writeStore(initial);
          setItems(initial);
          setReady(true);
        }
      } catch {
        if (cancelled) return;
        const initial = progressCheckingSubmissions(readStore());
        writeStore(initial);
        setItems(initial);
        setReady(true);
      }
    })();

    const tick = window.setInterval(() => {
      const current = readStore();
      const next = progressCheckingSubmissions(current);
      if (next === current) return;
      writeStore(next);
      setItems(next);

      if (modeRef.current === "supabase") {
        for (let i = 0; i < next.length; i += 1) {
          const before = current.find((c) => c.id === next[i].id);
          if (before && before.status !== next[i].status) {
            void pushRemote(next[i]);
          }
        }
      }
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(tick);
    };
  }, []);

  const upsert = useCallback(
    (submission: ProjectSubmission) => {
      const current = readStore();
      const idx = current.findIndex((s) => s.id === submission.id);
      const next =
        idx >= 0
          ? current.map((s, i) => (i === idx ? submission : s))
          : [submission, ...current];
      saveAll(next);
      if (modeRef.current === "supabase") {
        void pushRemote(submission);
      }
      return submission;
    },
    [saveAll],
  );

  const updateStatus = useCallback(
    (
      id: string,
      status: ProjectSubmission["status"],
      extra?: Partial<ProjectSubmission>,
    ) => {
      const current = readStore();
      const next = current.map((s) =>
        s.id === id
          ? {
              ...s,
              ...extra,
              status,
              updatedAt: new Date().toISOString(),
            }
          : s,
      );
      saveAll(next);
      const updated = next.find((s) => s.id === id);
      if (updated && modeRef.current === "supabase") {
        void pushRemote(updated);
      }
    },
    [saveAll],
  );

  return { items, ready, mode, upsert, updateStatus, saveAll, refresh };
}
