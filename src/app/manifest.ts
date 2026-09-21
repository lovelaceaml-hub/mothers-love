import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "The Words of Mother's Love",
    short_name: "Mother's Love",
    description: "A place to share words of appreciation and peace.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FFF6DC",
    theme_color: "#FFF6DC",
    icons: [
      {
        src: "/icons/butterfly-heart-v1-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/butterfly-heart-v1-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
