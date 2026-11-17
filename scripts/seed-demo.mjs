// Fills the database with sample clients, bookings, orders and payments so you can try the system.
// Usage: npm run demo   (start the app once first so the database exists)
// To start clean afterwards, stop the app and delete the "data" folder.
// Works on the local file and, with TURSO_DATABASE_URL + TURSO_AUTH_TOKEN set, on the online database.
import { createClient } from "@libsql/client";
import path from "node:path";

const dir = process.env.HOGR_DATA_DIR || path.join(process.cwd(), "data");
const db = createClient(
  process.env.TURSO_DATABASE_URL
    ? { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN }
    : { url: "file:" + path.join(dir, "hogr.db").replace(/\\/g, "/") },
);
const run = async (sql, args = []) => (await db.execute({ sql, args })).lastInsertRowid;
const get = async (sql, args = []) => (await db.execute({ sql, args })).rows[0];

const iso = (offset) => {
  const x = new Date();
  x.setDate(x.getDate() + offset);
  return x.toISOString().slice(0, 10);
};

const clients = [
  ["کاروان ئەحمەد", "0750 123 4567", "بەختیاری، سلێمانی", "facebook"],
  ["شیلان عومەر", "0770 234 5678", "ئازادی، سلێمانی", "referral"],
  ["Rebwar Jalal", "0751 345 6789", "Raparin, Ranya", "walk_in"],
  ["هێمن کەریم", "0750 456 7890", "چوارقوڕنە", "website"],
  ["ئاڤان محەمەد", "0772 567 8901", "قەڵادزێ", "instagram"],
];

const ids = [];
for (const [name, phone, address, source] of clients) {
  ids.push(Number(await run("INSERT INTO clients(name, phone, address, city, source) VALUES (?,?,?,?,?)", [name, phone, address, "ڕاپەڕین", source])));
}

const book = (...a) => run("INSERT INTO bookings(client_id, type, date, time, address, status, assigned_to) VALUES (?,?,?,?,?,?,?)", a);
await book(ids[3], "measurement", iso(0), "10:00", clients[3][2], "scheduled", "Hogr");
await book(ids[4], "measurement", iso(1), "13:30", clients[4][2], "scheduled", "Hogr");
await book(ids[0], "installation", iso(3), "09:00", clients[0][2], "scheduled", "Team A");
await book(ids[1], "measurement", iso(-12), "11:00", clients[1][2], "done", "Hogr");

// A measurement sheet → order
const m = Number(await run("INSERT INTO measurements(client_id, title, address, taken_by, date) VALUES (?,?,?,?,?)", [ids[1], "Kitchen + 3 windows", clients[1][2], "Hogr Sardar", iso(-12)]));
const mi = (...a) => run("INSERT INTO measurement_items(measurement_id, product_type, room, width, height, depth, qty, material, color, sort) VALUES (?,?,?,?,?,?,?,?,?,?)", a);
await mi(m, "kitchen", "Kitchen", 420, 90, 60, 1, "MDF high gloss", "Greige", 0);
await mi(m, "window", "Living room", 180, 150, null, 2, "Aluminium", "Black", 1);
await mi(m, "window", "Bedroom", 120, 140, null, 1, "Aluminium", "Black", 2);

const order = async (client, title, status, due, items, discount = 0, mid = null) => {
  const id = Number(await run("INSERT INTO orders(client_id, measurement_id, title, status, discount, due_date) VALUES (?,?,?,?,?,?)", [client, mid, title, status, discount, due]));
  for (let i = 0; i < items.length; i++) {
    await run("INSERT INTO order_items(order_id, product_type, description, width, height, qty, unit, unit_price, sort) VALUES (?,?,?,?,?,?,?,?,?)", [id, ...items[i], i]);
  }
  return id;
};
const o1 = await order(ids[1], "Kitchen + 3 windows", "production", iso(10), [
  ["kitchen", "MDF high gloss · Greige", 420, 90, 1, "m", 350000],
  ["window", "Living room · Black aluminium", 180, 150, 2, "m2", 95000],
  ["window", "Bedroom · Black aluminium", 120, 140, 1, "m2", 95000],
], 50000, m);
const o2 = await order(ids[0], "Entrance door + wardrobe", "ready", iso(3), [
  ["door", "Double entrance door, wood-effect panels", 160, 240, 1, "piece", 1850000],
  ["wardrobe", "Hallway wardrobe with bench", 240, 270, 1, "m2", 180000],
]);
const o3 = await order(ids[2], "Bathroom vanity", "completed", iso(-20), [["bathroom", "Sink + washer unit", 220, 90, 1, "piece", 900000]]);
await order(ids[4], "Dressing table (quote)", "quote", null, [["vanity", "Lit round mirror, 7 drawers", 200, 80, 1, "piece", 750000]]);

const pay = (...a) => run("INSERT INTO payments(order_id, client_id, amount, method, date) VALUES (?,?,?,?,?)", a);
await pay(o1, ids[1], 1000000, "cash", iso(-11));
await pay(o2, ids[0], 1500000, "fib", iso(-25));
await pay(o3, ids[2], 900000, "cash", iso(-50));
await pay(o2, ids[0], 500000, "transfer", iso(-80));
await pay(o1, ids[1], 300000, "fastpay", iso(-110));

const exp = (...a) => run("INSERT INTO expenses(category, amount, date, description, supplier) VALUES (?,?,?,?,?)", a);
await exp("materials", 850000, iso(-5), "Aluminium profiles", "Saray");
await exp("materials", 320000, iso(-8), "Double glazing 6 sheets", "Glass market");
await exp("salaries", 1200000, iso(-2), "Workshop staff", null);
await exp("utilities", 140000, iso(-6), "Generator + electricity", null);

const inv = (...a) => run("INSERT INTO inventory(name, category, unit, quantity, min_quantity, cost, supplier) VALUES (?,?,?,?,?,?,?)", a);
await inv("Saray aluminium profile 6m (black)", "aluminium", "bar", 34, 20, 42000, "Saray");
await inv("UPVC profile 6m (white)", "upvc", "bar", 8, 15, 30000, null);
await inv("Double glazing 4-16-4", "glass", "m²", 22, 10, 28000, "Glass market");
await inv("MDF high gloss 18mm", "boards", "sheet", 6, 10, 55000, null);
await inv("Soft-close hinges", "hardware", "pcs", 140, 50, 2500, null);

const lead = (...a) => run("INSERT INTO leads(name, phone, service, message, preferred_date, address, locale) VALUES (?,?,?,?,?,?,?)", a);
await lead("دیار حەسەن", "0750 987 6543", "window", "پێنج پەنجەرەی ئەلەمنیۆم بۆ خانووی نوێ", iso(2), "ڕانیە", "ckb");
await lead("Sara Ali", "0771 876 5432", "kitchen", "Need a full kitchen, around 5 metres", iso(4), "Qaladze", "en");

console.log("Demo data added.", await get("SELECT COUNT(*) n FROM clients"));
