import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { IS_CLOUD } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { backupPath, exportJson, snapshotTo } from "@/lib/extras";
import { todayISO } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Downloads a backup (admins only): a saved daily file, a fresh SQLite copy, or online a JSON export. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user || user.role !== "admin") return new Response("Forbidden", { status: 403 });
  const file = new URL(req.url).searchParams.get("file");
  if (file) {
    const p = backupPath(file);
    if (!p || !fs.existsSync(p)) return new Response("Not found", { status: 404 });
    return new Response(fs.readFileSync(p), { headers: { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="${file}"` } });
  }
  const stamp = todayISO();
  if (IS_CLOUD) {
    const data = JSON.stringify(await exportJson());
    return new Response(data, { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="hogr-backup-${stamp}.json"` } });
  }
  const tmp = path.join(os.tmpdir(), `hogr-backup-${Date.now()}.db`);
  await snapshotTo(tmp);
  const data = fs.readFileSync(tmp);
  fs.rmSync(tmp, { force: true });
  return new Response(data, {
    headers: { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="hogr-backup-${stamp}.db"` },
  });
}
