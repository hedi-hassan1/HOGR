"use server";

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, getSettings, hashPassword, verifyPassword, IS_CLOUD, UPLOAD_DIR } from "@/lib/db";
import { del as blobDelete, put as blobPut } from "@vercel/blob";
import { runDebtAlerts, runReminders, sendMonthReport } from "@/lib/notify";
import { removeSubscription, saveSubscription, sendPush } from "@/lib/push";
import { debtWhatsAppLink, getDebts, waNumber } from "@/lib/ops";
import { computeMaterials, getPrices, matchPrice, orderByToken, priceName, publicBase, runBackup, shareToken } from "@/lib/extras";
import { orderNo } from "@/lib/db";
import { createSession, destroySession, getUser, requireUser } from "@/lib/auth";
import { getDict, isLocale, LOCALES } from "@/lib/i18n";
import { getAt, IMAGE_SLOTS, SECTIONS, SECTION_TOGGLES } from "@/lib/content";
import { todayISO } from "@/lib/format";

/* ---------------- helpers ---------------- */

const str = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v.slice(0, 5000);
};
const numv = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").replace(/,/g, "").trim();
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const idv = (f: FormData, k = "id") => {
  const n = Number(f.get(k));
  return Number.isInteger(n) && n > 0 ? n : null;
};
const loc = (f: FormData) => {
  const l = String(f.get("locale") || "ckb");
  return isLocale(l) ? l : "ckb";
};

async function guard(f: FormData) {
  const locale = loc(f);
  const user = await requireUser(locale);
  return { locale, user, base: `/${locale}/admin` };
}

function back(f: FormData, fallback: string): never {
  const b = String(f.get("back") || "");
  revalidatePath("/", "layout");
  redirect(b.startsWith("/") && !b.startsWith("//") ? b : fallback);
}

/* ---------------- auth ---------------- */

export async function login(_prev: { error?: boolean } | null | FormData, fArg?: FormData) {
  const f = fArg ?? (_prev as FormData);
  const locale = loc(f);
  const username = (str(f, "username") || "").toLowerCase();
  const password = String(f.get("password") || "");
  const u = await db().prepare("SELECT id, password_hash FROM users WHERE lower(username) = ?").get(username) as { id: number; password_hash: string } | undefined;
  if (!u || !verifyPassword(password, u.password_hash)) return { error: true };
  await db().prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString());
  await createSession(u.id);
  redirect(`/${locale}/admin`);
}

export async function logout(f: FormData) {
  await destroySession();
  redirect(`/${loc(f)}/admin/login`);
}

/* ---------------- clients ---------------- */

export async function saveClient(f: FormData) {
  const { base } = await guard(f);
  const id = idv(f);
  const vals = [str(f, "name") || "—", str(f, "phone"), str(f, "phone2"), str(f, "address"), str(f, "city"), str(f, "source"), str(f, "notes")];
  let cid = id;
  if (id) await db().prepare("UPDATE clients SET name=?, phone=?, phone2=?, address=?, city=?, source=?, notes=? WHERE id=?").run(...vals, id);
  else cid = Number((await db().prepare("INSERT INTO clients(name, phone, phone2, address, city, source, notes) VALUES (?,?,?,?,?,?,?)").run(...vals)).lastInsertRowid);
  back(f, `${base}/clients/${cid}`);
}

/* Related records are removed explicitly: the online database may not apply ON DELETE rules on its own. */
async function purgeOrder(id: number) {
  await db().prepare("DELETE FROM order_items WHERE order_id = ?").run(id);
  await db().prepare("DELETE FROM payments WHERE order_id = ?").run(id);
  await db().prepare("UPDATE expenses SET order_id = NULL WHERE order_id = ?").run(id);
  await db().prepare("UPDATE reviews SET order_id = NULL WHERE order_id = ?").run(id);
  await db().prepare("DELETE FROM orders WHERE id = ?").run(id);
}
async function purgeMeasurement(id: number) {
  await db().prepare("DELETE FROM measurement_items WHERE measurement_id = ?").run(id);
  await db().prepare("UPDATE orders SET measurement_id = NULL WHERE measurement_id = ?").run(id);
  await db().prepare("DELETE FROM measurements WHERE id = ?").run(id);
}

export async function deleteClient(f: FormData) {
  const { base } = await guard(f);
  const id = idv(f);
  if (id) {
    await db().transaction(async () => {
      for (const o of (await db().prepare("SELECT id FROM orders WHERE client_id = ?").all(id)) as { id: number }[]) await purgeOrder(o.id);
      for (const m of (await db().prepare("SELECT id FROM measurements WHERE client_id = ?").all(id)) as { id: number }[]) await purgeMeasurement(m.id);
      await db().prepare("DELETE FROM payments WHERE client_id = ?").run(id);
      await db().prepare("UPDATE bookings SET client_id = NULL WHERE client_id = ?").run(id);
      await db().prepare("UPDATE leads SET client_id = NULL WHERE client_id = ?").run(id);
      await db().prepare("UPDATE reviews SET client_id = NULL WHERE client_id = ?").run(id);
      await db().prepare("DELETE FROM clients WHERE id = ?").run(id);
    })();
  }
  back(f, `${base}/clients`);
}

/* ---------------- bookings ---------------- */

