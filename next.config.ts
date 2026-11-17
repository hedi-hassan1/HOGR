import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "web-push"],
  // Files read at runtime by the share image and app icon routes (Vercel only ships files it can see being used)
  outputFileTracingIncludes: {
    "/[locale]/opengraph-image": ["./public/brand/**", "./public/images/work/darga4.jpg"],
    "/[locale]/apple-icon": ["./public/brand/**"],
    "/pwa-icon/[kind]": ["./public/brand/**"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
      // The phone link (Cloudflare quick tunnel) serves the app from a *.trycloudflare.com address
      allowedOrigins: ["*.trycloudflare.com"],
    },
  },
};

export default nextConfig;
