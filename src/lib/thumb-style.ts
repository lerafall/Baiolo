import type { CSSProperties } from "react";

/** True when thumbnail/cover is an image URL (not a CSS gradient). */
export function isImageThumb(value: string) {
  return (
    value.startsWith("data:") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/")
  );
}

export function thumbBackgroundStyle(value: string): CSSProperties {
  if (isImageThumb(value)) {
    return {
      backgroundImage: `url(${value})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundColor: "#e0cfff",
    };
  }
  return { background: value };
}
