import type { NextConfig } from "next";
const config: NextConfig = {
  experimental: { proxyClientMaxBodySize: "12mb" },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination:
          (process.env.API_PROXY_TARGET || "http://127.0.0.1:4000") +
          "/api/:path*",
      },
    ];
  },
  // Stop browsers caching the service worker so deploys update it
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};
export default config;
