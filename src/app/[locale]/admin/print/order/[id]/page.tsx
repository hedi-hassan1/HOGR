import { notFound } from "next/navigation";
import { db, getSettings, lineTotal, orderNo, orderTotals, type OrderItem } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { dateFmt, money, num, todayISO } from "@/lib/format";
import { PrintSheet } from "@/components/admin/PrintSheet";

export default async function PrintOrder({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ doc?: string }> }) {
  const { locale, id } = await params;
  const { doc } = await searchParams;
  const t = getDict(locale);
  const a = t.admin;
  const s = (await getSettings(locale));
  const cur = s.currency;
  const o = await db().prepare("SELECT o.*, c.name cname, c.phone cphone, c.address caddress FROM orders o JOIN clients c ON c.id = o.client_id WHERE o.id = ?").get(Number(id)) as
    | { id: number; cname: string; cphone: string | null; caddress: string | null; title: string | null; discount: number; due_date: string | null; notes: string | null; created_at: string }
    | undefined;
  if (!o) notFound();
  const items = await db().prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY sort, id").all(o.id) as OrderItem[];
  const pays = await db().prepare("SELECT * FROM payments WHERE order_id = ? ORDER BY date, id").all(o.id) as { id: number; amount: number; method: string; date: string }[];
  const tt = (await orderTotals(o.id));
  const isInvoice = doc === "invoice";
  const m = (v: number) => money(v, cur, locale);

  return (
    <PrintSheet
      s={s}
      title={isInvoice ? a.orders.invoice : a.orders.quote}
      printLabel={a.common.print}
      meta={[
        [a.orders.number, orderNo(o.id)],
        [a.common.date, dateFmt(todayISO(), locale)],
        ...(o.due_date ? [[a.orders.dueDate, dateFmt(o.due_date, locale)] as [string, string]] : []),
      ]}
    >
      <section className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <p className="text-[11px] text-muted">{a.common.client}</p>
          <p className="text-base font-semibold">{o.cname}</p>
          {o.cphone && <p dir="ltr" className="num rtl:text-right">{o.cphone}</p>}
          {o.caddress && <p>{o.caddress}</p>}
        </div>
        {o.title && (
          <div>
            <p className="text-[11px] text-muted">{a.common.title}</p>
            <p className="text-base font-semibold">{o.title}</p>
          </div>
        )}
      </section>

      <table className="mt-6 w-full border-collapse">
        <thead>
          <tr className="border-b border-graphite text-[11px] text-muted">
            <th className="py-2 text-start font-medium">#</th>
            <th className="py-2 text-start font-medium">{a.common.description}</th>
            <th className="py-2 text-center font-medium">{a.measurements.width} × {a.measurements.height}</th>
            <th className="py-2 text-center font-medium">{a.measurements.qty}</th>
            <th className="py-2 text-end font-medium">{a.orders.unitPrice}</th>
            <th className="py-2 text-end font-medium">{a.orders.lineTotal}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, n) => (
            <tr key={n} className="border-b border-[#e3e3df] align-top">
              <td className="num py-2.5 text-muted">{n + 1}</td>
              <td className="py-2.5">
                <span className="font-medium">{t.products[i.product_type as keyof typeof t.products]}</span>
                {i.description && <span className="block text-muted">{i.description}</span>}
              </td>
              <td className="num py-2.5 text-center" dir="ltr">{i.width || i.height ? `${num(i.width) || "–"} × ${num(i.height) || "–"}` : ""}</td>
              <td className="num py-2.5 text-center">{num(i.qty)}</td>
              <td className="num py-2.5 text-end"><bdi>{m(i.unit_price)}</bdi><span className="block text-[11px] text-muted">/ {a.orders.units[i.unit]}</span></td>
              <td className="num py-2.5 text-end font-medium"><bdi>{m(lineTotal(i))}</bdi></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <dl className="w-72 space-y-1.5">
          <div className="flex justify-between"><dt className="text-muted">{a.orders.subtotal}</dt><dd className="num"><bdi>{m(tt.subtotal)}</bdi></dd></div>
          {o.discount > 0 && <div className="flex justify-between"><dt className="text-muted">{a.orders.discount}</dt><dd className="num"><bdi>− {m(o.discount)}</bdi></dd></div>}
          <div className="flex justify-between border-t-2 border-graphite pt-2 text-base font-bold"><dt>{a.common.total}</dt><dd className="num"><bdi>{m(tt.total)}</bdi></dd></div>
          {isInvoice && (
            <>
              <div className="flex justify-between"><dt className="text-muted">{a.orders.paid}</dt><dd className="num"><bdi>{m(tt.paid)}</bdi></dd></div>
              <div className="flex justify-between font-semibold"><dt>{a.orders.balance}</dt><dd className="num"><bdi>{m(tt.balance)}</bdi></dd></div>
            </>
          )}
        </dl>
      </div>

      {isInvoice && pays.length > 0 && (
        <section className="mt-6">
          <p className="mb-1 text-[11px] text-muted">{a.orders.payments}</p>
          <table className="w-full">
            <tbody>
              {pays.map((p) => (
                <tr key={p.id} className="border-b border-[#eee]">
                  <td className="py-1.5">{dateFmt(p.date, locale)}</td>
                  <td className="py-1.5">{a.payments.methods[p.method as keyof typeof a.payments.methods]}</td>
                  <td className="num py-1.5 text-end"><bdi>{m(p.amount)}</bdi></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {o.notes && <p className="mt-6 whitespace-pre-line rounded bg-[#f5f5f3] p-3">{o.notes}</p>}

      <footer className="mt-10 grid grid-cols-2 gap-10 text-[12px] text-muted">
        <div>
          {!isInvoice && <p>{a.orders.validity}</p>}
          <p className="mt-1">{a.orders.thanks}</p>
        </div>
        <div className="border-t border-graphite pt-2 text-center">{a.measurements.signature}</div>
      </footer>
    </PrintSheet>
  );
}
