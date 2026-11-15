import { db, getSettings } from "./db";
import { getDict } from "./i18n";
import { money } from "./format";
import { followupDays, getWaiting } from "./followup";
import { getDebts, monthLabel, monthOf, monthReport, shiftMonth } from "./ops";
import { sendPush } from "./push";
import { runBackup } from "./extras";

/*
 * Background reminders, delivered as normal phone notifications (Web Push) to every device where
 * someone tapped "Turn on notifications". Quiet at night: only between 08:00 and 21:00.
 */

const fill = (tpl: string, v: Record<string, string | number>) => tpl.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const loc = () => getSettings().notify_locale || "ckb";
const awake = () => {
  const h = new Date().getHours();
  return h >= 8 && h < 21;
};

/** Measurements that waited `notify` days with no order — one notification, once per measurement. */
export async function runReminders(opts: { force?: boolean } = {}): Promise<{ sent: number }> {
  if (!opts.force && !awake()) return { sent: 0 };
  const { notify } = followupDays();
  const due = getWaiting().filter((w) => w.days >= notify && !w.notified_at);
  if (!due.length) return { sent: 0 };
  const l = loc();
  const L = getDict(l).admin.followup;
  const body = due.map((w) => fill(L.msgLine, { name: w.name, phone: w.phone || "—", days: w.days, items: w.items })).join("\n");
  const n = await sendPush({
    title: L.msgTitle,
    body,
    url: due.length === 1 ? `/${l}/admin/measurements/${due[0].id}` : `/${l}/admin/measurements`,
    tag: "followup",
  });
  if (n) {
    const mark = db().prepare("UPDATE measurements SET notified_at = datetime('now') WHERE id = ?");
    for (const w of due) mark.run(w.id);
  }
  return { sent: n ? due.length : 0 };
}

/** Installed but unpaid orders whose reminder is due — opens the Unpaid list with WhatsApp buttons. */
export async function runDebtAlerts(opts: { force?: boolean } = {}): Promise<{ sent: number }> {
  if (!opts.force && !awake()) return { sent: 0 };
  // Alert about each due debt at most once per reminder cycle
  const due = getDebts().filter((d) => d.due && (!d.debt_notified_at || (d.debt_reminded_at && d.debt_notified_at < d.debt_reminded_at)));
  if (!due.length) return { sent: 0 };
  const l = loc();
  const s = getSettings();
  const L = getDict(l).admin.debts;
  const body = due.map((d) => fill(L.tgLine, { name: d.name, phone: d.phone || "—", amount: money(d.balance, s.currency || "IQD", l), days: d.days })).join("\n");
  const n = await sendPush({ title: L.tgTitle, body: `${body}\n${L.tgFooter}`, url: `/${l}/admin/payments?tab=unpaid`, tag: "debts" });
  if (n) {
    const mark = db().prepare("UPDATE orders SET debt_notified_at = datetime('now') WHERE id = ?");
    for (const d of due) mark.run(d.id);
  }
  return { sent: n ? due.length : 0 };
}

/** Short summary of a month as a notification; tapping it opens the full report. */
export async function sendMonthReport(month: string): Promise<boolean> {
  const l = loc();
  const t = getDict(l);
  const L = t.admin.reports;
  const r = monthReport(month);
  const cur = getSettings().currency || "IQD";
  const best = r.byProduct[0] ? `\n${L.tgBest}: ${t.products[r.byProduct[0].k as keyof typeof t.products] ?? r.byProduct[0].k}` : "";
  const body = `${L.income}: ${money(r.income, cur, l)}\n${L.expenses}: ${money(r.expenses, cur, l)}\n${L.profit}: ${money(r.profit, cur, l)}${best}`;
  const n = await sendPush({ title: L.tgTitle.replace("{month}", monthLabel(month, l)), body, url: `/${l}/admin/reports?month=${month}`, tag: "report" });
  return n > 0;
}

/** On the 1st of the month (from 9:00), sends last month's report once. */
export async function runMonthlyReport(): Promise<boolean> {
  const s = getSettings();
  const now = new Date();
  if (s.report_monthly === "0" || now.getDate() !== 1 || now.getHours() < 9) return false;
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString();
  const month = shiftMonth(monthOf(local), -1);
  if (s.report_last_sent === month) return false;
  const ok = await sendMonthReport(month);
  if (ok) db().prepare("INSERT INTO settings(key, value) VALUES ('report_last_sent', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(month);
  return ok;
}

/** Starts the background check (once per server process). */
export function startReminderLoop() {
  const g = globalThis as unknown as { __hogrReminders?: boolean };
  if (g.__hogrReminders) return;
  g.__hogrReminders = true;
  const tick = async () => {
    await runReminders().catch(() => {});
    await runDebtAlerts().catch(() => {});
    await runMonthlyReport().catch(() => {});
    await runBackup().catch(() => {});
  };
  setTimeout(tick, 30_000);
  setInterval(tick, 15 * 60_000);
}
