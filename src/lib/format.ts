/** Stable number formatting for SSR + client (avoids hydration mismatches). */
export function formatCount(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

/** Stable date/time for client UIs. */
export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
