import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { backupPath } from "@/lib/extras";

export const dynamic = "force-dynamic";

/** Downloads a consistent snapshot of the whole database (admins only). */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user || user.role !== "admin") return new Response("Forbidden", { status: 403 });
  const file = new URL(req.url).searchParams.get("file");
  if (file) {
    const p = backupPath(file);
    if (!p || !fs.existsSync(p)) return new Response("Not found", { status: 404 });
    return new Response(fs.readFileSync(p), { headers: { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="${file}"` } });
  }
  const tmp = path.join(os.tmpdir(), `hogr-backup-${Date.now()}.db`);
  await db().backup(tmp);
  const data = fs.readFileSync(tmp);
  fs.rmSync(tmp, { force: true });
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(data, {
    headers: { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="hogr-backup-${stamp}.db"` },
  });
}
