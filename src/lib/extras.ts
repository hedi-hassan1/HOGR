import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { headers } from "next/headers";
import { db, DATA_DIR, getSettings, type OrderItem } from "./db";

/* ======================= Links sent to clients ======================= */

/** Best public address for links that clients open: settings → env → phone link → this request. */
export async function publicBase(): Promise<{ url: string; local: boolean }> {
  const s = getSettings();
  const fixed = (s.site_url || process.env.HOGR_SITE_URL || "").replace(/\/$/, "");
  if (/^https?:\/\//.test(fixed)) return { url: fixed, local: false };
  try {
    const tunnel = fs.readFileSync(path.join(DATA_DIR, "phone-url.txt"), "utf8").trim();
    if (/^https:\/\//.test(tunnel)) return { url: tunnel, local: false };
  } catch {}
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return { url: `${proto}://${host}`, local: /^(localhost|127\.|192\.168\.|10\.)/.test(host) };
}

/** Random, unguessable token for an order's client page (created once). */
export function shareToken(orderId: number): string {
  const row = db().prepare("SELECT share_token FROM orders WHERE id = ?").get(orderId) as { share_token: string | null } | undefined;
  if (row?.share_token) return row.share_token;
  const t = crypto.randomBytes(12).toString("base64url");
  db().prepare("UPDATE orders SET share_token = ? WHERE id = ?").run(t, orderId);
  return t;
}

export function orderByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(token)) return undefined;
  return db()
    .prepare("SELECT o.*, c.name cname, c.phone cphone FROM orders o JOIN clients c ON c.id = o.client_id WHERE o.share_token = ?")
    .get(token) as
    | { id: number; client_id: number; cname: string; cphone: string | null; title: string | null; status: string; discount: number; due_date: string | null; notes: string | null; created_at: string; accepted_at: string | null; installed_at: string | null }
    | undefined;
}

/* ======================= Price list ======================= */

export type Price = { id: number; product_type: string; name_ckb: string | null; name_ar: string | null; name_en: string | null; unit: "piece" | "m2" | "m"; price: number; material: string | null; color: string | null; is_default: number; on_site: number; sort: number };

export function getPrices(): Price[] {
  return db().prepare("SELECT * FROM price_list ORDER BY product_type, sort, id").all() as Price[];
}
export const priceName = (p: Price, locale: string) =>
  (locale === "ckb" ? p.name_ckb : locale === "ar" ? p.name_ar : p.name_en) || p.name_en || p.name_ckb || "";

/** Best price for a measured item: same product + matching material, else the product's default. */
export function matchPrice(prices: Price[], type: string, material?: string | null): Price | undefined {
  const same = prices.filter((p) => p.product_type === type);
  const m = (material || "").toLowerCase().trim();
  return (m && same.find((p) => p.material && m.includes(p.material.toLowerCase()))) || same.find((p) => p.is_default) || same[0];
}

/* ======================= Materials ======================= */

export type MaterialLine = { key: "profile" | "glass" | "boards" | "hinges" | "handles" | "rails"; qty: number; unit: "unitBars" | "unitM2" | "unitSheets" | "unitPcs" | "unitPairs"; invCategory: string };

const BAR_M = 5.8; // usable length of a 6 m profile bar after cutting waste
const SHEET_M2 = 2.44 * 1.22;

/**
 * Rough material take-off from an order's items (cm sizes). Workshop rules of thumb:
 * - Windows: frame + sash profile ≈ 2.2 × perimeter; glass ≈ 85 % of the opening.
 * - Doors: frame + leaf profile ≈ 2 × perimeter; glass/panel ≈ 40 % of the opening.
 * - Cabinets (kitchen, wardrobe, bathroom, vanity): board ≈ 3.2 × front area (+10 % waste);
 *   one door per ~50 cm width, 2 hinges and 1 handle per door; kitchens get drawer rails.
 */
export function computeMaterials(items: Pick<OrderItem, "product_type" | "width" | "height" | "qty">[]): MaterialLine[] {
  let profileM = 0, glassM2 = 0, boardM2 = 0, doors = 0, rails = 0;
  for (const it of items) {
    const w = (it.width || 0) / 100, h = (it.height || 0) / 100, q = it.qty || 1;
    if (!w || !h) continue;
    if (it.product_type === "window") { profileM += 2 * (w + h) * 2.2 * q; glassM2 += w * h * 0.85 * q; }
    else if (it.product_type === "door") { profileM += 2 * (w + h) * 2 * q; glassM2 += w * h * 0.4 * q; }
    else if (["kitchen", "wardrobe", "bathroom", "vanity"].includes(it.product_type)) {
      boardM2 += w * h * 3.2 * 1.1 * q;
      const d = Math.max(1, Math.round(w / 0.5)) * q;
      doors += d;
      if (it.product_type === "kitchen") rails += Math.max(1, Math.round(w / 0.6)) * q;
    }
  }
  const lines: MaterialLine[] = [];
  if (profileM) lines.push({ key: "profile", qty: Math.ceil(profileM / BAR_M), unit: "unitBars", invCategory: "aluminium" });
  if (glassM2) lines.push({ key: "glass", qty: Math.round(glassM2 * 10) / 10, unit: "unitM2", invCategory: "glass" });
  if (boardM2) lines.push({ key: "boards", qty: Math.ceil(boardM2 / SHEET_M2), unit: "unitSheets", invCategory: "boards" });
  if (doors) {
    lines.push({ key: "hinges", qty: doors * 2, unit: "unitPcs", invCategory: "hardware" });
    lines.push({ key: "handles", qty: doors, unit: "unitPcs", invCategory: "hardware" });
  }
  if (rails) lines.push({ key: "rails", qty: rails, unit: "unitPairs", invCategory: "hardware" });
  return lines;
}

/* ======================= Backups ======================= */

const BACKUP_DIR = path.join(DATA_DIR, "backups");

export function listBackups() {
  try {
    return fs.readdirSync(BACKUP_DIR).filter((f) => /^hogr-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort().reverse()
      .map((f) => ({ file: f, size: fs.statSync(path.join(BACKUP_DIR, f)).size }));
  } catch {
    return [];
  }
}

/** Saves today's snapshot (and a copy in the extra folder if set); keeps the newest 30. */
export async function runBackup(force = false): Promise<{ ok: boolean; extraFailed?: boolean }> {
  const s = getSettings();
  const now = new Date();
  const day = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  if (!force && s.backup_last === day) return { ok: true };
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, `hogr-${day}.db`);
  const tmp = file + ".tmp";
  await db().backup(tmp);
  fs.renameSync(tmp, file);
  let extraFailed = false;
  if (s.backup_dir?.trim()) {
    try {
      fs.mkdirSync(s.backup_dir.trim(), { recursive: true });
      fs.copyFileSync(file, path.join(s.backup_dir.trim(), path.basename(file)));
    } catch {
      extraFailed = true;
    }
  }
  for (const old of listBackups().slice(30)) fs.rmSync(path.join(BACKUP_DIR, old.file), { force: true });
  db().prepare("INSERT INTO settings(key, value) VALUES ('backup_last', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(day);
  return { ok: true, extraFailed };
}

export const backupPath = (file: string) => (/^hogr-\d{4}-\d{2}-\d{2}\.db$/.test(file) ? path.join(BACKUP_DIR, file) : null);
