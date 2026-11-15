import Link from "next/link";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";
import { getSettings } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { money, todayISO } from "@/lib/format";
import { monthLabel, monthOf, monthReport, shiftMonth } from "@/lib/ops";
import { Badge, Hidden, PageHeader, Panel, Stat } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { sendReportNow } from "../../actions";

/** Horizontal bars: one value per row, longest = 100%. */
function Bars({ rows, cur, locale, color = "bg-graphite", count = false, empty }: { rows: { label: string; v: number }[]; cur: string; locale: string; color?: string; count?: boolean; empty: string }) {
  if (!rows.length) return <p className="text-muted">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.v), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span>{r.label}</span>
            <bdi dir="ltr" className="num font-medium">{count ? r.v : money(r.v, cur, locale)}</bdi>
          </div>
          <div className="h-2.5 rounded-full bg-[#eeeeea]">
            <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${Math.max(2, (r.v / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function ReportsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ month?: string; sent?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = getDict(locale);
  const a = t.admin;
  const L = a.reports;
  const base = `/${locale}/admin`;
  const cur = getSettings().currency || "IQD";
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : monthOf(todayISO());
  const r = monthReport(month);

  return (
    <>
      <PageHeader title={L.title}>
        <Link href={`${base}/reports?month=${shiftMonth(month, -1)}`} className="btn btn-ghost bg-white" aria-label="‹"><ChevronLeft size={18} className="rtl:-scale-x-100" /></Link>
        <span className="min-w-36 text-center font-semibold">{monthLabel(month, locale)}</span>
        <Link href={`${base}/reports?month=${shiftMonth(month, 1)}`} className="btn btn-ghost bg-white" aria-label="›"><ChevronRight size={18} className="rtl:-scale-x-100" /></Link>
        <form action={sendReportNow}>
          <Hidden values={{ locale, month }} />
          <SubmitButton className="btn btn-primary"><Send size={16} className="rtl:-scale-x-100" /> {L.send}</SubmitButton>
        </form>
      </PageHeader>

      {sp.sent && <p role="status" className="mb-4"><Badge tone={sp.sent === "1" ? "green" : "red"}>{sp.sent === "1" ? L.sent : L.sendFail}</Badge></p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label={L.income} value={money(r.income, cur, locale)} />
        <Stat label={L.expenses} value={money(r.expenses, cur, locale)} />
        <Stat label={L.profit} value={money(r.profit, cur, locale)} tone={r.profit < 0 ? "bad" : "ok"} />
        <Stat label={L.outstanding} value={money(r.outstanding, cur, locale)} tone={r.outstanding > 0 ? "bad" : undefined} />
        <Stat label={L.newOrders} value={String(r.newOrders)} />
        <Stat label={L.newClients} value={String(r.newClients)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title={L.byProduct}>
          <Bars rows={r.byProduct.map((p) => ({ label: t.products[p.k as keyof typeof t.products] ?? p.k, v: p.v }))} cur={cur} locale={locale} color="bg-brass" empty={L.none} />
        </Panel>
        <Panel title={L.bySource}>
          <Bars rows={r.bySource.map((s) => ({ label: a.clients.sources[s.k as keyof typeof a.clients.sources] ?? s.k, v: s.v }))} cur={cur} locale={locale} count empty={L.none} />
        </Panel>
        <Panel title={L.byExpense}>
          <Bars rows={r.byExpense.map((e) => ({ label: a.expenses.categories[e.k as keyof typeof a.expenses.categories] ?? e.k, v: e.v }))} cur={cur} locale={locale} color="bg-[#b4413a]" empty={L.none} />
        </Panel>
      </div>
    </>
  );
}
