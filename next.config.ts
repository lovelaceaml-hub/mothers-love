import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  agentRules: false,
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
    ];
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
