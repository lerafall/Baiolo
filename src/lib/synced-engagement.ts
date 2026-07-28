"use client";

import { useCallback } from "react";
import type { ReactionKind } from "@/lib/types";
import { useProjectEngagement } from "@/lib/engagement";
import { useSubmissions } from "@/lib/submissions";

/**
 * Engagement that also bumps creator dashboard counters for owned submissions.
 */
export function useSyncedEngagement(projectId: string) {
  const engagement = useProjectEngagement(projectId);
  const { items, upsert } = useSubmissions();

  const bumpSubmission = useCallback(
    (playsDelta = 0, reactionsDelta = 0) => {
      const sub = items.find((s) => s.id === projectId);
      if (!sub || sub.status !== "published") return;
      upsert({
        ...sub,
        plays: Math.max(0, sub.plays + playsDelta),
        reactions: Math.max(0, sub.reactions + reactionsDelta),
        updatedAt: new Date().toISOString(),
      });
    },
    [items, projectId, upsert],
  );

  const setReaction = useCallback(
    (kind: ReactionKind | null) => {
      const prev = engagement.reaction;
      engagement.setReaction(kind);
      if (!prev && kind) bumpSubmission(0, 1);
      if (prev && !kind) bumpSubmission(0, -1);
      if (prev && kind && prev !== kind) {
        /* swap — net zero */
      }
    },
    [bumpSubmission, engagement],
  );

  const recordPlay = useCallback(() => {
    engagement.recordPlay();
    bumpSubmission(1, 0);
  }, [bumpSubmission, engagement]);

  return {
    ...engagement,
    setReaction,
    recordPlay,
  };
}
