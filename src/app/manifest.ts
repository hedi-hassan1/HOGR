import type { MetadataRoute } from "next";

/** Lets staff add the management system to a phone's home screen as an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HOGR CO.",
    short_name: "HOGR",
    description: "HOGR CO. — doors, windows and cabinets across the Kurdistan Region",
    id: "/admin",
    start_url: "/ckb/admin",
    scope: "/",
    display: "standalone",
    background_color: "#202427",
    theme_color: "#202427",
    icons: [
      { src: "/brand/hogr-app-icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
