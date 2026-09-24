import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  agentRules: false,
  env: {
    COLOR_POLISH_PREVIEW_BUILD: process.env.VERCEL_ENV === "preview" ? "true" : "false",
  },
  outputFileTracingIncludes: {
    "/api/tv-v6": ["./prototypes/tv-v6/Mothers_Love_TV_Prototype_v6.html"],
  },
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/color-polish/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
      {
        // The 3D Studio kit and its Draco decoder. Every kit version is its own folder
        // (`/world-kit/v1`, then `v2`), so a TV never refetches a file between visits.
        source: "/world-kit/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  async redirects() {
    // The 3D world moved to its own address, `/world` (Plan 28 Section 5). Old preview links
    // keep working: the query string passes through unchanged. Temporary, so a browser never
    // pins it.
    return [{ source: "/display/world-preview", destination: "/world", permanent: false }];
  },
  async rewrites() {
    // Preview uses the public TV read endpoints without database credentials.
    if (process.env.VERCEL_ENV !== "preview") return [];
    return {
      beforeFiles: [
        {
          source: "/api/display/color-polish",
          destination: "https://mothers-love.vercel.app/api/display/color-polish",
        },
        {
          source: "/api/reactions",
          destination: "https://mothers-love.vercel.app/api/reactions",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
