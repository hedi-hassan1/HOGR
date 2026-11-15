import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iPhone/iPad: the white mark on a graphite square (iOS rounds the corners). */
export default function AppleIcon() {
  const mark = fs.readFileSync(path.join(process.cwd(), "public/brand/hogr-mark-white.svg")).toString("base64");
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#202427" }}>
        <img src={`data:image/svg+xml;base64,${mark}`} width={124} height={124} alt="" />
      </div>
    ),
    size,
  );
}
