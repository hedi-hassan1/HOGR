import Link from "next/link";
import { CalendarPlus, UserPlus, FilePlus2, Wallet } from "lucide-react";
import { db, allOrderTotals, getSettings, orderNo } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { dateFmt, money, monthName, todayISO } from "@/lib/format";
import { Badge, Money, Panel, Stat, STATUS_TONE } from "@/components/admin/ui";
import { followupDays, getWaiting } from "@/lib/followup";
import { DebtsList } from "@/components/admin/DebtsList";

export default async function Dashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await requireUser(locale);
  const t = getDict(locale);
  const a = t.admin;
  const cur = getSettings().currency || "IQD";
  const base = `/${locale}/admin`;
  const today = todayISO();
  const monthStart = today.slice(0, 8) + "01";
  const d = db();

  const revenue = (d.prepare("SELECT COALESCE(SUM(amount),0) s FROM payments WHERE date >= ?").get(monthStart) as { s: number }).s;
  const expenses = (d.prepare("SELECT COALESCE(SUM(amount),0) s FROM expenses WHERE date >= ?").get(monthStart) as { s: number }).s;

  const totals = allOrderTotals();
  const orders = d.prepare("SELECT o.id, o.status, o.title, c.name client FROM orders o JOIN clients c ON c.id = o.client_id").all() as { id: number; status: string; title: string | null; client: string }[];
  const active = orders.filter((o) => o.status !== "quote" && o.status !== "cancelled");
  const outstanding = active.reduce((s, o) => s + Math.max(0, totals.get(o.id)?.balance || 0), 0);
  const owed = active
    .map((o) => ({ ...o, balance: totals.get(o.id)?.balance || 0 }))
    .filter((o) => o.balance > 0)
    .sort((x, y) => y.balance - x.balance)
    .slice(0, 5);

  const pipelineKeys = ["quote", "confirmed", "production", "ready", "installed"] as const;
  const pipeline = pipelineKeys.map((k) => ({ k, n: orders.filter((o) => o.status === k).length }));

  const upcoming = d
    .prepare(
      `SELECT b.*, c.name cname, c.phone cphone FROM bookings b LEFT JOIN clients c ON c.id = b.client_id
       WHERE b.status = 'scheduled' ORDER BY b.date, b.time LIMIT 7`,
    )
    .all() as { id: number; date: string; time: string | null; type: string; name: string | null; cname: string | null; phone: string | null; cphone: string | null; address: string | null }[];

  const leads = d.prepare("SELECT * FROM leads WHERE status = 'new' ORDER BY id DESC LIMIT 5").all() as { id: number; name: string; phone: string; service: string | null; created_at: string }[];
  const low = d.prepare("SELECT * FROM inventory WHERE quantity <= min_quantity AND min_quantity > 0 ORDER BY name LIMIT 6").all() as { id: number; name: string; quantity: number; unit: string | null }[];

  // Last 6 months of payments
  const months: { key: string; label: string; v: number }[] = [];
  const now = new Date(today + "T00:00:00Z");
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({ key: dt.toISOString().slice(0, 7), label: monthName(dt.getUTCMonth(), locale), v: 0 });
  }
  const sums = d.prepare("SELECT substr(date,1,7) m, SUM(amount) s FROM payments WHERE date >= ? GROUP BY m").all(months[0].key + "-01") as { m: string; s: number }[];
  for (const s of sums) {
    const m = months.find((x) => x.key === s.m);
    if (m) m.v = s.s;
  }
  const maxV = Math.max(1, ...months.map((m) => m.v));
  const waiting = getWaiting();
  const { red } = followupDays();

  const quick = [
    { href: `${base}/clients?new=1`, label: a.dashboard.quick.client, icon: UserPlus },
    { href: `${base}/bookings?new=1`, label: a.dashboard.quick.booking, icon: CalendarPlus },
    { href: `${base}/orders?new=1`, label: a.dashboard.quick.order, icon: FilePlus2 },
    { href: `${base}/payments?new=1`, label: a.dashboard.quick.payment, icon: Wallet },
  ];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted">{a.dashboard.greeting}, {user.name}</p>
          <h1 className="text-2xl font-bold md:text-[28px]">{dateFmt(today, locale)}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {quick.map((q) => (
            <Link key={q.href} href={q.href} className="btn btn-ghost bg-white btn-sm py-2">
              <q.icon size={16} /> {q.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={a.dashboard.revenueMonth} value={money(revenue, cur, locale)} />
        <Stat label={a.dashboard.expensesMonth} value={money(expenses, cur, locale)} />
        <Stat label={a.dashboard.profitMonth} value={money(revenue - expenses, cur, locale)} tone={revenue - expenses < 0 ? "bad" : "ok"} />
        <Stat label={a.dashboard.outstanding} value={money(outstanding, cur, locale)} tone={outstanding > 0 ? "bad" : undefined} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title={a.dashboard.upcoming} className="lg:col-span-2" pad={false} action={<Link href={`${base}/bookings`} className="text-sm text-muted hover:text-graphite">{a.common.open}</Link>}>
          {upcoming.length === 0 ? (
            <p className="p-5 text-muted">{a.dashboard.noUpcoming}</p>
          ) : (
            <ul className="divide-y divide-[#eceae6]">
              {upcoming.map((b) => {
                const overdue = b.date < today;
                return (
                  <li key={b.id}>
                    <Link href={`${base}/bookings?edit=${b.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-[#fbfbfa]">
                      <div className={`w-20 shrink-0 text-sm ${overdue ? "text-bad" : b.date === today ? "font-semibold text-brass" : "text-muted"}`}>
                        <div>{b.date === today ? a.common.today : dateFmt(b.date, locale).replace(/ \d{4}$/, "")}</div>
                        <div className="num">{b.time || ""}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{b.cname || b.name}</div>
                        <div className="truncate text-sm text-muted">{b.address}</div>
                      </div>
                      {overdue ? <Badge tone="red">{a.bookings.overdue}</Badge> : <Badge tone="blue">{a.bookings.types[b.type as keyof typeof a.bookings.types]}</Badge>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title={a.dashboard.pipeline}>
          <ul className="space-y-3">
            {pipeline.map((p) => (
              <li key={p.k}>
                <Link href={`${base}/orders?status=${p.k}`} className="flex items-center justify-between gap-3 hover:opacity-80">
                  <Badge tone={STATUS_TONE[p.k]}>{a.orders.statuses[p.k]}</Badge>
                  <span className="num text-lg font-semibold">{p.n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title={a.dashboard.revenueChart} className="lg:col-span-2">
          <div className="flex h-52 items-end gap-3 sm:gap-5" role="img" aria-label={months.map((m) => `${m.label}: ${money(m.v, cur, locale)}`).join(", ")}>
            {months.map((m, i) => (
              <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="num text-[11px] text-muted" dir="ltr">{m.v ? new Intl.NumberFormat("en", { notation: "compact" }).format(m.v) : ""}</span>
                <div
                  className={`w-full max-w-14 rounded-t-[4px] ${i === months.length - 1 ? "bg-brass" : "bg-graphite"}`}
                  style={{ height: `${Math.max(2, (m.v / maxV) * 100)}%`, opacity: m.v ? 1 : 0.15 }}
                  title={money(m.v, cur, locale)}
                />
                <span className="truncate text-xs text-muted">{m.label}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title={a.debts.tab} pad={false} action={<Link href={`${base}/payments?tab=unpaid`} className="text-sm text-muted hover:text-graphite">{a.common.open}</Link>}>
          <DebtsList locale={locale} a={a} limit={4} />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title={a.followup.dashTitle} pad={false} action={<Link href={`${base}/measurements`} className="text-sm text-muted hover:text-graphite">{a.common.open}</Link>}>
          {waiting.length === 0 ? (
            <p className="p-5 text-muted">{a.followup.dashEmpty}</p>
          ) : (
            <ul className="divide-y divide-[#eceae6]">
              {waiting.slice(0, 6).map((w) => (
                <li key={w.id}>
                  <Link href={`${base}/measurements/${w.id}`} className={`flex items-center justify-between gap-3 px-5 py-3 hover:bg-[#fbfbfa] ${w.days >= red ? "bg-[#fbeceb]" : ""}`}>
                    <span className="min-w-0">
                      <span className={`block truncate font-medium ${w.days >= red ? "text-bad" : ""}`}>{w.name}</span>
                      <span className="num text-sm text-muted" dir="ltr">{w.phone}</span>
                    </span>
                    <Badge tone={w.days >= red ? "red" : "amber"}>{a.followup.days.replace("{n}", String(w.days))}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title={a.dashboard.newLeads} pad={false} action={<Link href={`${base}/leads`} className="text-sm text-muted hover:text-graphite">{a.common.open}</Link>}>
          {leads.length === 0 ? (
            <p className="p-5 text-muted">{a.dashboard.noLeads}</p>
          ) : (
            <ul className="divide-y divide-[#eceae6]">
              {leads.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span>
                    <span className="block font-medium">{l.name}</span>
                    <a href={`tel:${l.phone}`} className="num text-sm text-muted" dir="ltr">{l.phone}</a>
                  </span>
                  {l.service && <Badge tone="brass">{t.products[l.service as keyof typeof t.products] || l.service}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title={a.dashboard.lowStock} pad={false} action={<Link href={`${base}/inventory`} className="text-sm text-muted hover:text-graphite">{a.common.open}</Link>}>
          {low.length === 0 ? (
            <p className="p-5 text-muted">{a.dashboard.noLowStock}</p>
          ) : (
            <ul className="divide-y divide-[#eceae6]">
              {low.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="font-medium">{i.name}</span>
                  <span className="num text-bad">{i.quantity} {i.unit}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
