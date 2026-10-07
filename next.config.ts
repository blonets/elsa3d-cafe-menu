import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  outputFileTracingIncludes: {
    "/**": ["./drizzle/**"],
  },
  async headers() {
    return [
      {
        source: "/api/availability",
        headers: [
          { key: "Cache-Control", value: "s-maxage=15, stale-while-revalidate=30" },
        ],
      },
    ];
  },
};

export default nextConfig;
