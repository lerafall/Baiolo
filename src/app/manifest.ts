import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Baiolo",
    short_name: "Baiolo",
    description:
      "A playful place to share prototypes, test ideas, and find what people love.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff8ef",
    theme_color: "#8b5cf6",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