export async function saveBooking(f: FormData) {
  const { base } = await guard(f);
  const id = idv(f);
  const vals = [
    idv(f, "client_id"), str(f, "name"), str(f, "phone"), str(f, "type") || "measurement", str(f, "date") || todayISO(),
    str(f, "time"), str(f, "address"), str(f, "status") || "scheduled", str(f, "assigned_to"), str(f, "notes"),
    idv(f, "worker_id"), numv(f, "duration") ? Math.round(numv(f, "duration")! * 60) : null,
  ];
  if (id) await db().prepare("UPDATE bookings SET client_id=?, name=?, phone=?, type=?, date=?, time=?, address=?, status=?, assigned_to=?, notes=?, worker_id=?, duration_min=? WHERE id=?").run(...vals, id);
  else await db().prepare("INSERT INTO bookings(client_id, name, phone, type, date, time, address, status, assigned_to, notes, worker_id, duration_min) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run(...vals);
  back(f, `${base}/bookings`);
}

export async function setBookingStatus(f: FormData) {
  const { base } = await guard(f);
  await db().prepare("UPDATE bookings SET status = ? WHERE id = ?").run(str(f, "status") || "done", idv(f));
  back(f, `${base}/bookings`);
}

export async function deleteBooking(f: FormData) {
  const { base } = await guard(f);
  await db().prepare("DELETE FROM bookings WHERE id = ?").run(idv(f));
  back(f, `${base}/bookings`);
}

/* ---------------- measurements ---------------- */

export async function createMeasurement(f: FormData) {
  const { base, user } = await guard(f);
  const clientId = idv(f, "client_id");
  if (!clientId) redirect(`${base}/measurements`);
  const c = await db().prepare("SELECT address FROM clients WHERE id = ?").get(clientId) as { address: string | null } | undefined;
  const id = (await db().prepare("INSERT INTO measurements(client_id, title, address, taken_by, date) VALUES (?,?,?,?,?)")
    .run(clientId, str(f, "title"), c?.address ?? null, user.name, todayISO())).lastInsertRowid;
  redirect(`${base}/measurements/${id}`);
}

type MItem = { photo?: string; product_type?: string; room?: string; width?: number | string; height?: number | string; depth?: number | string; qty?: number | string; material?: string; color?: string; notes?: string };

export async function saveMeasurement(f: FormData) {
  const { base } = await guard(f);
  const id = idv(f);
  if (!id) redirect(`${base}/measurements`);
  let items: MItem[] = [];
  try { items = JSON.parse(String(f.get("items") || "[]")); } catch {}
  const n = (v: unknown) => (v === "" || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v));
  const tx = db().transaction(async () => {
    await db().prepare("UPDATE measurements SET title=?, address=?, taken_by=?, date=?, notes=? WHERE id=?").run(str(f, "title"), str(f, "address"), str(f, "taken_by"), str(f, "date"), str(f, "notes"), id);
    await db().prepare("DELETE FROM measurement_items WHERE measurement_id = ?").run(id);
    const ins = db().prepare("INSERT INTO measurement_items(measurement_id, product_type, room, width, height, depth, qty, material, color, notes, photo, sort) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");
    const photo = (p?: string) => (isUploadPath(p) ? p : null);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await ins.run(id, it.product_type || "other", it.room || null, n(it.width), n(it.height), n(it.depth), n(it.qty) ?? 1, it.material || null, it.color || null, it.notes || null, photo(it.photo), i);
    }
  });
  await tx();
  back(f, `${base}/measurements/${id}`);
}

export async function deleteMeasurement(f: FormData) {
  const { base } = await guard(f);
  const id = idv(f);
  if (id) await db().transaction(async () => purgeMeasurement(id))();
  back(f, `${base}/measurements`);
}

/* ---------------- orders ---------------- */

const DEFAULT_UNIT: Record<string, string> = { window: "m2", door: "piece", kitchen: "m" };

export async function createOrder(f: FormData) {
  const { base } = await guard(f);
  let clientId = idv(f, "client_id");
  const mId = idv(f, "measurement_id");
  if (mId && !clientId) {
    clientId = (await db().prepare("SELECT client_id FROM measurements WHERE id = ?").get(mId) as { client_id: number } | undefined)?.client_id ?? null;
  }
  if (!clientId) redirect(`${base}/orders`);
  const tx = db().transaction(async () => {
    const m = mId ? (await db().prepare("SELECT title FROM measurements WHERE id = ?").get(mId) as { title: string | null } | undefined) : undefined;
    const oid = Number((await db().prepare("INSERT INTO orders(client_id, measurement_id, title, status) VALUES (?,?,?, 'quote')").run(clientId, mId, str(f, "title") || m?.title || null)).lastInsertRowid);
    if (mId) {
      const items = await db().prepare("SELECT * FROM measurement_items WHERE measurement_id = ? ORDER BY sort, id").all(mId) as (MItem & { product_type: string })[];
      const ins = db().prepare("INSERT INTO order_items(order_id, product_type, description, width, height, qty, unit, unit_price, sort) VALUES (?,?,?,?,?,?,?,?,?)");
      const prices = (await getPrices());
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        // Price each item from the price list (matching material first, else the product's default)
        const p = matchPrice(prices, it.product_type, it.material);
        const desc = [it.room, it.material, it.color].filter(Boolean).join(" · ");
        await ins.run(oid, it.product_type, desc || null, it.width ?? null, it.height ?? null, it.qty ?? 1, p?.unit || DEFAULT_UNIT[it.product_type] || "piece", p?.price ?? 0, i);
      }
    }
    return oid;
  });
  const oid = await tx();
  redirect(`${base}/orders/${oid}`);
}

type OItem = { product_type?: string; description?: string; width?: number | string; height?: number | string; qty?: number | string; unit?: string; unit_price?: number | string };

export async function saveOrder(f: FormData) {
  const { base } = await guard(f);
  const id = idv(f);
  if (!id) redirect(`${base}/orders`);
  let items: OItem[] = [];
  try { items = JSON.parse(String(f.get("items") || "[]")); } catch {}
  const n = (v: unknown) => (v === "" || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v));
  const tx = db().transaction(async () => {
    await db().prepare("UPDATE orders SET title=?, status=?, discount=?, due_date=?, notes=? WHERE id=?").run(str(f, "title"), str(f, "status") || "quote", numv(f, "discount") || 0, str(f, "due_date"), str(f, "notes"), id);
    await db().prepare("DELETE FROM order_items WHERE order_id = ?").run(id);
    const ins = db().prepare("INSERT INTO order_items(order_id, product_type, description, width, height, qty, unit, unit_price, sort) VALUES (?,?,?,?,?,?,?,?,?)");
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const unit = ["piece", "m2", "m"].includes(String(it.unit)) ? String(it.unit) : "piece";
      await ins.run(id, it.product_type || "other", it.description || null, n(it.width), n(it.height), n(it.qty) ?? 1, unit, n(it.unit_price) ?? 0, i);
    }
  });
  await tx();
  await trackInstalled(id);
  back(f, `${base}/orders/${id}`);
}


