"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { isImageThumb } from "@/lib/thumb-style";

const FALLBACK_SRC =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="224" height="160" viewBox="0 0 224 160">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#c4f1e0"/>
          <stop offset="55%" stop-color="#fde68a"/>
          <stop offset="100%" stop-color="#fda4af"/>
        </linearGradient>
      </defs>
      <rect width="224" height="160" fill="url(#g)"/>
      <text x="112" y="86" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="#3f3a36">Baiolo</text>
    </svg>`,
  );

function withCacheBust(url: string, bust?: string | null) {
  if (!bust || url.startsWith("data:")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(bust)}`;
}

type ProjectThumbProps = {
  src: string;
  alt?: string;
  updatedAt?: string | null;
  className?: string;
};

export function ProjectThumb({
  src,
  alt = "",
  updatedAt,
  className,
}: ProjectThumbProps) {
  const image = isImageThumb(src);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const displaySrc = failed
    ? FALLBACK_SRC
    : image
      ? withCacheBust(src, updatedAt)
      : "";

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src, updatedAt]);

  if (!image) {
    return (
      <div
        className={cn(
          "shrink-0 overflow-hidden rounded-lg bg-cover bg-center",
          className,
        )}
        style={{ background: src || "linear-gradient(145deg,#c4f1e0,#fde68a)" }}
        role="img"
        aria-label={alt || undefined}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg bg-canvas",
        className,
      )}
    >
      {!loaded && (
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-mint/40 via-lilac/50 to-warning/30"
          aria-hidden
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={displaySrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setFailed(true);
          setLoaded(true);
        }}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
