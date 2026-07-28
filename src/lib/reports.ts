"use client";

import { useCallback, useEffect, useState } from "react";
import {
  reportReasonLabel,
  reportReasons,
  type ReportReason,
} from "@/lib/report-reasons";

export { reportReasonLabel, reportReasons, type ReportReason };

const KEY = "baiolo.reports.v1";

export type ContentReport = {
  id: string;
  projectId: string;
  projectTitle: string;
  reason: ReportReason;
  createdAt: string;
  resolved: boolean;
};

function read(): ContentReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ContentReport[];
    return parsed.map((r) => ({
      ...r,
      reason: r.reason ?? "other",
    }));
  } catch {
    return [];
  }
}

function write(items: ContentReport[]) {
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 100)));
}

export function addContentReport(
  projectId: string,
  projectTitle: string,
  reason: ReportReason = "other",
) {
  const items = read();
  if (items.some((r) => r.projectId === projectId && !r.resolved)) {
    return items;
  }
  const next = [
    {
      id: `rep-${Date.now().toString(36)}`,
      projectId,
      projectTitle,
      reason,
      createdAt: new Date().toISOString(),
      resolved: false,
    },
    ...items,
  ];
  write(next);
  return next;
}

export function useContentReports() {
  const [items, setItems] = useState<ContentReport[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(read());
    setReady(true);
  }, []);

  const refresh = useCallback(() => setItems(read()), []);

  const resolve = useCallback((id: string) => {
    const next = read().map((r) =>
      r.id === id ? { ...r, resolved: true } : r,
    );
    write(next);
    setItems(next);
  }, []);

  const open = items.filter((r) => !r.resolved);

  return { items, open, ready, refresh, resolve };
}
