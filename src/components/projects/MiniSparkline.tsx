"use client";

import { cn } from "@/lib/cn";

export function MiniSparkline({
  points,
  className,
}: {
  points: number[];
  className?: string;
}) {
  const w = 96;
  const h = 28;
  const max = Math.max(1, ...points);
  const min = Math.min(0, ...points);
  const span = Math.max(1, max - min);
  const coords = points.map((p, i) => {
    const x = points.length <= 1 ? 0 : (i / (points.length - 1)) * w;
    const y = h - ((p - min) / span) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const path = coords.length ? `M ${coords.join(" L ")}` : "";

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("overflow-visible", className)}
      width={w}
      height={h}
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
