import Link from "next/link";
import { Trash2 } from "lucide-react";
import { db, getSettings, orderNo } from "@/lib/db";
import { getDict, PAY_METHODS } from "@/lib/i18n";
import { dateFmt, todayISO } from "@/lib/format";
import { Empty, Hidden, Money, PageHeader, Panel, Select, Tabs } from "@/components/admin/ui";
import { DebtsList } from "@/components/admin/DebtsList";
import { getDebts } from "@/lib/ops";
import { ConfirmButton } from "@/components/admin/client";
import { deletePayment } from "../../actions";
import { PaymentForm } from "./PaymentForm";

export default async function PaymentsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ from?: string; to?: string; method?: string; new?: string; tab?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const a = getDict(locale).admin;
  const base = `/${locale}/admin`;
  const cur = (await getSettings()).currency;
  const from = sp.from || todayISO().slice(0, 8) + "01";
  const to = sp.to || todayISO();

  const args: unknown[] = [from, to];
  let where = "p.date >= ? AND p.date <= ?";
  if (sp.method) { where += " AND p.method = ?"; args.push(sp.method); }
  const rows = await db().prepare(`SELECT p.*, c.name cname, o.title otitle FROM payments p LEFT JOIN clients c ON c.id = p.client_id LEFT JOIN orders o ON o.id = p.order_id WHERE ${where} ORDER BY p.date DESC, p.id DESC`)
    .all(...args) as { id: number; amount: number; method: string; date: string; note: string | null; order_id: number | null; client_id: number | null; cname: string | null }[];
  const total = rows.reduce((s, r) => s + r.amount, 0);

  const orders = await db().prepare("SELECT o.id, o.title, c.name FROM orders o JOIN clients c ON c.id = o.client_id WHERE o.status != 'cancelled' ORDER BY o.id DESC").all() as { id: number; title: string | null; name: string }[];
  const clients = await db().prepare("SELECT id, name FROM clients ORDER BY name").all() as { id: number; name: string }[];

  return (
    <>
      <PageHeader title={a.payments.title} />
      <Tabs
        active={sp.tab === "unpaid" ? "unpaid" : "list"}
        items={[
          { key: "list", href: `${base}/payments`, label: a.payments.title },
          { key: "unpaid", href: `${base}/payments?tab=unpaid`, label: a.debts.tab, count: (await getDebts()).length },
        ]}
      />
      {sp.tab === "unpaid" ? (
        <Panel title={a.debts.title} pad={false}><DebtsList locale={locale} a={a} /></Panel>
      ) : (<>

      <details open={sp.new === "1"} className="group mb-4 rounded-xl border border-line bg-white">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 font-semibold [&::-webkit-details-marker]:hidden">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-graphite text-white transition-transform group-open:rotate-45">+</span>
          {a.payments.new}
        </summary>
        <div className="border-t border-line p-5">
          <PaymentForm
            locale={locale}
            a={a}
            orders={orders.map((o) => [o.id, `${orderNo(o.id)} · ${o.name}${o.title ? " · " + o.title : ""}`])}
            clients={clients.map((c) => [c.id, c.name])}
            back={`${base}/payments`}
          />
        </div>
      </details>

      <form className="mb-4 flex flex-wrap items-end gap-3">
        <label><span className="label">{a.common.from}</span><input type="date" name="from" defaultValue={from} className="input" /></label>
        <label><span className="label">{a.common.to}</span><input type="date" name="to" defaultValue={to} className="input" /></label>
        <label className="w-44"><span className="label">{a.common.method}</span><Select name="method" defaultValue={sp.method} placeholder={a.common.all} options={PAY_METHODS.map((m) => [m, a.payments.methods[m]])} /></label>
        <button className="btn btn-ghost bg-white">{a.common.filter}</button>
        <div className="ms-auto rounded-lg bg-white px-4 py-2 text-end">
          <span className="block text-xs text-muted">{a.payments.totalShown}</span>
          <Money v={total} cur={cur} locale={locale} className="text-lg font-bold text-ok" />
        </div>
      </form>

      <Panel pad={false}>
        {rows.length === 0 ? <Empty text={a.payments.empty} /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>{a.common.date}</th><th>{a.common.client}</th><th>{a.common.order}</th><th>{a.common.method}</th><th>{a.common.notes}</th><th className="text-end">{a.common.amount}</th><th /></tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap">{dateFmt(p.date, locale)}</td>
                    <td>{p.client_id ? <Link href={`${base}/clients/${p.client_id}`} className="hover:text-brass">{p.cname}</Link> : "—"}</td>
                    <td className="num">{p.order_id ? <Link href={`${base}/orders/${p.order_id}`} className="hover:text-brass">{orderNo(p.order_id)}</Link> : "—"}</td>
                    <td>{a.payments.methods[p.method as keyof typeof a.payments.methods]}</td>
                    <td className="max-w-[16rem] truncate text-muted">{p.note}</td>
                    <td className="text-end"><Money v={p.amount} cur={cur} locale={locale} className="font-medium" /></td>
                    <td className="w-10">
                      <form action={deletePayment}>
                        <Hidden values={{ locale, id: p.id, back: `${base}/payments?from=${from}&to=${to}` }} />
                        <ConfirmButton message={a.common.confirmDelete} className="p-1 text-muted hover:text-bad"><Trash2 size={16} /></ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      </>)}
    </>
  );
}
