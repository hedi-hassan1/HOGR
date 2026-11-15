// Fills the database with sample clients, bookings, orders and payments so you can try the system.
// Usage: npm run demo   (start the app once first so the database exists)
// To start clean afterwards, stop the app and delete the "data" folder.
import Database from "better-sqlite3";
import path from "node:path";

const dir = process.env.HOGR_DATA_DIR || path.join(process.cwd(), "data");
const db = new Database(path.join(dir, "hogr.db"));
db.pragma("foreign_keys = ON");

const iso = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

const clients = [
  ["کاروان ئەحمەد", "0750 123 4567", "بەختیاری، سلێمانی", "facebook"],
  ["شیلان عومەر", "0770 234 5678", "ئازادی، سلێمانی", "referral"],
  ["Rebwar Jalal", "0751 345 6789", "Raparin, Sulaymaniyah", "walk_in"],
  ["هێمن کەریم", "0750 456 7890", "سەرچنار، سلێمانی", "website"],
  ["ئاڤان محەمەد", "0772 567 8901", "کانی با، سلێمانی", "instagram"],
];

const tx = db.transaction(() => {
  const ids = clients.map(([name, phone, address, source]) =>
    Number(db.prepare("INSERT INTO clients(name, phone, address, city, source) VALUES (?,?,?,?,?)").run(name, phone, address, "سلێمانی", source).lastInsertRowid),
  );

  const book = db.prepare("INSERT INTO bookings(client_id, type, date, time, address, status, assigned_to) VALUES (?,?,?,?,?,?,?)");
  book.run(ids[3], "measurement", iso(0), "10:00", clients[3][2], "scheduled", "Hogr");
  book.run(ids[4], "measurement", iso(1), "13:30", clients[4][2], "scheduled", "Hogr");
  book.run(ids[0], "installation", iso(3), "09:00", clients[0][2], "scheduled", "Team A");
  book.run(ids[1], "measurement", iso(-12), "11:00", clients[1][2], "done", "Hogr");

  // A measurement sheet → order
  const m = Number(db.prepare("INSERT INTO measurements(client_id, title, address, taken_by, date) VALUES (?,?,?,?,?)").run(ids[1], "Kitchen + 3 windows", clients[1][2], "Hogr Sardar", iso(-12)).lastInsertRowid);
  const mi = db.prepare("INSERT INTO measurement_items(measurement_id, product_type, room, width, height, depth, qty, material, color, sort) VALUES (?,?,?,?,?,?,?,?,?,?)");
  mi.run(m, "kitchen", "Kitchen", 420, 90, 60, 1, "MDF high gloss", "Greige", 0);
  mi.run(m, "window", "Living room", 180, 150, null, 2, "Aluminium", "Black", 1);
  mi.run(m, "window", "Bedroom", 120, 140, null, 1, "Aluminium", "Black", 2);

  const order = (client, title, status, due, items, discount = 0, mid = null) => {
    const id = Number(db.prepare("INSERT INTO orders(client_id, measurement_id, title, status, discount, due_date) VALUES (?,?,?,?,?,?)").run(client, mid, title, status, discount, due).lastInsertRowid);
    const ins = db.prepare("INSERT INTO order_items(order_id, product_type, description, width, height, qty, unit, unit_price, sort) VALUES (?,?,?,?,?,?,?,?,?)");
    items.forEach((it, i) => ins.run(id, ...it, i));
    return id;
  };
  const o1 = order(ids[1], "Kitchen + 3 windows", "production", iso(10), [
    ["kitchen", "MDF high gloss · Greige", 420, 90, 1, "m", 350000],
    ["window", "Living room · Black aluminium", 180, 150, 2, "m2", 95000],
    ["window", "Bedroom · Black aluminium", 120, 140, 1, "m2", 95000],
  ], 50000, m);
  const o2 = order(ids[0], "Entrance door + wardrobe", "ready", iso(3), [
    ["door", "Double entrance door, wood-effect panels", 160, 240, 1, "piece", 1850000],
    ["wardrobe", "Hallway wardrobe with bench", 240, 270, 1, "m2", 180000],
  ]);
  const o3 = order(ids[2], "Bathroom vanity", "completed", iso(-20), [["bathroom", "Sink + washer unit", 220, 90, 1, "piece", 900000]]);
  order(ids[4], "Dressing table (quote)", "quote", null, [["vanity", "Lit round mirror, 7 drawers", 200, 80, 1, "piece", 750000]]);

  const pay = db.prepare("INSERT INTO payments(order_id, client_id, amount, method, date) VALUES (?,?,?,?,?)");
  pay.run(o1, ids[1], 1000000, "cash", iso(-11));
  pay.run(o2, ids[0], 1500000, "fib", iso(-25));
  pay.run(o3, ids[2], 900000, "cash", iso(-50));
  pay.run(o2, ids[0], 500000, "transfer", iso(-80));
  pay.run(o1, ids[1], 300000, "fastpay", iso(-110));

  const exp = db.prepare("INSERT INTO expenses(category, amount, date, description, supplier) VALUES (?,?,?,?,?)");
  exp.run("materials", 850000, iso(-5), "Aluminium profiles", "Saray");
  exp.run("materials", 320000, iso(-8), "Double glazing 6 sheets", "Glass market");
  exp.run("salaries", 1200000, iso(-2), "Workshop staff", null);
  exp.run("utilities", 140000, iso(-6), "Generator + electricity", null);

  const inv = db.prepare("INSERT INTO inventory(name, category, unit, quantity, min_quantity, cost, supplier) VALUES (?,?,?,?,?,?,?)");
  inv.run("Saray aluminium profile 6m (black)", "aluminium", "bar", 34, 20, 42000, "Saray");
  inv.run("UPVC profile 6m (white)", "upvc", "bar", 8, 15, 30000, null);
  inv.run("Double glazing 4-16-4", "glass", "m²", 22, 10, 28000, "Glass market");
  inv.run("MDF high gloss 18mm", "boards", "sheet", 6, 10, 55000, null);
  inv.run("Soft-close hinges", "hardware", "pcs", 140, 50, 2500, null);

  const lead = db.prepare("INSERT INTO leads(name, phone, service, message, preferred_date, address, locale) VALUES (?,?,?,?,?,?,?)");
  lead.run("دیار حەسەن", "0750 987 6543", "window", "پێنج پەنجەرەی ئەلەمنیۆم بۆ خانووی نوێ", iso(2), "شاری جوان", "ckb");
  lead.run("Sara Ali", "0771 876 5432", "kitchen", "Need a full kitchen, around 5 metres", iso(4), "Bakhtiari", "en");
});
tx();
console.log("Demo data added.");
