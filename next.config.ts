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
};

export default nextConfig;
