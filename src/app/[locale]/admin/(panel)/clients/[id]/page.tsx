import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Phone, MessageCircle } from "lucide-react";
import { allOrderTotals, db, getSettings, orderNo } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { dateFmt } from "@/lib/format";
import { Badge, Hidden, Money, Panel, STATUS_TONE } from "@/components/admin/ui";
import { ConfirmButton, SubmitButton } from "@/components/admin/client";
import { createMeasurement, createOrder, deleteClient } from "../../../actions";
import { ClientForm, type ClientRow } from "../ClientForm";
import { PaymentForm } from "../../payments/PaymentForm";

export default async function ClientPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const t = getDict(locale);
  const a = t.admin;
  const base = `/${locale}/admin`;
  const cur = (await getSettings()).currency;
  const d = db();
  const c = await d.prepare("SELECT * FROM clients WHERE id = ?").get(Number(id)) as ClientRow | undefined;
  if (!c) notFound();

  const orders = await d.prepare("SELECT * FROM orders WHERE client_id = ? ORDER BY id DESC").all(c.id) as { id: number; title: string | null; status: string; created_at: string }[];
  const totals = (await allOrderTotals());
  const ms = await d.prepare("SELECT m.*, (SELECT COUNT(*) FROM measurement_items i WHERE i.measurement_id = m.id) n FROM measurements m WHERE client_id = ? ORDER BY id DESC").all(c.id) as { id: number; title: string | null; date: string | null; n: number }[];
  const pays = await d.prepare("SELECT * FROM payments WHERE client_id = ? ORDER BY date DESC, id DESC").all(c.id) as { id: number; amount: number; method: string; date: string; order_id: number | null }[];
  const books = await d.prepare("SELECT * FROM bookings WHERE client_id = ? ORDER BY date DESC LIMIT 10").all(c.id) as { id: number; date: string; time: string | null; type: string; status: string }[];

  const billed = orders.filter((o) => o.status !== "quote" && o.status !== "cancelled").reduce((s, o) => s + (totals.get(o.id)?.total || 0), 0);
  const paid = pays.reduce((s, p) => s + p.amount, 0);
  const here = `${base}/clients/${c.id}`;
  const wa = c.phone ? c.phone.replace(/\D/g, "").replace(/^0/, "964") : "";

  return (
    <>
      <Link href={`${base}/clients`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-graphite">
        <ChevronLeft size={16} className="rtl:-scale-x-100" /> {a.clients.title}
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-[28px]">{c.name}</h1>
          <p className="num mt-1 text-muted" dir="ltr" style={{ textAlign: "start" }}>{[c.phone, c.phone2].filter(Boolean).join("  ·  ")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {c.phone && <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="btn btn-ghost bg-white"><Phone size={16} /> {a.common.phone}</a>}
          {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="btn btn-ghost bg-white"><MessageCircle size={16} /> WhatsApp</a>}
          <form action={createMeasurement}>
            <Hidden values={{ locale, client_id: c.id }} />
            <SubmitButton className="btn btn-ghost bg-white">{a.measurements.new}</SubmitButton>
          </form>
          <form action={createOrder}>
            <Hidden values={{ locale, client_id: c.id }} />
            <SubmitButton>{a.orders.new}</SubmitButton>
          </form>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-line bg-white p-4"><p className="text-sm text-muted">{a.clients.totalBilled}</p><Money v={billed} cur={cur} locale={locale} className="mt-1 block text-xl font-bold" /></div>
        <div className="rounded-xl border border-line bg-white p-4"><p className="text-sm text-muted">{a.clients.totalPaid}</p><Money v={paid} cur={cur} locale={locale} className="mt-1 block text-xl font-bold text-ok" /></div>
        <div className="rounded-xl border border-line bg-white p-4"><p className="text-sm text-muted">{a.clients.balance}</p><Money v={billed - paid} cur={cur} locale={locale} className={`mt-1 block text-xl font-bold ${billed - paid > 0 ? "text-bad" : ""}`} /></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Panel title={a.orders.title} pad={false}>
            {orders.length === 0 ? <p className="p-5 text-muted">—</p> : (
              <table className="table">
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td><Link href={`${base}/orders/${o.id}`} className="num font-medium hover:text-brass">{orderNo(o.id)}</Link><div className="text-sm text-muted">{o.title}</div></td>
                      <td><Badge tone={STATUS_TONE[o.status]}>{a.orders.statuses[o.status as keyof typeof a.orders.statuses]}</Badge></td>
                      <td className="text-end"><Money v={totals.get(o.id)?.total || 0} cur={cur} locale={locale} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title={a.measurements.title} pad={false}>
            {ms.length === 0 ? <p className="p-5 text-muted">—</p> : (
              <table className="table">
                <tbody>
                  {ms.map((m) => (
                    <tr key={m.id}>
                      <td><Link href={`${base}/measurements/${m.id}`} className="font-medium hover:text-brass">{m.title || `${a.measurements.sheet} #${m.id}`}</Link></td>
                      <td className="text-muted">{dateFmt(m.date, locale)}</td>
                      <td className="num text-end text-muted">{m.n} {a.measurements.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title={a.payments.title} pad={false}>
            {pays.length === 0 ? <p className="p-5 text-muted">{a.orders.noPayments}</p> : (
              <table className="table">
                <tbody>
                  {pays.map((p) => (
                    <tr key={p.id}>
                      <td>{dateFmt(p.date, locale)}</td>
                      <td className="text-muted">{a.payments.methods[p.method as keyof typeof a.payments.methods]}</td>
                      <td className="num text-muted">{p.order_id ? orderNo(p.order_id) : ""}</td>
                      <td className="text-end"><Money v={p.amount} cur={cur} locale={locale} className="font-medium" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="border-t border-line p-5">
              <PaymentForm locale={locale} a={a} clientId={c.id} orders={orders.filter((o) => o.status !== "cancelled").map((o) => [o.id, `${orderNo(o.id)} ${o.title || ""}`])} back={here} />
            </div>
          </Panel>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Panel title={a.clients.info}>
            <ClientForm locale={locale} a={a} c={c} back={here} />
          </Panel>
          <Panel title={a.bookings.title} pad={false} action={<Link href={`${base}/bookings?new=1&client=${c.id}`} className="text-sm text-muted hover:text-graphite">+ {a.common.add}</Link>}>
            {books.length === 0 ? <p className="p-5 text-muted">—</p> : (
              <ul className="divide-y divide-[#eceae6]">
                {books.map((b) => (
                  <li key={b.id}>
                    <Link href={`${base}/bookings?edit=${b.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-[#fbfbfa]">
                      <span>{dateFmt(b.date, locale)} <span className="num text-muted">{b.time}</span></span>
                      <span className="flex gap-1.5">
                        <Badge tone="gray">{a.bookings.types[b.type as keyof typeof a.bookings.types]}</Badge>
                        <Badge tone={STATUS_TONE[b.status]}>{a.bookings.statuses[b.status as keyof typeof a.bookings.statuses]}</Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <form action={deleteClient} className="text-end">
            <Hidden values={{ locale, id: c.id }} />
            <ConfirmButton message={a.common.confirmDelete}>{a.common.delete}</ConfirmButton>
          </form>
        </div>
      </div>
    </>
  );
}
