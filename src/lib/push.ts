import * as webpush from "web-push";
import { db, getSettings } from "./db";
import { getOverdue } from "./followup";
import { getDebts } from "./ops";

/*
 * Phone notifications with the standard Web Push system (the same one apps and websites use).
 * Each phone/computer that taps "Turn on notifications" is saved as a subscription; the server
 * signs messages with its own VAPID key pair, created once and kept in settings.
 */

function ensureTable() {
  db().exec(`CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY, endpoint TEXT NOT NULL UNIQUE, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, label TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
}

export function getVapid() {
  const s = getSettings();
  if (s.vapid_public && s.vapid_private) return { publicKey: s.vapid_public, privateKey: s.vapid_private };
  const k = webpush.generateVAPIDKeys();
  const up = db().prepare("INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  up.run("vapid_public", k.publicKey);
  up.run("vapid_private", k.privateKey);
  return k;
}

export type PushSub = { id: number; endpoint: string; p256dh: string; auth: string; label: string | null; created_at: string };

export function listSubscriptions(): PushSub[] {
  ensureTable();
  return db().prepare("SELECT * FROM push_subscriptions ORDER BY id DESC").all() as PushSub[];
}

export function saveSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, userId: number, label: string) {
  ensureTable();
  db()
    .prepare("INSERT INTO push_subscriptions(endpoint, p256dh, auth, user_id, label) VALUES (?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, user_id = excluded.user_id, label = excluded.label")
    .run(sub.endpoint, sub.keys.p256dh, sub.keys.auth, userId, label.slice(0, 80));
}

export function removeSubscription(id: number) {
  ensureTable();
  db().prepare("DELETE FROM push_subscriptions WHERE id = ?").run(id);
}

/** Number shown on the app icon: forgotten measurements + unpaid debts that are due + new website requests. */
export function badgeCount() {
  const leads = (db().prepare("SELECT COUNT(*) c FROM leads WHERE status = 'new'").get() as { c: number }).c;
  return getOverdue().length + getDebts().filter((d) => d.due).length + leads;
}

export type PushPayload = { title: string; body: string; url: string; tag?: string };

/** Sends to every saved device; removes devices that unsubscribed. Returns how many received it. */
export async function sendPush(p: PushPayload): Promise<number> {
  const subs = listSubscriptions();
  if (!subs.length) return 0;
  const { publicKey, privateKey } = getVapid();
  const s = getSettings();
  // The push services (Google, Apple, Mozilla) require a contact for the sender: the company website or email
  const subject = process.env.HOGR_SITE_URL || (s.email ? `mailto:${s.email}` : "mailto:admin@localhost");
  webpush.setVapidDetails(subject, publicKey, privateKey);
  const payload = JSON.stringify({ ...p, badge: badgeCount() });
  let ok = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 24 * 3600, urgency: "normal" });
        ok++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) removeSubscription(sub.id); // the device turned notifications off
      }
    }),
  );
  return ok;
}
