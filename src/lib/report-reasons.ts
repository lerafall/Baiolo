export type ReportReason = "unsafe" | "broken" | "mean" | "other";

export const reportReasons: Array<{ id: ReportReason; label: string }> = [
  { id: "unsafe", label: "Feels unsafe" },
  { id: "broken", label: "Broken or spammy" },
  { id: "mean", label: "Mean or unkind" },
  { id: "other", label: "Something else" },
];

export function reportReasonLabel(reason: ReportReason | undefined) {
  return reportReasons.find((r) => r.id === reason)?.label ?? "Reported";
}
