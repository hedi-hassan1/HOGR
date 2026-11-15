import { allOrderTotals, db, getSettings, lineTotal, orderNo, type OrderItem } from "./db";
import { getDict } from "./i18n";
import { money, monthName, todayISO } from "./format";

/* ======================= Workers & wages ======================= */

export type Worker = { id: number; name: string; phone: string | null; role: string | null; pay_type: "daily" | "monthly"; rate: number; color: string | null; active: number; notes: string | null };
export const DAY_FACTOR: Record<string, number> = { present: 1, half: 0.5, absent: 0 };

export function getWorkers(activeOnly = false) {
  return db().prepare(`SELECT * FROM workers ${activeOnly ? "WHERE active = 1" : ""} ORDER BY active DESC, name`).all() as Worker[];
}

export const monthOf = (iso: string) => iso.slice(0, 7);
export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(days).padStart(2, "0")}`, days };
}
export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** Attendance for a month: workerId → { "YYYY-MM-DD": status } */
export function getAttendance(month: string) {
  const { start, end } = monthRange(month);
  const rows = db().prepare("SELECT worker_id, date, status FROM worker_days WHERE date BETWEEN ? AND ?").all(start, end) as { worker_id: number; date: string; status: string }[];
  const map = new Map<number, Record<string, string>>();
  for (const r of rows) {
    const m = map.get(r.worker_id) || {};
    m[r.date] = r.status;
    map.set(r.worker_id, m);
  }
  return map;
}

/** Days worked, wages earned, paid and still owed for each worker in a month. */
export function wageSummary(month: string) {
  const { start, end } = monthRange(month);
  const att = getAttendance(month);
  const pays = db().prepare("SELECT worker_id, SUM(amount) s FROM worker_payments WHERE date BETWEEN ? AND ? GROUP BY worker_id").all(start, end) as { worker_id: number; s: number }[];
  const paid = new Map(pays.map((p) => [p.worker_id, p.s]));
  return new Map(
    getWorkers().map((w) => {
      const days = Object.values(att.get(w.id) || {}).reduce((s, st) => s + (DAY_FACTOR[st] ?? 0), 0);
      const earned = w.pay_type === "monthly" ? w.rate : days * w.rate;
      const p = paid.get(w.id) || 0;
      return [w.id, { days, earned, paid: p, remaining: earned - p }];
    }),
  );
}

/* ======================= Debts after installation ======================= */

export type Debt = { id: number; client_id: number; name: string; phone: string | null; title: string | null; installed_at: string; days: number; balance: number; total: number; debt_reminded_at: string | null; debt_reminders: number; debt_notified_at: string | null; due: boolean };

const daysBetween = (fromIso: string, toIso: string) => Math.round((Date.parse(toIso + "T00:00:00Z") - Date.parse(fromIso.slice(0, 10) + "T00:00:00Z")) / 86400000);

export function debtDays() {
  return Math.max(1, parseInt(getSettings().debt_days || "7", 10) || 7);
}

export function getDebts(): Debt[] {
  const every = debtDays();
  const today = todayISO();
  const totals = allOrderTotals();
  const rows = db()
    .prepare(
      `SELECT o.id, o.client_id, c.name, c.phone, o.title, COALESCE(o.installed_at, date(o.created_at)) installed_at,
              o.debt_reminded_at, o.debt_reminders, o.debt_notified_at
       FROM orders o JOIN clients c ON c.id = o.client_id
       WHERE o.status IN ('installed','completed')`,
    )
    .all() as Omit<Debt, "days" | "balance" | "total" | "due">[];
  return rows
    .map((r) => {
      const t = totals.get(r.id);
      const days = daysBetween(r.installed_at, today);
      // Due when it has waited the set number of days since installation, and again every N days after the last reminder
      const sinceReminder = r.debt_reminded_at ? daysBetween(r.debt_reminded_at, today) : Infinity;
      return { ...r, days, balance: t?.balance || 0, total: t?.total || 0, due: days >= every && sinceReminder >= every };
    })
    .filter((d) => d.balance > 0.009)
    .sort((a, b) => Number(b.due) - Number(a.due) || b.days - a.days);
}

export const waNumber = (phone: string | null) => (phone ? phone.replace(/\D/g, "").replace(/^00/, "").replace(/^0/, "964") : "");

/** Polite WhatsApp reminder link with the message already written. */
export function debtWhatsAppLink(d: Pick<Debt, "id" | "name" | "phone" | "balance">, locale: string) {
  const num = waNumber(d.phone);
  if (!num) return null;
  const s = getSettings();
  const L = getDict(locale).admin.debts;
  const text = L.message.replace("{name}", d.name).replace("{amount}", money(d.balance, s.currency || "IQD", locale)).replace("{order}", orderNo(d.id));
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

/* ======================= Monthly report ======================= */

export function monthReport(month: string) {
  const { start, end } = monthRange(month);
  const d = db();
  const income = (d.prepare("SELECT COALESCE(SUM(amount),0) s FROM payments WHERE date BETWEEN ? AND ?").get(start, end) as { s: number }).s;
  const expenses = (d.prepare("SELECT COALESCE(SUM(amount),0) s FROM expenses WHERE date BETWEEN ? AND ?").get(start, end) as { s: number }).s;
  const expByCat = d.prepare("SELECT category k, SUM(amount) v FROM expenses WHERE date BETWEEN ? AND ? GROUP BY category ORDER BY v DESC").all(start, end) as { k: string; v: number }[];
  const newClients = d.prepare("SELECT COALESCE(NULLIF(source,''),'other') k, COUNT(*) v FROM clients WHERE date(created_at,'localtime') BETWEEN ? AND ? GROUP BY k ORDER BY v DESC").all(start, end) as { k: string; v: number }[];
  const orders = d.prepare("SELECT id FROM orders WHERE status NOT IN ('quote','cancelled') AND date(created_at,'localtime') BETWEEN ? AND ?").all(start, end) as { id: number }[];
  const items = orders.length
    ? (d.prepare(`SELECT * FROM order_items WHERE order_id IN (${orders.map(() => "?").join(",")})`).all(...orders.map((o) => o.id)) as OrderItem[])
    : [];
  const byProduct = new Map<string, number>();
  for (const it of items) byProduct.set(it.product_type, (byProduct.get(it.product_type) || 0) + lineTotal(it));
  const totals = allOrderTotals();
  const statuses = d.prepare("SELECT id, status FROM orders").all() as { id: number; status: string }[];
  const outstanding = statuses.filter((o) => o.status !== "quote" && o.status !== "cancelled").reduce((s, o) => s + Math.max(0, totals.get(o.id)?.balance || 0), 0);
  return {
    income, expenses, profit: income - expenses, outstanding,
    newOrders: orders.length,
    newClients: newClients.reduce((s, r) => s + r.v, 0),
    bySource: newClients,
    byExpense: expByCat,
    byProduct: [...byProduct.entries()].map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v),
  };
}

export function monthLabel(month: string, locale: string) {
  const [y, m] = month.split("-").map(Number);
  return `${monthName(m - 1, locale)} ${y}`;
}

export function reportText(month: string, locale: string) {
  const r = monthReport(month);
  const t = getDict(locale);
  const L = t.admin.reports;
  const cur = getSettings().currency || "IQD";
  const m = (v: number) => money(v, cur, locale);
  const lines = [
    L.tgTitle.replace("{month}", monthLabel(month, locale)),
    "",
    `${L.income}: ${m(r.income)}`,
    `${L.expenses}: ${m(r.expenses)}`,
    `${L.profit}: ${m(r.profit)}`,
    `${L.outstanding}: ${m(r.outstanding)}`,
    `${L.newOrders}: ${r.newOrders} · ${L.newClients}: ${r.newClients}`,
  ];
  if (r.byProduct.length) {
    lines.push("", `${L.tgBest}:`);
    for (const p of r.byProduct.slice(0, 3)) lines.push(`• ${t.products[p.k as keyof typeof t.products] ?? p.k}: ${m(p.v)}`);
  }
  if (r.bySource.length) {
    lines.push("", `${L.tgSources}:`);
    for (const s of r.bySource) lines.push(`• ${t.admin.clients.sources[s.k as keyof typeof t.admin.clients.sources] ?? s.k}: ${s.v}`);
  }
  return lines.join("\n");
}
