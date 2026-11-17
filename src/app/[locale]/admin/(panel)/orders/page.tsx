import Link from "next/link";
import { allOrderTotals, db, getSettings, orderNo } from "@/lib/db";
import { getDict, ORDER_STATUSES } from "@/lib/i18n";
import { dateFmt, todayISO } from "@/lib/format";
import { Empty, Field, Hidden, Money, PageHeader, Panel, Select, Tabs } from "@/components/admin/ui";
import { AutoSelect, SubmitButton } from "@/components/admin/client";
import { createOrder, setOrderStatus } from "../../actions";

export default async function OrdersPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ status?: string; new?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const a = getDict(locale).admin;
  const base = `/${locale}/admin`;
  const cur = (await getSettings()).currency;
  const status = sp.status && (ORDER_STATUSES as readonly string[]).includes(sp.status) ? sp.status : "open";

  const all = await db().prepare("SELECT o.*, c.name cname FROM orders o JOIN clients c ON c.id = o.client_id ORDER BY o.id DESC")
    .all() as { id: number; client_id: number; cname: string; title: string | null; status: string; due_date: string | null; created_at: string }[];
  const rows = status === "open" ? all.filter((o) => !["completed", "cancelled"].includes(o.status)) : all.filter((o) => o.status === status);
  const totals = (await allOrderTotals());
  const clients = await db().prepare("SELECT id, name FROM clients ORDER BY name").all() as { id: number; name: string }[];
  const today = todayISO();

  const tabs = [
    { key: "open", href: `${base}/orders`, label: a.common.all, count: all.filter((o) => !["completed", "cancelled"].includes(o.status)).length },
    ...ORDER_STATUSES.map((s) => ({ key: s, href: `${base}/orders?status=${s}`, label: a.orders.statuses[s], count: all.filter((o) => o.status === s).length })),
  ];

  return (
    <>
      <PageHeader title={a.orders.title} />
      <details open={sp.new === "1"} className="group mb-4 rounded-xl border border-line bg-white">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 font-semibold [&::-webkit-details-marker]:hidden">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-graphite text-white transition-transform group-open:rotate-45">+</span>
          {a.orders.new}
        </summary>
        <form action={createOrder} className="flex flex-wrap items-end gap-3 border-t border-line p-5">
          <Hidden values={{ locale }} />
          <Field label={a.common.client} className="min-w-56 flex-1"><Select name="client_id" required placeholder={a.common.selectClient} options={clients.map((c) => [c.id, c.name])} /></Field>
          <Field label={`${a.common.title} (${a.common.optional})`} className="min-w-56 flex-1"><input name="title" className="input" /></Field>
          <SubmitButton>{a.orders.new}</SubmitButton>
        </form>
      </details>

      <Tabs items={tabs} active={status} />

      <Panel pad={false}>
        {rows.length === 0 ? <Empty text={a.orders.empty} /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr><th>{a.orders.number}</th><th>{a.common.client}</th><th>{a.common.status}</th><th>{a.orders.dueDate}</th><th className="text-end">{a.common.total}</th><th className="text-end">{a.orders.balance}</th></tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const tt = totals.get(o.id)!;
                  const late = o.due_date && o.due_date < today && !["installed", "completed", "cancelled"].includes(o.status);
                  return (
                    <tr key={o.id}>
                      <td>
                        <Link href={`${base}/orders/${o.id}`} className="num font-medium hover:text-brass">{orderNo(o.id)}</Link>
                        {o.title && <div className="max-w-[14rem] truncate text-sm text-muted">{o.title}</div>}
                      </td>
                      <td><Link href={`${base}/clients/${o.client_id}`} className="hover:text-brass">{o.cname}</Link></td>
                      <td>
                        <form action={setOrderStatus} className="w-40">
                          <Hidden values={{ locale, id: o.id, back: `${base}/orders${status !== "open" ? `?status=${status}` : ""}` }} />
                          <AutoSelect name="status" defaultValue={o.status} options={ORDER_STATUSES.map((s) => [s, a.orders.statuses[s]])} />
                        </form>
                      </td>
                      <td className={`whitespace-nowrap ${late ? "font-medium text-bad" : "text-muted"}`}>{dateFmt(o.due_date, locale)}</td>
                      <td className="text-end"><Money v={tt.total} cur={cur} locale={locale} /></td>
                      <td className="text-end">{tt.balance > 0.009 && o.status !== "quote" && o.status !== "cancelled" ? <Money v={tt.balance} cur={cur} locale={locale} className="text-bad" /> : <span className="text-muted">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