/** Records the day an order was first marked installed/completed (used for debt reminders). */
async function trackInstalled(orderId: number | null) {
  if (!orderId) return;
  await db().prepare(
    "UPDATE orders SET installed_at = CASE WHEN status IN ('installed','completed') THEN COALESCE(installed_at, date('now','+3 hours')) ELSE NULL END WHERE id = ?",
  ).run(orderId);
}

export async function setOrderStatus(f: FormData) {
  const { base } = await guard(f);
  await db().prepare("UPDATE orders SET status = ? WHERE id = ?").run(str(f, "status") || "quote", idv(f));
  await trackInstalled(idv(f));
  back(f, `${base}/orders`);
}

export async function deleteOrder(f: FormData) {
  const { base } = await guard(f);
  const id = idv(f);
  if (id) await db().transaction(async () => purgeOrder(id))();
  back(f, `${base}/orders`);
}

/* ---------------- payments ---------------- */

export async function savePayment(f: FormData) {
  const { base } = await guard(f);
  const amount = numv(f, "amount");
  const orderId = idv(f, "order_id");
  let clientId = idv(f, "client_id");
  if (orderId && !clientId) clientId = (await db().prepare("SELECT client_id FROM orders WHERE id = ?").get(orderId) as { client_id: number } | undefined)?.client_id ?? null;
  if (amount && amount > 0 && clientId) {
    await db().prepare("INSERT INTO payments(order_id, client_id, amount, method, date, note) VALUES (?,?,?,?,?,?)").run(orderId, clientId, amount, str(f, "method") || "cash", str(f, "date") || todayISO(), str(f, "note"));
  }
  back(f, `${base}/payments`);
}

export async function deletePayment(f: FormData) {
  const { base } = await guard(f);
  await db().prepare("DELETE FROM payments WHERE id = ?").run(idv(f));
  back(f, `${base}/payments`);
}

/* ---------------- expenses ---------------- */

export async function saveExpense(f: FormData) {
  const { base } = await guard(f);
  const id = idv(f);
  const amount = numv(f, "amount");
  if (!amount) back(f, `${base}/expenses`);
  const vals = [str(f, "category") || "other", amount, str(f, "date") || todayISO(), str(f, "description"), str(f, "supplier"), idv(f, "order_id")];
  if (id) await db().prepare("UPDATE expenses SET category=?, amount=?, date=?, description=?, supplier=?, order_id=? WHERE id=?").run(...vals, id);
  else await db().prepare("INSERT INTO expenses(category, amount, date, description, supplier, order_id) VALUES (?,?,?,?,?,?)").run(...vals);
  back(f, `${base}/expenses`);
}

export async function deleteExpense(f: FormData) {
  const { base } = await guard(f);
  await db().prepare("DELETE FROM expenses WHERE id = ?").run(idv(f));
  back(f, `${base}/expenses`);
}

/* ---------------- inventory ---------------- */

export async function saveInventory(f: FormData) {
  const { base } = await guard(f);
  const id = idv(f);
  const vals = [str(f, "name") || "—", str(f, "category"), str(f, "unit"), numv(f, "quantity") ?? 0, numv(f, "min_quantity") ?? 0, numv(f, "cost"), str(f, "supplier"), str(f, "notes")];
  if (id) await db().prepare("UPDATE inventory SET name=?, category=?, unit=?, quantity=?, min_quantity=?, cost=?, supplier=?, notes=?, updated_at=datetime('now') WHERE id=?").run(...vals, id);
  else await db().prepare("INSERT INTO inventory(name, category, unit, quantity, min_quantity, cost, supplier, notes) VALUES (?,?,?,?,?,?,?,?)").run(...vals);
  back(f, `${base}/inventory`);
}

export async function adjustInventory(f: FormData) {
  const { base } = await guard(f);
  const delta = numv(f, "delta") || 0;
  await db().prepare("UPDATE inventory SET quantity = MAX(0, quantity + ?), updated_at = datetime('now') WHERE id = ?").run(delta, idv(f));
  back(f, `${base}/inventory`);
}

export async function deleteInventory(f: FormData) {
  const { base } = await guard(f);
  await db().prepare("DELETE FROM inventory WHERE id = ?").run(idv(f));
  back(f, `${base}/inventory`);
}

/* ---------------- leads ---------------- */

export async function setLeadStatus(f: FormData) {
  const { base } = await guard(f);
  await db().prepare("UPDATE leads SET status = ? WHERE id = ?").run(str(f, "status") || "contacted", idv(f));
  back(f, `${base}/leads`);
}

export async function convertLead(f: FormData) {
  const { base, locale } = await guard(f);
  const products = getDict(locale).products as Record<string, string>;
  const lead = await db().prepare("SELECT * FROM leads WHERE id = ?").get(idv(f)) as
    | { id: number; name: string; phone: string; service: string | null; message: string | null; preferred_date: string | null; address: string | null }
    | undefined;
  if (!lead) redirect(`${base}/leads`);
  const tx = db().transaction(async () => {
    const existing = await db().prepare("SELECT id FROM clients WHERE replace(phone,' ','') = replace(?,' ','')").get(lead.phone) as { id: number } | undefined;
    const cid = existing?.id ?? Number((await db().prepare("INSERT INTO clients(name, phone, address, source, notes) VALUES (?,?,?, 'website', ?)").run(lead.name, lead.phone, lead.address, lead.message)).lastInsertRowid);
    const note = [lead.service ? products[lead.service] || lead.service : null, lead.message].filter(Boolean).join(" — ");
    await db().prepare("INSERT INTO bookings(client_id, type, date, address, status, notes) VALUES (?, 'measurement', ?, ?, 'scheduled', ?)").run(cid, lead.preferred_date || todayISO(), lead.address, note || null);
    await db().prepare("UPDATE leads SET status = 'converted', client_id = ? WHERE id = ?").run(cid, lead.id);
    return cid;
  });
  const cid = await tx();
  revalidatePath("/", "layout");
  redirect(`${base}/clients/${cid}`);
}

