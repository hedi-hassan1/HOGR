import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "web-push"],
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
      // The phone link (Cloudflare quick tunnel) serves the app from a *.trycloudflare.com address
      allowedOrigins: ["*.trycloudflare.com"],
    },
  },
};

export default nextConfig;
