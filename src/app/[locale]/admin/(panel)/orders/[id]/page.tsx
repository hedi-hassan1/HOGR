import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, Layers, MessageCircle, Printer, Tags, Trash2 } from "lucide-react";
import { db, getSettings, orderNo, orderTotals } from "@/lib/db";
import { getDict, ORDER_STATUSES, PRODUCT_TYPES, UNITS } from "@/lib/i18n";
import { dateFmt } from "@/lib/format";
import { Badge, Field, Hidden, Money, Panel, Select, STATUS_TONE } from "@/components/admin/ui";
import { ConfirmButton, SubmitButton } from "@/components/admin/client";
import { OrderEditor, type ORow } from "@/components/admin/Editors";
import { applyPrices, deleteOrder, deletePayment, saveOrder, shareOrder } from "../../../actions";
import { getPrices, priceName, publicBase, shareToken } from "@/lib/extras";
import { PaymentForm } from "../../payments/PaymentForm";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ priced?: string }> }) {
  const { locale, id } = await params;
  const { priced } = await searchParams;
  const t = getDict(locale);
  const a = t.admin;
  const base = `/${locale}/admin`;
  const cur = (await getSettings()).currency;
  const o = await db().prepare("SELECT o.*, c.name cname, c.phone cphone FROM orders o JOIN clients c ON c.id = o.client_id WHERE o.id = ?").get(Number(id)) as
    | { id: number; client_id: number; measurement_id: number | null; cname: string; cphone: string | null; title: string | null; status: string; discount: number; due_date: string | null; notes: string | null; created_at: string; accepted_at: string | null }
    | undefined;
  if (!o) notFound();
  const S = a.share;
  const pub = await publicBase();
  const clientLink = `${pub.url}/${locale}/o/${(await shareToken(o.id))}`;
  const prices = (await getPrices()).map((p) => ({ id: p.id, type: p.product_type, label: priceName(p, locale), unit: p.unit, price: p.price }));
  const items = await db().prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY sort, id").all(o.id) as Record<string, string | number | null>[];
  const pays = await db().prepare("SELECT * FROM payments WHERE order_id = ? ORDER BY date, id").all(o.id) as { id: number; amount: number; method: string; date: string; note: string | null }[];
  const tt = (await orderTotals(o.id));
  const unpriced = items.filter((i) => !Number(i.unit_price)).length;
  const here = `${base}/orders/${o.id}`;
  const v = (x: unknown) => (x == null ? "" : String(x));
  const initial: ORow[] = items.map((i) => ({ product_type: v(i.product_type) || "other", description: v(i.description), width: v(i.width), height: v(i.height), qty: v(i.qty) || "1", unit: v(i.unit) || "piece", unit_price: v(i.unit_price) }));

  return (
    <>
      <Link href={`${base}/orders`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-graphite">
        <ChevronLeft size={16} className="rtl:-scale-x-100" /> {a.orders.title}
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="num text-2xl font-bold md:text-[28px]">{orderNo(o.id)}</h1>
            <Badge tone={STATUS_TONE[o.status]}>{a.orders.statuses[o.status as keyof typeof a.orders.statuses]}</Badge>
          </div>
          <p className="mt-1 text-muted">
            <Link href={`${base}/clients/${o.client_id}`} className="hover:text-brass">{o.cname}</Link>
            {o.measurement_id && <> · <Link href={`${base}/measurements/${o.measurement_id}`} className="hover:text-brass">{a.orders.fromMeasurement}</Link></>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`${base}/orders/${o.id}/materials`} className="btn btn-ghost bg-white"><Layers size={16} /> {a.materials.open}</Link>
          <Link href={`${base}/print/order/${o.id}?doc=quote`} target="_blank" className="btn btn-ghost bg-white"><Printer size={16} /> {a.orders.printQuote}</Link>
          <Link href={`${base}/print/order/${o.id}?doc=invoice`} target="_blank" className="btn btn-ghost bg-white"><Printer size={16} /> {a.orders.printInvoice}</Link>
        </div>
      </div>

      {/* Client link: quote / tracking / review over WhatsApp */}
      <section className="mb-4 rounded-xl border border-line bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { kind: "quote", label: S.sendQuote, show: o.status === "quote" },
            { kind: "track", label: S.sendTracking, show: o.status !== "quote" && o.status !== "cancelled" },
            { kind: "review", label: S.askReview, show: o.status === "installed" || o.status === "completed" },
          ].filter((b) => b.show).map((b) => (
            <form key={b.kind} action={shareOrder}>
              <Hidden values={{ locale, id: o.id, kind: b.kind }} />
              <SubmitButton className="btn btn-sm bg-[#25D366] text-white hover:bg-[#1fb457]"><MessageCircle size={15} /> {b.label}</SubmitButton>
            </form>
          ))}
          <a href={clientLink} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><ExternalLink size={14} /> {S.open}</a>
          {o.accepted_at && <Badge tone="green">✓ {S.accepted.replace("{date}", dateFmt(o.accepted_at.slice(0, 10), locale))}</Badge>}
        </div>
        {pub.local && <p className="mt-2 text-xs text-warn">{S.localWarning}</p>}
      </section>

      {unpriced > 0 && (
        <form action={applyPrices} className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#ecdcbc] bg-[#fbf4e6] p-4">
          <Hidden values={{ locale, id: o.id }} />
          <Tags size={18} className="text-warn" />
          <span className="flex-1 text-sm">{a.prices.sub}</span>
          <SubmitButton className="btn btn-primary btn-sm">{a.prices.pick}</SubmitButton>
        </form>
      )}
      {priced && <p className="mb-4"><Badge tone="green">{a.prices.applied}</Badge></p>}

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-line bg-white p-4"><p className="text-sm text-muted">{a.common.total}</p><Money v={tt.total} cur={cur} locale={locale} className="mt-1 block text-xl font-bold" /></div>
        <div className="rounded-xl border border-line bg-white p-4"><p className="text-sm text-muted">{a.orders.paid}</p><Money v={tt.paid} cur={cur} locale={locale} className="mt-1 block text-xl font-bold text-ok" /></div>
        <div className="rounded-xl border border-line bg-white p-4"><p className="text-sm text-muted">{a.orders.balance}</p><Money v={tt.balance} cur={cur} locale={locale} className={`mt-1 block text-xl font-bold ${tt.balance > 0.009 ? "text-bad" : ""}`} /></div>
      </div>

      <form action={saveOrder}>
        <Hidden values={{ locale, id: o.id }} />
        <Panel className="mb-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={a.common.title} className="sm:col-span-2"><input name="title" defaultValue={o.title ?? ""} className="input" /></Field>
            <Field label={a.common.status}><Select name="status" defaultValue={o.status} options={ORDER_STATUSES.map((s) => [s, a.orders.statuses[s]])} /></Field>
            <Field label={a.orders.dueDate}><input type="date" name="due_date" defaultValue={o.due_date ?? ""} className="input" /></Field>
            <Field label={a.common.notes} className="sm:col-span-2 lg:col-span-4"><textarea name="notes" defaultValue={o.notes ?? ""} rows={2} className="input" /></Field>
          </div>
        </Panel>
        <Panel title={a.orders.items}>
          <OrderEditor
            initial={initial}
            initialDiscount={o.discount}
            products={PRODUCT_TYPES.map((k) => [k, t.products[k]])}
            units={UNITS.map((u) => [u, a.orders.units[u]])}
            fmt={{ cur, label: cur === "IQD" ? (locale === "en" ? "IQD" : "د.ع") : "$" }}
            prices={prices}
            L={{ type: a.common.type, description: a.common.description, width: a.measurements.width, height: a.measurements.height, qty: a.measurements.qty, unit: a.common.unit, unitPrice: a.orders.unitPrice, add: a.common.addRow, remove: a.common.removeRow, subtotal: a.orders.subtotal, discount: a.orders.discount, total: a.common.total, unitHint: a.orders.unitHint, pick: a.prices.pick }}
          />
        </Panel>
        <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-line bg-[#f3f3f1]/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-xl md:border">
          <SubmitButton>{a.common.save}</SubmitButton>
        </div>
      </form>

      <Panel title={a.orders.payments} className="mt-4" pad={false}>
        {pays.length === 0 ? <p className="p-5 text-muted">{a.orders.noPayments}</p> : (
          <table className="table">
            <tbody>
              {pays.map((p) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap">{dateFmt(p.date, locale)}</td>
                  <td>{a.payments.methods[p.method as keyof typeof a.payments.methods]}</td>
                  <td className="text-muted">{p.note}</td>
                  <td className="text-end"><Money v={p.amount} cur={cur} locale={locale} className="font-medium" /></td>
                  <td className="w-10">
                    <form action={deletePayment}>
                      <Hidden values={{ locale, id: p.id, back: here }} />
                      <ConfirmButton message={a.common.confirmDelete} className="p-1 text-muted hover:text-bad"><Trash2 size={16} /></ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="border-t border-line p-5">
          <PaymentForm locale={locale} a={a} clientId={o.client_id} orderId={o.id} back={here} defaultAmount={tt.balance} />
        </div>
      </Panel>

      <form action={deleteOrder} className="mt-6 text-end">
        <Hidden values={{ locale, id: o.id }} />
        <ConfirmButton message={a.common.confirmDelete}>{a.common.delete}</ConfirmButton>
      </form>
    </>
  );
}