export async function deleteLead(f: FormData) {
  const { base } = await guard(f);
  await db().prepare("DELETE FROM leads WHERE id = ?").run(idv(f));
  back(f, `${base}/leads`);
}

/* ---------------- portfolio ---------------- */

const IMG_EXT: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/avif": ".avif" };

/** An image path this system created: data/uploads locally, or a Vercel Blob address online. */
const isUploadPath = (p: string | null | undefined): p is string =>
  !!p && (p.startsWith("/uploads/") || /^https:\/\/[\w.-]*blob\.vercel-storage\.com\//.test(p));

/** Saves an uploaded image (Vercel Blob online, data/uploads locally) and returns its public address. */
async function saveUpload(file: FormDataEntryValue | null): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0 || !IMG_EXT[file.type] || file.size > 12 * 1024 * 1024) return null;
  const name = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${IMG_EXT[file.type]}`;
  if (IS_CLOUD) {
    const blob = await blobPut(`uploads/${name}`, file, { access: "public", addRandomSuffix: false, contentType: file.type });
    return blob.url;
  }
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

/** Deletes an uploaded file when nothing on the site uses it any more. */
async function removeIfUnused(img: string | null | undefined) {
  if (!isUploadPath(img)) return;
  const inPortfolio = await db().prepare("SELECT 1 FROM portfolio WHERE image = ? OR before_image = ?").get(img, img);
  const inSettings = await db().prepare("SELECT 1 FROM settings WHERE value = ?").get(img);
  const inItems = await db().prepare("SELECT 1 FROM measurement_items WHERE photo = ?").get(img);
  if (inPortfolio || inSettings || inItems) return;
  if (img.startsWith("/uploads/")) fs.rmSync(path.join(UPLOAD_DIR, path.basename(img)), { force: true });
  else await blobDelete(img).catch(() => {});
}

export async function uploadPortfolio(f: FormData) {
  const { base } = await guard(f);
  const files = f.getAll("image");
  const ins = db().prepare(
    "INSERT INTO portfolio(title_ckb, title_ar, title_en, category, image, featured, sort) VALUES (?,?,?,?,?,?, (SELECT COALESCE(MIN(sort),0)-1 FROM portfolio))",
  );
  for (const file of files) {
    const img = await saveUpload(file);
    if (img) await ins.run(str(f, "title_ckb"), str(f, "title_ar"), str(f, "title_en"), str(f, "category") || "other", img, f.get("featured") ? 1 : 0);
  }
  back(f, `${base}/portfolio`);
}

export async function updatePortfolio(f: FormData) {
  const { base } = await guard(f);
  await db().prepare("UPDATE portfolio SET title_ckb=?, title_ar=?, title_en=?, category=?, featured=?, sort=? WHERE id=?")
    .run(str(f, "title_ckb"), str(f, "title_ar"), str(f, "title_en"), str(f, "category") || "other", f.get("featured") ? 1 : 0, numv(f, "sort") ?? 0, idv(f));
  back(f, `${base}/portfolio`);
}

export async function deletePortfolio(f: FormData) {
  const { base } = await guard(f);
  const row = await db().prepare("SELECT image FROM portfolio WHERE id = ?").get(idv(f)) as { image: string } | undefined;
  if (row) {
    await db().prepare("DELETE FROM portfolio WHERE id = ?").run(idv(f));
    await removeIfUnused(row.image);
  }
  back(f, `${base}/portfolio`);
}

/* ---------------- settings & users ---------------- */

const SETTING_KEYS = ["company_name", "phone1", "phone2", "whatsapp", "email", "address", "address_ckb", "address_ar", "facebook", "instagram", "currency", "site_url", "backup_dir"];

export async function saveSettings(f: FormData) {
  const { base, user } = await guard(f);
  if (user.role !== "admin") redirect(`${base}/settings`);
  const up = db().prepare("INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  for (const k of SETTING_KEYS) {
    let v = String(f.get(k) ?? "").trim();
    if (k === "whatsapp") v = v.replace(/\D/g, "");
    if (k === "site_url" && v && !/^https?:\/\//.test(v)) v = "https://" + v;
    if (k === "site_url") v = v.replace(/\/+$/, "");
    if (k === "currency" && !["IQD", "USD"].includes(v)) v = "IQD";
    await up.run(k, v);
  }
  back(f, `${base}/settings?saved=1`);
}

export async function addUser(f: FormData) {
  const { base, user } = await guard(f);
  const username = (str(f, "username") || "").toLowerCase().replace(/\s/g, "");
  const password = String(f.get("password") || "");
  if (user.role === "admin" && username && password.length >= 6) {
    try {
      await db().prepare("INSERT INTO users(name, username, password_hash, role) VALUES (?,?,?,?)").run(str(f, "name") || username, username, hashPassword(password), str(f, "role") === "admin" ? "admin" : "staff");
    } catch {
      /* username taken */
    }
  }
  back(f, `${base}/settings`);
}

export async function deleteUser(f: FormData) {
  const { base, user } = await guard(f);
  const id = idv(f);
  if (user.role === "admin" && id && id !== user.id) {
    await db().prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
    await db().prepare("DELETE FROM push_subscriptions WHERE user_id = ?").run(id);
    await db().prepare("DELETE FROM users WHERE id = ?").run(id);
  }
  back(f, `${base}/settings`);
}

export async function changePassword(_prev: { ok?: boolean; error?: string } | null | FormData, fArg?: FormData) {
  const f = fArg ?? (_prev as FormData);
  const user = await getUser();
  if (!user) return { error: "auth" };
  const row = await db().prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id) as { password_hash: string };
  if (!verifyPassword(String(f.get("current") || ""), row.password_hash)) return { error: "wrong" };
  const next = String(f.get("next") || "");
  if (next.length < 6) return { error: "short" };
  await db().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(next), user.id);
  return { ok: true };
}

/* ---------------- website content ---------------- */

export async function saveContent(f: FormData) {
  const { base } = await guard(f);
  const section = SECTIONS.find((x) => x.id === str(f, "section"));
  if (section) {
    const up = db().prepare("INSERT INTO site_content(path, locale, value) VALUES (?,?,?) ON CONFLICT(path, locale) DO UPDATE SET value = excluded.value");
    const del = db().prepare("DELETE FROM site_content WHERE path = ? AND locale = ?");
    await db().transaction(async () => {
      for (const field of section.fields) {
        for (const l of LOCALES) {
          const v = String(f.get(`${field.path}|${l}`) ?? "").trim();
          const def = getAt(getDict(l), field.path);
          if (!v || v === def) await del.run(field.path, l);
          else await up.run(field.path, l, v.slice(0, 3000));
        }
      }
    })();
  }
  back(f, `${base}/website?tab=texts&saved=${section?.id ?? ""}#${section?.id ?? ""}`);
}

