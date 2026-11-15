import fs from "node:fs";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/db";

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif" };

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  const name = path.basename(parts.join("/"));
  const file = path.join(UPLOAD_DIR, name);
  const type = TYPES[path.extname(name).toLowerCase()];
  if (!type || !fs.existsSync(file)) return new Response("Not found", { status: 404 });
  return new Response(fs.readFileSync(file), { headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" } });
}
