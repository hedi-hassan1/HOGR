import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

export const SESSION_COOKIE = "hogr_session";
const SESSION_DAYS = 30;

export type User = { id: number; name: string; username: string; role: "admin" | "staff" };

export async function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  db().prepare("INSERT INTO sessions(token, user_id, expires_at) VALUES (?,?,?)").run(token, userId, expires.toISOString());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.HOGR_INSECURE_COOKIE !== "1",
    path: "/",
    expires,
  });
}

export async function getUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = db()
    .prepare(
      "SELECT u.id, u.name, u.username, u.role, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?",
    )
    .get(token) as (User & { expires_at: string }) | undefined;
  if (!row || new Date(row.expires_at) < new Date()) return null;
  return { id: row.id, name: row.name, username: row.username, role: row.role };
}

export async function requireUser(locale = "ckb"): Promise<User> {
  const u = await getUser();
  if (!u) redirect(`/${locale}/admin/login`);
  return u;
}

export async function destroySession() {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) db().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  c.delete(SESSION_COOKIE);
}
