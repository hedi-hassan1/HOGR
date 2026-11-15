import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "HOGR CO.";

const file = (p: string) => fs.readFileSync(path.join(process.cwd(), "public", p));

/** Link preview image: the logo on graphite beside a photo of HOGR's work. No text, so it suits every language. */
export default function OgImage() {
  const logo = `data:image/svg+xml;base64,${file("brand/hogr-logo-white.svg").toString("base64")}`;
  const photo = `data:image/jpeg;base64,${file("images/work/darga4.jpg").toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#202427" }}>
        <div style={{ width: 660, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 72px" }}>
          <img src={logo} width={480} height={(480 * 48) / 205.49} alt="" />
          <div style={{ display: "flex", alignItems: "center", marginTop: 48, width: 480 }}>
            <div style={{ width: 2, height: 22, background: "#A07A3F" }} />
            <div style={{ flex: 1, height: 2, background: "#A07A3F" }} />
            <div style={{ width: 2, height: 22, background: "#A07A3F" }} />
          </div>
        </div>
        <img src={photo} width={540} height={630} style={{ objectFit: "cover" }} alt="" />
      </div>
    ),
    size,
  );
}
