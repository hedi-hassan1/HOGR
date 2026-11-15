import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import en from "./i18n/en";
import ckb from "./i18n/ckb";
import ar from "./i18n/ar";

export const DATA_DIR = process.env.HOGR_DATA_DIR || path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'staff',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT, phone2 TEXT, address TEXT,
  city TEXT, source TEXT, notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY, client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  name TEXT, phone TEXT, type TEXT NOT NULL DEFAULT 'measurement',
  date TEXT NOT NULL, time TEXT, address TEXT, status TEXT NOT NULL DEFAULT 'scheduled',
  assigned_to TEXT, notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS measurements (
  id INTEGER PRIMARY KEY, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT, address TEXT, taken_by TEXT, date TEXT, notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS measurement_items (
  id INTEGER PRIMARY KEY, measurement_id INTEGER NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  product_type TEXT, room TEXT, width REAL, height REAL, depth REAL, qty INTEGER DEFAULT 1,
  material TEXT, color TEXT, notes TEXT, sort INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  measurement_id INTEGER REFERENCES measurements(id) ON DELETE SET NULL,
  title TEXT, status TEXT NOT NULL DEFAULT 'quote', discount REAL NOT NULL DEFAULT 0,
  due_date TEXT, notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_type TEXT, description TEXT, width REAL, height REAL, qty REAL NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'piece', unit_price REAL NOT NULL DEFAULT 0, sort INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY, order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  amount REAL NOT NULL, method TEXT NOT NULL DEFAULT 'cash', date TEXT NOT NULL, note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY, category TEXT NOT NULL DEFAULT 'materials', amount REAL NOT NULL,
  date TEXT NOT NULL, description TEXT, supplier TEXT,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT, unit TEXT, quantity REAL NOT NULL DEFAULT 0,
  min_quantity REAL NOT NULL DEFAULT 0, cost REAL, supplier TEXT, notes TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, service TEXT, message TEXT,
  preferred_date TEXT, address TEXT, locale TEXT, status TEXT NOT NULL DEFAULT 'new',
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS portfolio (
  id INTEGER PRIMARY KEY, title_ckb TEXT, title_ar TEXT, title_en TEXT,
  category TEXT NOT NULL, image TEXT NOT NULL, featured INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS site_content (
  path TEXT NOT NULL, locale TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (path, locale)
);
CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY, name_ckb TEXT, name_ar TEXT, name_en TEXT, role_ckb TEXT, role_ar TEXT, role_en TEXT,
  text_ckb TEXT, text_ar TEXT, text_en TEXT, visible INTEGER NOT NULL DEFAULT 1, sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY, q_ckb TEXT, q_ar TEXT, q_en TEXT, a_ckb TEXT, a_ar TEXT, a_en TEXT,
  visible INTEGER NOT NULL DEFAULT 1, sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS workers (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT, role TEXT, pay_type TEXT NOT NULL DEFAULT 'daily',
  rate REAL NOT NULL DEFAULT 0, color TEXT, active INTEGER NOT NULL DEFAULT 1, notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS worker_days (
  worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE, date TEXT NOT NULL,
  status TEXT NOT NULL, PRIMARY KEY (worker_id, date)
);
CREATE TABLE IF NOT EXISTS worker_payments (
  id INTEGER PRIMARY KEY, worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'salary', amount REAL NOT NULL, date TEXT NOT NULL, note TEXT,
  expense_id INTEGER REFERENCES expenses(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS price_list (
  id INTEGER PRIMARY KEY, product_type TEXT NOT NULL, name_ckb TEXT, name_ar TEXT, name_en TEXT,
  unit TEXT NOT NULL DEFAULT 'm2', price REAL NOT NULL DEFAULT 0, material TEXT, color TEXT,
  is_default INTEGER NOT NULL DEFAULT 0, on_site INTEGER NOT NULL DEFAULT 1, sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY, order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL, name TEXT, rating INTEGER NOT NULL,
  text TEXT, locale TEXT, status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client_id);
`;

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(test, Buffer.from(hash, "hex"));
}

const DEFAULT_SETTINGS: Record<string, string> = {
  company_name: "HOGR CO.",
  phone1: "0750 020 0340",
  phone2: "0750 080 0760",
  whatsapp: "9647500200340",
  email: "hogr.sardar@hogrcompany.com",
  address: "Chwarqurna, Raparin, Kurdistan Region",
  address_ckb: "چوارقوڕنە، ڕاپەڕین، هەرێمی کوردستان",
  address_ar: "جوارقورنة، رابرين، إقليم كوردستان",
  facebook: "https://www.facebook.com/kargae.hogr",
  instagram: "",
  hours: "Sat–Thu 8:00–17:00",
  currency: "IQD",
  image_hero: "/images/work/darga4.jpg",
  image_about: "/images/work/kawantar3.jpg",
  image_owner: "/images/owner.jpg",
  image_login: "/images/work/kawantar3.jpg",
  show_products: "1",
  show_process: "1",
  show_featured: "1",
  show_reviews: "1",
  show_booking: "1",
  show_faq: "1",
  show_owner: "1",
  show_map: "1",
  followup_red_days: "3",
  followup_notify_days: "5",
  telegram_token: "",
  telegram_chat_id: "",
  notify_locale: "ckb",
  debt_days: "7",
  debt_locale: "ckb",
  report_monthly: "1",
  report_last_sent: "",
  site_url: "",
  backup_dir: "",
  backup_last: "",
  estimate_low: "0.9",
  estimate_high: "1.2",
};

const PORTFOLIO_SEED: [string, string, string, string, string, number][] = [
  // image, category, ckb, ar, en, featured
  ["darga.jpg", "door", "دەرگای ئەلەمنیۆمی ڕەش", "باب ألمنيوم أسود", "Black aluminium entrance door", 1],
  ["darga2.jpg", "door", "دەرگای ژوور", "باب داخلي", "Interior door", 0],
  ["darga3.jpg", "door", "دەرگای مۆدێرن", "باب عصري", "Modern door", 0],
  ["darga4.jpg", "door", "دەرگای سەرەکی", "الباب الرئيسي", "Main entrance door", 1],
  ["panjara.jpg", "window", "پەنجەرەی ئەلەمنیۆم", "نافذة ألمنيوم", "Aluminium windows", 1],
  ["panjara2.jpg", "window", "پەنجەرەی گەورە", "نوافذ كبيرة", "Large window wall", 0],
  ["panjara3.jpg", "window", "پەنجەرەی خشکە", "نافذة منزلقة", "Sliding window", 0],
  ["kawantar.jpg", "kitchen", "کابینەی چێشتخانە", "مطبخ", "Kitchen cabinets", 1],
  ["kawantar2.jpg", "kitchen", "چێشتخانەی سپی", "مطبخ أبيض", "White kitchen", 0],
  ["kawantar3.jpg", "wardrobe", "دۆڵابی ڕەفەدار", "خزانة رفوف", "Shelving wall unit", 1],
  ["kawantar4.jpg", "kitchen", "چێشتخانەی مۆدێرن", "مطبخ عصري", "Modern kitchen", 0],
  ["kawantar5.jpg", "kitchen", "کابینەی دیوار", "خزائن جدارية", "Wall cabinets", 0],
  ["kawantar6.jpg", "kitchen", "چێشتخانەی بچووک", "مطبخ صغير", "Compact kitchen", 0],
  ["kawantar7.jpg", "kitchen", "دوورگەی چێشتخانە", "جزيرة المطبخ", "Kitchen island", 0],
  ["bofya.jpg", "wardrobe", "دۆڵابی ڕاڕەو", "خزانة المدخل", "Hallway wardrobe", 1],
  ["bofya2.jpg", "wardrobe", "دۆڵابی ژووری نوستن", "خزانة غرفة النوم", "Bedroom wardrobe", 0],
  ["bofya3.jpg", "wardrobe", "دۆڵابی دیوار", "خزانة جدارية", "Built-in wardrobe", 0],
  ["bofya4.jpg", "wardrobe", "دۆڵابی گەورە", "خزانة كبيرة", "Full-height wardrobe", 0],
  ["bofya5.jpg", "wardrobe", "بۆفیە", "بوفيه", "Sideboard", 0],
  ["two.png", "wardrobe", "دۆڵابی گۆشە", "خزانة زاوية", "Corner wardrobe", 0],
  ["maxsala.jpg", "bathroom", "کابینەی مەغسەلە و جلشۆر", "خزانة المغسلة والغسالة", "Sink & washer unit", 1],
  ["nustn.jpg", "vanity", "مێزی ئارایشت بە ڕووناکی", "تسريحة بإضاءة", "Lit dressing table", 1],
  ["sesam.jpg", "bed_panel", "دیواری پشتی قەرەوێڵە", "جدار السرير", "Upholstered bed wall", 1],
];

function init(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);

  // Migrations for databases created by older versions
  const miCols = (db.prepare("PRAGMA table_info(measurement_items)").all() as { name: string }[]).map((c) => c.name);
  if (!miCols.includes("photo")) db.exec("ALTER TABLE measurement_items ADD COLUMN photo TEXT");
  const mCols = (db.prepare("PRAGMA table_info(measurements)").all() as { name: string }[]).map((c) => c.name);
  if (!mCols.includes("closed")) db.exec("ALTER TABLE measurements ADD COLUMN closed INTEGER NOT NULL DEFAULT 0");
  if (!mCols.includes("notified_at")) db.exec("ALTER TABLE measurements ADD COLUMN notified_at TEXT");
  const bCols = (db.prepare("PRAGMA table_info(bookings)").all() as { name: string }[]).map((c) => c.name);
  if (!bCols.includes("worker_id")) db.exec("ALTER TABLE bookings ADD COLUMN worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL");
  if (!bCols.includes("duration_min")) db.exec("ALTER TABLE bookings ADD COLUMN duration_min INTEGER");
  const oCols = (db.prepare("PRAGMA table_info(orders)").all() as { name: string }[]).map((c) => c.name);
  if (!oCols.includes("installed_at")) {
    db.exec("ALTER TABLE orders ADD COLUMN installed_at TEXT");
    // Existing installed/completed orders: assume installed when created
    db.exec("UPDATE orders SET installed_at = date(created_at) WHERE status IN ('installed','completed')");
  }
  if (!oCols.includes("debt_notified_at")) db.exec("ALTER TABLE orders ADD COLUMN debt_notified_at TEXT");
  if (!oCols.includes("debt_reminded_at")) db.exec("ALTER TABLE orders ADD COLUMN debt_reminded_at TEXT");
  if (!oCols.includes("debt_reminders")) db.exec("ALTER TABLE orders ADD COLUMN debt_reminders INTEGER NOT NULL DEFAULT 0");
  if (!oCols.includes("share_token")) db.exec("ALTER TABLE orders ADD COLUMN share_token TEXT");
  if (!oCols.includes("accepted_at")) db.exec("ALTER TABLE orders ADD COLUMN accepted_at TEXT");
  if (!oCols.includes("materials_taken_at")) db.exec("ALTER TABLE orders ADD COLUMN materials_taken_at TEXT");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_token ON orders(share_token)");
  const pCols = (db.prepare("PRAGMA table_info(portfolio)").all() as { name: string }[]).map((c) => c.name);
  if (!pCols.includes("before_image")) db.exec("ALTER TABLE portfolio ADD COLUMN before_image TEXT");
  const tCols = (db.prepare("PRAGMA table_info(testimonials)").all() as { name: string }[]).map((c) => c.name);
  if (!tCols.includes("rating")) db.exec("ALTER TABLE testimonials ADD COLUMN rating INTEGER");

  // Region update (2026-11): replace the old Sulaymaniyah-only defaults, but never text the owner changed
  const fix = db.prepare("UPDATE settings SET value = ? WHERE key = ? AND value = ?");
  fix.run("Chwarqurna, Raparin, Kurdistan Region", "address", "Chwarqurna, Sulaymaniyah");
  fix.run("چوارقوڕنە، ڕاپەڕین، هەرێمی کوردستان", "address_ckb", "چوارقوڕنە، سلێمانی");
  fix.run("جوارقورنة، رابرين، إقليم كوردستان", "address_ar", "جوارقورنة، السليمانية");
  if ((db.prepare("SELECT name FROM sqlite_master WHERE name = 'faqs'").get())) {
    db.prepare("UPDATE faqs SET a_ckb = ?, a_ar = ?, a_en = ? WHERE a_en = ?").run(
      ckb.site.about.faq[3].a, ar.site.about.faq[3].a, en.site.about.faq[3].a,
      "Sulaymaniyah city and the surrounding area. Call us for projects further away.",
    );
  }

  const insSetting = db.prepare("INSERT OR IGNORE INTO settings(key, value) VALUES (?, ?)");
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insSetting.run(k, v);

  const users = db.prepare("SELECT COUNT(*) c FROM users").get() as { c: number };
  if (users.c === 0) {
    // No fixed default password (the code is public): use HOGR_ADMIN_PASSWORD, or create a random one
    // and save it in data/admin-password.txt for the first login.
    const first = process.env.HOGR_ADMIN_PASSWORD || crypto.randomBytes(6).toString("base64url");
    db.prepare("INSERT INTO users(name, username, password_hash, role) VALUES (?,?,?,?)").run("Hogr Sardar", "admin", hashPassword(first), "admin");
    if (!process.env.HOGR_ADMIN_PASSWORD) {
      fs.writeFileSync(path.join(DATA_DIR, "admin-password.txt"), `Username: admin\nPassword: ${first}\n\nChange it in Settings after logging in, then delete this file.\n`);
      console.log(`\n  First login: username "admin", password "${first}" (also saved in data/admin-password.txt)\n`);
    }
  }

  if ((db.prepare("SELECT COUNT(*) c FROM testimonials").get() as { c: number }).c === 0) {
    db.prepare("INSERT INTO testimonials(name_ckb,name_ar,name_en,role_ckb,role_ar,role_en,text_ckb,text_ar,text_en) VALUES (?,?,?,?,?,?,?,?,?)").run(
      ckb.site.quote.name, ar.site.quote.name, en.site.quote.name, ckb.site.quote.role, ar.site.quote.role, en.site.quote.role,
      ckb.site.quote.text, ar.site.quote.text, en.site.quote.text,
    );
  }
  if ((db.prepare("SELECT COUNT(*) c FROM faqs").get() as { c: number }).c === 0) {
    const ins = db.prepare("INSERT INTO faqs(q_ckb,q_ar,q_en,a_ckb,a_ar,a_en,sort) VALUES (?,?,?,?,?,?,?)");
    en.site.about.faq.forEach((_, i) =>
      ins.run(ckb.site.about.faq[i].q, ar.site.about.faq[i].q, en.site.about.faq[i].q, ckb.site.about.faq[i].a, ar.site.about.faq[i].a, en.site.about.faq[i].a, i),
    );
  }

  if ((db.prepare("SELECT COUNT(*) c FROM price_list").get() as { c: number }).c === 0) {
    // Starter prices (IQD) so quotes work on day one; the owner edits them in Price list
    const ins = db.prepare("INSERT INTO price_list(product_type, name_ckb, name_ar, name_en, unit, price, material, color, is_default, sort) VALUES (?,?,?,?,?,?,?,?,?,?)");
    const seed: [string, string, string, string, string, number, string, string, number][] = [
      ["window", "پەنجەرەی ئەلەمنیۆم", "نافذة ألمنيوم", "Aluminium window", "m2", 95000, "Aluminium", "", 1],
      ["window", "پەنجەرەی UPVC", "نافذة UPVC", "UPVC window", "m2", 75000, "UPVC", "", 0],
      ["door", "دەرگای ئەلەمنیۆمی سەرەکی", "باب ألمنيوم رئيسي", "Aluminium entrance door", "m2", 220000, "Aluminium", "", 1],
      ["door", "دەرگای ژوور", "باب داخلي", "Interior door", "piece", 250000, "MDF", "", 0],
      ["kitchen", "کابینەی چێشتخانە MDF", "مطبخ MDF", "MDF kitchen", "m", 350000, "MDF", "", 1],
      ["wardrobe", "دۆڵاب", "خزانة ملابس", "Wardrobe", "m2", 180000, "MDF", "", 1],
      ["bathroom", "کابینەی مەغسەلە", "خزانة مغسلة", "Sink unit", "m", 300000, "MDF", "", 1],
      ["vanity", "مێزی ئارایشت", "تسريحة", "Dressing table", "piece", 750000, "MDF", "", 1],
      ["bed_panel", "دیواری قەرەوێڵە", "جدار السرير", "Bed wall", "m2", 160000, "", "", 1],
    ];
    seed.forEach((r, i) => ins.run(...r, i));
  }

  const p = db.prepare("SELECT COUNT(*) c FROM portfolio").get() as { c: number };
  if (p.c === 0) {
    const ins = db.prepare(
      "INSERT INTO portfolio(image, category, title_ckb, title_ar, title_en, featured, sort) VALUES (?,?,?,?,?,?,?)",
    );
    PORTFOLIO_SEED.forEach((row, i) => ins.run(`/images/work/${row[0]}`, row[1], row[2], row[3], row[4], row[5], i));
  }
}

const g = globalThis as unknown as { __hogrDb?: Database.Database };

export function db() {
  if (!g.__hogrDb) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const d = new Database(path.join(DATA_DIR, "hogr.db"));
    init(d);
    g.__hogrDb = d;
  }
  return g.__hogrDb;
}

export function getSettings(locale?: string): Record<string, string> {
  const rows = db().prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const s: Record<string, string> = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  if (locale && locale !== "en" && s[`address_${locale}`]) s.address = s[`address_${locale}`];
  return s;
}

/* ---------- shared business helpers ---------- */

export type OrderItem = {
  id?: number;
  product_type: string;
  description: string;
  width: number | null;
  height: number | null;
  qty: number;
  unit: "piece" | "m2" | "m";
  unit_price: number;
};

/** Line total: m² items are priced by area (cm → m), metre items by width. */
export function lineTotal(i: Pick<OrderItem, "width" | "height" | "qty" | "unit" | "unit_price">) {
  const w = (i.width || 0) / 100;
  const h = (i.height || 0) / 100;
  if (i.unit === "m2") return w * h * i.qty * i.unit_price;
  if (i.unit === "m") return w * i.qty * i.unit_price;
  return i.qty * i.unit_price;
}

export function orderTotals(orderId: number) {
  const items = db().prepare("SELECT * FROM order_items WHERE order_id = ?").all(orderId) as OrderItem[];
  const o = db().prepare("SELECT discount FROM orders WHERE id = ?").get(orderId) as { discount: number } | undefined;
  const subtotal = items.reduce((s, i) => s + lineTotal(i), 0);
  const total = Math.max(0, subtotal - (o?.discount || 0));
  const paid = (db().prepare("SELECT COALESCE(SUM(amount),0) s FROM payments WHERE order_id = ?").get(orderId) as { s: number }).s;
  return { subtotal, total, paid, balance: total - paid };
}

/** Totals for many orders at once (used by lists and dashboard). */
export function allOrderTotals() {
  const items = db().prepare("SELECT order_id, width, height, qty, unit, unit_price FROM order_items").all() as (OrderItem & { order_id: number })[];
  const pays = db().prepare("SELECT order_id, SUM(amount) s FROM payments WHERE order_id IS NOT NULL GROUP BY order_id").all() as { order_id: number; s: number }[];
  const orders = db().prepare("SELECT id, discount FROM orders").all() as { id: number; discount: number }[];
  const map = new Map<number, { subtotal: number; total: number; paid: number; balance: number }>();
  for (const o of orders) map.set(o.id, { subtotal: 0, total: 0, paid: 0, balance: 0 });
  for (const i of items) {
    const m = map.get(i.order_id);
    if (m) m.subtotal += lineTotal(i);
  }
  const paid = new Map(pays.map((p) => [p.order_id, p.s]));
  for (const o of orders) {
    const m = map.get(o.id)!;
    m.total = Math.max(0, m.subtotal - (o.discount || 0));
    m.paid = paid.get(o.id) || 0;
    m.balance = m.total - m.paid;
  }
  return map;
}

export const orderNo = (id: number) => `HG-${String(id).padStart(4, "0")}`;
