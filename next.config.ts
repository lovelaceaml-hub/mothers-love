import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  agentRules: false,
  env: {
    COLOR_POLISH_PREVIEW_BUILD: process.env.VERCEL_ENV === "preview" ? "true" : "false",
    // Lets an open TV page notice a new version and reload (DisplayBuildWatch).
    DISPLAY_BUILD_VERSION: process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || "",
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
        // The 3D Studio kit. Every kit version is its own folder (`/world-kit/v1`, then `v2`),
        // so a TV never refetches a file between visits. The Draco decoder in
        // `/world-kit/draco/` has no version folder, so it keeps the default revalidating cache
        // and a later three.js upgrade reaches every TV (Plan 28 Section 8).
        source: "/world-kit/:version(v\\d+)/:path*",
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
    // A preview without its own database borrows production's public TV reads. Once the
    // preview has a practice database (Plan 34 Section F) it reads and writes only that.
    if (process.env.VERCEL_ENV !== "preview" || process.env.DATABASE_URL?.trim()) return [];
    return {
      beforeFiles: [
        {
          source: "/api/display/color-polish",
          destination: "https://mothers-love.vercel.app/api/display/color-polish",
        },
        {
          source: "/api/display/likes-total",
          destination: "https://mothers-love.vercel.app/api/display/likes-total",
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
