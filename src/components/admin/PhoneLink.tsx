import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import { Smartphone } from "lucide-react";
import { DATA_DIR } from "@/lib/db";

/** The public https address written by scripts/phone-link.mjs while the phone link is running. */
export function getPhoneUrl(): string | null {
  try {
    const url = fs.readFileSync(path.join(DATA_DIR, "phone-url.txt"), "utf8").trim();
    return /^https:\/\/[a-z0-9.-]+$/i.test(url) ? url : null;
  } catch {
    return null;
  }
}

/** Desktop-only card with a QR code that opens the given page on a phone. */
export async function PhoneLink({ path: target, L }: { path: string; L: { title: string; text: string; none: string } }) {
  const base = getPhoneUrl();
  const url = base ? base + target : null;
  const svg = url ? await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#202427", light: "#ffffff" } }) : null;

  return (
    <section className="mb-4 hidden items-center gap-5 rounded-xl border border-line bg-white p-4 md:flex">
      {svg ? (
        <div className="h-28 w-28 shrink-0" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-stone"><Smartphone size={22} /></span>
      )}
      <div className="min-w-0">
        <h2 className="font-semibold">{L.title}</h2>
        <p className="mt-1 text-sm text-muted">{svg ? L.text : L.none}</p>
        {url && <a href={url} className="mt-1 block truncate text-xs text-muted underline" dir="ltr">{url}</a>}
      </div>
    </section>
  );
}