export async function resetContent(f: FormData) {
  const { base } = await guard(f);
  const section = SECTIONS.find((x) => x.id === str(f, "section"));
  if (section) {
    const del = db().prepare("DELETE FROM site_content WHERE path = ?");
    for (const field of section.fields) await del.run(field.path);
  }
  back(f, `${base}/website?tab=texts#${section?.id ?? ""}`);
}

const COVER_KEYS = ["door", "window", "kitchen", "wardrobe", "bathroom", "vanity", "bed_panel"];

export async function saveSiteImage(f: FormData) {
  const { base } = await guard(f);
  const slot = str(f, "slot") || "";
  const key = (IMAGE_SLOTS as readonly string[]).includes(slot) ? `image_${slot}` : COVER_KEYS.includes(slot) ? `cover_${slot}` : null;
  if (key) {
    const prev = (await db().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined)?.value;
    let next: string | null = await saveUpload(f.get("image"));
    if (!next) {
      const picked = str(f, "pick");
      // Only allow choosing a photo that is already in the gallery
      if (picked && await db().prepare("SELECT 1 FROM portfolio WHERE image = ?").get(picked)) next = picked;
    }
    if (f.get("clear")) {
      await db().prepare("DELETE FROM settings WHERE key = ?").run(key);
      await removeIfUnused(prev);
    } else if (next) {
      await db().prepare("INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, next);
      if (prev !== next) await removeIfUnused(prev);
    }
  }
  back(f, `${base}/website?tab=images#img-${slot}`);
}

export async function saveToggles(f: FormData) {
  const { base } = await guard(f);
  const up = db().prepare("INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  for (const k of SECTION_TOGGLES) await up.run(`show_${k}`, f.get(k) ? "1" : "0");
  back(f, `${base}/website?tab=sections&saved=1`);
}

const TRI = (f: FormData, field: string) => LOCALES.map((l) => str(f, `${field}_${l}`));

export async function saveTestimonial(f: FormData) {
  const { base } = await guard(f);
  const id = idv(f);
  // column order: name_ckb, name_ar, name_en, role_*, text_*
  const vals = [...TRI(f, "name"), ...TRI(f, "role"), ...TRI(f, "text"), f.get("visible") ? 1 : 0, numv(f, "sort") ?? 0];
  if (id) await db().prepare("UPDATE testimonials SET name_ckb=?, name_ar=?, name_en=?, role_ckb=?, role_ar=?, role_en=?, text_ckb=?, text_ar=?, text_en=?, visible=?, sort=? WHERE id=?").run(...vals, id);
  else await db().prepare("INSERT INTO testimonials(name_ckb, name_ar, name_en, role_ckb, role_ar, role_en, text_ckb, text_ar, text_en, visible, sort) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(...vals);
  back(f, `${base}/website?tab=reviews`);
}

export async function deleteTestimonial(f: FormData) {
  const { base } = await guard(f);
  await db().prepare("DELETE FROM testimonials WHERE id = ?").run(idv(f));
  back(f, `${base}/website?tab=reviews`);
}

export async function saveFaq(f: FormData) {
  const { base } = await guard(f);
  const id = idv(f);
  const vals = [...TRI(f, "q"), ...TRI(f, "a"), f.get("visible") ? 1 : 0, numv(f, "sort") ?? 0];
  if (id) await db().prepare("UPDATE faqs SET q_ckb=?, q_ar=?, q_en=?, a_ckb=?, a_ar=?, a_en=?, visible=?, sort=? WHERE id=?").run(...vals, id);
  else await db().prepare("INSERT INTO faqs(q_ckb, q_ar, q_en, a_ckb, a_ar, a_en, visible, sort) VALUES (?,?,?,?,?,?,?,?)").run(...vals);
  back(f, `${base}/website?tab=faq`);
}

export async function deleteFaq(f: FormData) {
  const { base } = await guard(f);
  await db().prepare("DELETE FROM faqs WHERE id = ?").run(idv(f));
  back(f, `${base}/website?tab=faq`);
}

/* ---------------- on-site measuring ---------------- */

export type SiteItem = {
  product_type: string; room?: string; width?: number | null; height?: number | null; depth?: number | null;
  qty?: number; material?: string; color?: string; notes?: string; photo?: string | null;
};

/** Saves one measured item immediately (called from Measure mode on the phone). */
export async function addMeasurementItem(measurementId: number, item: SiteItem) {
  const user = await getUser();
  if (!user) return { ok: false as const, error: "auth" };
  const m = await db().prepare("SELECT id FROM measurements WHERE id = ?").get(measurementId);
  if (!m) return { ok: false as const, error: "missing" };
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v * 10) / 10 : null);
  const txt = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 300) : null);
  const sort = (await db().prepare("SELECT COALESCE(MAX(sort), -1) + 1 s FROM measurement_items WHERE measurement_id = ?").get(measurementId) as { s: number }).s;
  await db().prepare("INSERT INTO measurement_items(measurement_id, product_type, room, width, height, depth, qty, material, color, notes, photo, sort) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(
      measurementId, txt(item.product_type) || "other", txt(item.room), num(item.width), num(item.height), num(item.depth),
      Math.max(1, Math.round(Number(item.qty) || 1)), txt(item.material), txt(item.color), txt(item.notes),
      isUploadPath(item.photo) ? item.photo : null, sort,
    );
  revalidatePath("/", "layout");
  const count = (await db().prepare("SELECT COUNT(*) c FROM measurement_items WHERE measurement_id = ?").get(measurementId) as { c: number }).c;
  return { ok: true as const, count };
}

