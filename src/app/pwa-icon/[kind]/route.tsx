import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

/**
 * App icons for the installed app and notifications, drawn from the logo:
 *   /pwa-icon/192, /pwa-icon/512  — graphite tile with the white mark
 *   /pwa-icon/maskable            — same with extra safe margin (Android crops icons into shapes)
 *   /pwa-icon/badge               — white mark on transparent (Android status bar)
 */
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const mark = fs.readFileSync(path.join(process.cwd(), "public/brand/hogr-mark-white.svg")).toString("base64");
  const src = `data:image/svg+xml;base64,${mark}`;

  if (kind === "badge") {
    return new ImageResponse(
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img src={src} width={84} height={84} alt="" />
      </div>,
      { width: 96, height: 96 },
    );
  }

  const size = kind === "192" ? 192 : 512;
  const markSize = Math.round(size * (kind === "maskable" ? 0.56 : 0.7));
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#202427" }}>
      <img src={src} width={markSize} height={markSize} alt="" />
    </div>,
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
