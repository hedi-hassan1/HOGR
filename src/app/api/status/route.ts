import { db, getSettings, IS_CLOUD, DB_URL, DB_TOKEN } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Setup check: open /api/status to see what is connected. Shows only yes/no, setting NAMES
 * and error text, never passwords, tokens or data.
 */
export async function GET() {
  const has = (k: string) => !!process.env[k];
  const related = Object.keys(process.env)
    .filter((k) => /TURSO|LIBSQL|DATABASE|BLOB|POSTGRES|REDIS|KV_|HOGR|CRON/i.test(k))
    .sort();
  const checks: Record<string, string | string[]> = {
    running_on: IS_CLOUD ? "Vercel" : "this computer",
    database_address: DB_URL ? "set" : IS_CLOUD ? "MISSING: connect Turso in Storage (Production), then Redeploy" : "local file",
    database_token: DB_TOKEN ? "set" : IS_CLOUD ? "MISSING: TURSO_AUTH_TOKEN" : "not needed",
    photo_storage: has("BLOB_READ_WRITE_TOKEN") ? "set" : IS_CLOUD ? "MISSING: create a Blob store in Storage and connect it" : "local folder",
    first_admin_password: has("HOGR_ADMIN_PASSWORD") ? "set" : "not set (a random one is printed in the logs on first start)",
    cron_secret: has("CRON_SECRET") ? "set" : "not set",
    related_setting_names: related.length ? related : ["none found"],
  };
  let database: string;
  try {
    const t0 = Date.now();
    const s = await getSettings();
    const users = (await db().prepare("SELECT COUNT(*) c FROM users").get()) as { c: number };
    database = `connected (${Date.now() - t0} ms, ${users.c} user${users.c === 1 ? "" : "s"}, company: ${s.company_name || "?"})`;
  } catch (e) {
    database = `NOT WORKING: ${String((e as Error)?.message || e).replace(/(token|authToken)=[^&\s]+/gi, "$1=***").slice(0, 300)}`;
  }
  const ok = database.startsWith("connected");
  return Response.json({ ok, database, ...checks }, { status: ok ? 200 : 503 });
}