/** Uploads a photo taken on site; returns its path. */
export async function uploadItemPhoto(f: FormData) {
  const user = await getUser();
  if (!user) return { ok: false as const };
  const p = await saveUpload(f.get("photo"));
  return p ? { ok: true as const, path: p } : { ok: false as const };
}

/** From a measurement booking: create (or reuse today's) sheet for the client and open Measure mode. */
export async function startMeasuring(f: FormData) {
  const { base, user } = await guard(f);
  const bookingId = idv(f, "booking_id");
  let clientId = idv(f, "client_id");
  let address: string | null = null;
  if (bookingId) {
    const b = await db().prepare("SELECT b.client_id, b.address, c.address caddress FROM bookings b LEFT JOIN clients c ON c.id = b.client_id WHERE b.id = ?").get(bookingId) as
      | { client_id: number | null; address: string | null; caddress: string | null }
      | undefined;
    clientId = clientId || b?.client_id || null;
    address = b?.address || b?.caddress || null;
  }
  if (!clientId) redirect(`${base}/measurements`);
  const today = todayISO();
  const existing = await db().prepare("SELECT id FROM measurements WHERE client_id = ? AND date = ? ORDER BY id DESC LIMIT 1").get(clientId, today) as { id: number } | undefined;
  const id =
    existing?.id ??
    Number((await db().prepare("INSERT INTO measurements(client_id, address, taken_by, date) VALUES (?,?,?,?)").run(clientId, address, user.name, today)).lastInsertRowid);
  if (bookingId) await db().prepare("UPDATE bookings SET status = 'done' WHERE id = ? AND type = 'measurement'").run(bookingId);
  redirect(`${base}/measurements/${id}?measure=1`);
}

/* ---------------- follow-up reminders ---------------- */

export async function setMeasurementClosed(f: FormData) {
  const { base } = await guard(f);
  const id = idv(f);
  const closed = f.get("closed") === "1" ? 1 : 0;
  // Reopening also allows a fresh phone reminder later
  await db().prepare("UPDATE measurements SET closed = ?, notified_at = CASE WHEN ? = 0 THEN NULL ELSE notified_at END WHERE id = ?").run(closed, closed, id);
  back(f, `${base}/measurements/${id}`);
}

async function adminGuard(f: FormData) {
  const g = await guard(f);
  if (g.user.role !== "admin") redirect(`${g.base}/settings`);
  return g;
}

