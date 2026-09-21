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
        src: "/api/app-icon?v=butterfly-heart-v2",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