const setSetting = async (k: string, v: string) =>
  await db().prepare("INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(k, v);

export async function saveNotifySettings(f: FormData) {
  const { base } = await adminGuard(f);
  const days = (k: string, d: number) => String(Math.min(60, Math.max(1, Math.round(numv(f, k) ?? d))));
  await setSetting("followup_red_days", days("followup_red_days", 3));
  await setSetting("followup_notify_days", days("followup_notify_days", 5));
  await setSetting("debt_days", days("debt_days", 7));
  const dl = str(f, "debt_locale");
  if (dl && isLocale(dl)) await setSetting("debt_locale", dl);
  await setSetting("report_monthly", f.get("report_monthly") ? "1" : "0");
  const l = str(f, "notify_locale");
  if (l && isLocale(l)) await setSetting("notify_locale", l);
  back(f, `${base}/settings?notify=saved#notify`);
}

/** Called from the browser after the user allows notifications on this phone/computer. */
export async function savePushSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, label: string) {
  const user = await getUser();
  if (!user || !sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false };
  (await saveSubscription(sub, user.id, label || "Device"));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removePushDevice(f: FormData) {
  const { base } = await guard(f);
  const id = idv(f);
  if (id) (await removeSubscription(id));
  back(f, `${base}/settings#notify`);
}

export async function testPush(f: FormData) {
  const { base, locale } = await guard(f);
  const L = getDict(locale).admin.followup;
  const n = await sendPush({ title: "HOGR CO.", body: L.testMsg, url: `/${locale}/admin`, tag: "test" });
  back(f, `${base}/settings?notify=${n ? "testok" : "testfail"}#notify`);
}

export async function sendRemindersNow(f: FormData) {
  const { base } = await adminGuard(f);
  const a = await runReminders({ force: true });
  const b = await runDebtAlerts({ force: true });
  const n = a.sent + b.sent;
  back(f, `${base}/settings?notify=${n ? `sent-${n}` : "none"}#notify`);
}

/* ---------------- workers & wages ---------------- */

export async function saveWorker(f: FormData) {
  const { base } = await guard(f);
  const id = idv(f);
  const vals = [
    str(f, "name") || "—", str(f, "phone"), str(f, "role"), str(f, "pay_type") === "monthly" ? "monthly" : "daily",
    numv(f, "rate") ?? 0, str(f, "color"), f.get("active") ? 1 : 0, str(f, "notes"),
  ];
  if (id) await db().prepare("UPDATE workers SET name=?, phone=?, role=?, pay_type=?, rate=?, color=?, active=?, notes=? WHERE id=?").run(...vals, id);
  else await db().prepare("INSERT INTO workers(name, phone, role, pay_type, rate, color, active, notes) VALUES (?,?,?,?,?,?,?,?)").run(...vals);
  back(f, `${base}/workers`);
}

export async function deleteWorker(f: FormData) {
  const { base } = await guard(f);
  const id = idv(f);
  if (id) {
    await db().transaction(async () => {
      await db().prepare("DELETE FROM worker_days WHERE worker_id = ?").run(id);
      await db().prepare("DELETE FROM worker_payments WHERE worker_id = ?").run(id); // their expenses stay in Expenses
      await db().prepare("UPDATE bookings SET worker_id = NULL WHERE worker_id = ?").run(id);
      await db().prepare("DELETE FROM workers WHERE id = ?").run(id);
    })();
  }
  back(f, `${base}/workers`);
}

/** Sets (or clears) one attendance day; called directly from the attendance grid. */
export async function setAttendance(workerId: number, date: string, status: string | null) {
  const user = await getUser();
  if (!user || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false };
  if (status && ["present", "half", "absent"].includes(status)) {
    await db().prepare("INSERT INTO worker_days(worker_id, date, status) VALUES (?,?,?) ON CONFLICT(worker_id, date) DO UPDATE SET status = excluded.status").run(workerId, date, status);
  } else {
    await db().prepare("DELETE FROM worker_days WHERE worker_id = ? AND date = ?").run(workerId, date);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveWorkerPayment(f: FormData) {
  const { base, locale } = await guard(f);
  const workerId = idv(f, "worker_id");
  const amount = numv(f, "amount");
  const kind = ["salary", "advance", "bonus"].includes(str(f, "kind") || "") ? str(f, "kind")! : "salary";
  const w = workerId ? (await db().prepare("SELECT name FROM workers WHERE id = ?").get(workerId) as { name: string } | undefined) : undefined;
  if (w && amount && amount > 0) {
    const date = str(f, "date") || todayISO();
    const kindLabel = getDict(locale).admin.workers.kinds[kind as "salary"];
    await db().transaction(async () => {
      // Wages are business expenses too, so they show in Expenses and in the monthly profit
      const exp = (await db().prepare("INSERT INTO expenses(category, amount, date, description) VALUES ('salaries', ?, ?, ?)")
        .run(amount, date, `${w.name} · ${kindLabel}${str(f, "note") ? " · " + str(f, "note") : ""}`)).lastInsertRowid;
      await db().prepare("INSERT INTO worker_payments(worker_id, kind, amount, date, note, expense_id) VALUES (?,?,?,?,?,?)").run(workerId, kind, amount, date, str(f, "note"), exp);
    })();
  }
  back(f, `${base}/workers`);
}

export async function deleteWorkerPayment(f: FormData) {
  const { base } = await guard(f);
  const p = await db().prepare("SELECT expense_id FROM worker_payments WHERE id = ?").get(idv(f)) as { expense_id: number | null } | undefined;
  if (p) {
    await db().prepare("DELETE FROM worker_payments WHERE id = ?").run(idv(f));
    if (p.expense_id) await db().prepare("DELETE FROM expenses WHERE id = ?").run(p.expense_id);
  }
  back(f, `${base}/workers`);
}

/* ---------------- debts ---------------- */

/** Logs the reminder, then opens WhatsApp with the polite message ready to send. */
export async function remindDebt(f: FormData) {
  const { base } = await guard(f);
  const id = idv(f);
  const lang = str(f, "lang") || "ckb";
  const d = (await getDebts()).find((x) => x.id === id);
  const link = d ? (await debtWhatsAppLink(d, isLocale(lang) ? lang : "ckb")) : null;
  if (!d || !link) back(f, `${base}/payments?tab=unpaid`);
  await db().prepare("UPDATE orders SET debt_reminded_at = datetime('now'), debt_reminders = debt_reminders + 1 WHERE id = ?").run(id);
  revalidatePath("/", "layout");
  redirect(link);
}

export async function sendReportNow(f: FormData) {
  const { base } = await guard(f);
  const month = /^\d{4}-\d{2}$/.test(str(f, "month") || "") ? str(f, "month")! : undefined;
  const ok = await sendMonthReport(month ?? new Date().toISOString().slice(0, 7));
  back(f, `${base}/reports?month=${month ?? ""}&sent=${ok ? 1 : 0}`);
}

/* ---------------- price list ---------------- */

export async function savePrice(f: FormData) {
  const { base } = await guard(f);
  const id = idv(f);
  const type = str(f, "product_type") || "other";
  const unit = ["piece", "m2", "m"].includes(str(f, "unit") || "") ? str(f, "unit")! : "m2";
  const vals = [type, str(f, "name_ckb"), str(f, "name_ar"), str(f, "name_en"), unit, numv(f, "price") ?? 0, str(f, "material"), str(f, "color"), f.get("is_default") ? 1 : 0, f.get("on_site") ? 1 : 0, numv(f, "sort") ?? 0];
  await db().transaction(async () => {
    // Only one default per product
    if (f.get("is_default")) await db().prepare("UPDATE price_list SET is_default = 0 WHERE product_type = ?").run(type);
    if (id) await db().prepare("UPDATE price_list SET product_type=?, name_ckb=?, name_ar=?, name_en=?, unit=?, price=?, material=?, color=?, is_default=?, on_site=?, sort=? WHERE id=?").run(...vals, id);
    else await db().prepare("INSERT INTO price_list(product_type, name_ckb, name_ar, name_en, unit, price, material, color, is_default, on_site, sort) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(...vals);
  })();
  back(f, `${base}/prices`);
}

export async function deletePrice(f: FormData) {
  const { base } = await guard(f);
  await db().prepare("DELETE FROM price_list WHERE id = ?").run(idv(f));
  back(f, `${base}/prices`);
}

/** Fills items that have no price yet from the price list. */
export async function applyPrices(f: FormData) {
  const { base, locale } = await guard(f);
  const id = idv(f);
  const prices = (await getPrices());
  const items = await db().prepare("SELECT id, product_type, description FROM order_items WHERE order_id = ? AND (unit_price IS NULL OR unit_price = 0)").all(id) as { id: number; product_type: string; description: string | null }[];
  const up = db().prepare("UPDATE order_items SET unit = ?, unit_price = ?, description = COALESCE(NULLIF(description, ''), ?) WHERE id = ?");
  for (const it of items) {
    const p = matchPrice(prices, it.product_type, it.description);
    if (p) await up.run(p.unit, p.price, priceName(p, locale), it.id);
  }
  back(f, `${base}/orders/${id}?priced=1`);
}

/* ---------------- client links: quote, tracking, review ---------------- */

/** Opens WhatsApp with the client's link (quote / tracking / review) already written. */
export async function shareOrder(f: FormData) {
  const { base } = await guard(f);
  const id = idv(f);
  const kind = str(f, "kind") || "quote";
  const o = await db().prepare("SELECT o.id, c.name, c.phone FROM orders o JOIN clients c ON c.id = o.client_id WHERE o.id = ?").get(id) as { id: number; name: string; phone: string | null } | undefined;
  if (!o) redirect(`${base}/orders`);
  const want = str(f, "lang") || (await getSettings()).debt_locale || "ckb";
  const lang = isLocale(want) ? want : "ckb";
  const L = getDict(lang).admin.share;
  const { url } = await publicBase();
  const link = `${url}/${lang}/${kind === "review" ? "r" : "o"}/${(await shareToken(o.id))}`;
  const tpl = kind === "review" ? L.waReview : kind === "track" ? L.waTrack : L.waQuote;
  const text = tpl.replace("{name}", o.name).replace("{order}", orderNo(o.id)).replace("{link}", link);
  const num = waNumber(o.phone);
  if (!num) back(f, `${base}/orders/${id}`);
  redirect(`https://wa.me/${num}?text=${encodeURIComponent(text)}`);
}

/** Public: the client accepts the quotation from their link. */
export async function acceptQuote(token: string) {
  const o = (await orderByToken(token));
  if (!o) return { ok: false };
  if (o.status === "quote") {
    await db().prepare("UPDATE orders SET status = 'confirmed', accepted_at = datetime('now') WHERE id = ?").run(o.id);
    const l = (await getSettings()).notify_locale || "ckb";
    const L = getDict(l).admin.share;
    await sendPush({ title: L.acceptedPush, body: L.acceptedPushBody.replace("{name}", o.cname).replace("{order}", orderNo(o.id)), url: `/${l}/admin/orders/${o.id}`, tag: `accept-${o.id}` }).catch(() => 0);
    // No revalidate here: the client keeps seeing the thank-you message; admin pages always load fresh
  }
  return { ok: true };
}

/** Public: the client rates the work after installation. One review per order. */
export async function submitReview(_prev: { ok?: boolean; error?: string } | null | FormData, fArg?: FormData) {
  const f = fArg ?? (_prev as FormData);
  const o = (await orderByToken(String(f.get("token") || "")));
  if (!o) return { error: "invalid" };
  const rating = Math.round(Number(f.get("rating")));
  if (!(rating >= 1 && rating <= 5)) return { error: "rating" };
  if (await db().prepare("SELECT 1 FROM reviews WHERE order_id = ?").get(o.id)) return { error: "already" };
  const name = (str(f, "name") || o.cname).slice(0, 80);
  await db().prepare("INSERT INTO reviews(order_id, client_id, name, rating, text, locale) VALUES (?,?,?,?,?,?)").run(o.id, o.client_id, name, rating, str(f, "text"), str(f, "locale"));
  const l = (await getSettings()).notify_locale || "ckb";
  const L = getDict(l).admin.share;
  await sendPush({ title: L.reviewPush, body: L.reviewPushBody.replace("{name}", name).replace("{stars}", "★".repeat(rating) + "☆".repeat(5 - rating)), url: `/${l}/admin/website?tab=reviews`, tag: "review" }).catch(() => 0);
  return { ok: true };
}

export async function approveReview(f: FormData) {
  const { base } = await guard(f);
  const r = await db().prepare("SELECT * FROM reviews WHERE id = ?").get(idv(f)) as { id: number; name: string; rating: number; text: string | null; locale: string | null } | undefined;
  if (r) {
    const loc = r.locale && isLocale(r.locale) ? r.locale : "ckb";
    const cols: Record<string, (string | null)[]> = { ckb: [null, null], ar: [null, null], en: [null, null] };
    cols[loc] = [r.name, r.text || "★".repeat(r.rating)];
    await db().prepare("INSERT INTO testimonials(name_ckb, name_ar, name_en, text_ckb, text_ar, text_en, rating, visible, sort) VALUES (?,?,?,?,?,?,?,1,0)")
      .run(cols.ckb[0], cols.ar[0], cols.en[0], cols.ckb[1], cols.ar[1], cols.en[1], r.rating);
    await db().prepare("UPDATE reviews SET status = 'approved' WHERE id = ?").run(r.id);
  }
  back(f, `${base}/website?tab=reviews`);
}

export async function deleteReview(f: FormData) {
  const { base } = await guard(f);
  await db().prepare("DELETE FROM reviews WHERE id = ?").run(idv(f));
  back(f, `${base}/website?tab=reviews`);
}

/* ---------------- materials ---------------- */

export async function takeMaterials(f: FormData) {
  const { base } = await guard(f);
  const id = idv(f);
  const o = await db().prepare("SELECT materials_taken_at FROM orders WHERE id = ?").get(id) as { materials_taken_at: string | null } | undefined;
  if (o && !o.materials_taken_at) {
    const items = await db().prepare("SELECT product_type, width, height, qty FROM order_items WHERE order_id = ?").all(id) as Parameters<typeof computeMaterials>[0];
    const lines = computeMaterials(items);
    const dec = db().prepare("UPDATE inventory SET quantity = MAX(0, quantity - ?), updated_at = datetime('now') WHERE id = ?");
    await db().transaction(async () => {
      for (const l of lines) {
        const inv = idv(f, `inv_${l.key}`);
        if (inv) await dec.run(l.qty, inv);
      }
      await db().prepare("UPDATE orders SET materials_taken_at = datetime('now') WHERE id = ?").run(id);
    })();
  }
  back(f, `${base}/orders/${id}/materials`);
}

/* ---------------- backups & before/after ---------------- */

export async function backupNow(f: FormData) {
  const { base } = await adminGuard(f);
  const r = await runBackup(true);
  back(f, `${base}/settings?backup=${r.extraFailed ? "partial" : "ok"}#backup`);
}

export async function setBeforeImage(f: FormData) {
  const { base } = await guard(f);
  const id = idv(f);
  const prev = (await db().prepare("SELECT before_image FROM portfolio WHERE id = ?").get(id) as { before_image: string | null } | undefined)?.before_image;
  if (f.get("remove")) {
    await db().prepare("UPDATE portfolio SET before_image = NULL WHERE id = ?").run(id);
    await removeIfUnused(prev);
  } else {
    const img = await saveUpload(f.get("before"));
    if (img) {
      await db().prepare("UPDATE portfolio SET before_image = ? WHERE id = ?").run(img, id);
      await removeIfUnused(prev);
    }
  }
  back(f, `${base}/portfolio`);
}
