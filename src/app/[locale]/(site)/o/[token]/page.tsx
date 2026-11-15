import Link from "next/link";
import type { Metadata } from "next";
import { Check, Phone, Star } from "lucide-react";
import { db, getSettings, lineTotal, orderNo, orderTotals, type OrderItem } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { dateFmt, money, num, todayISO } from "@/lib/format";
import { orderByToken } from "@/lib/extras";
import { AcceptButton } from "@/components/site/ClientActions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const STEPS = ["quote", "confirmed", "production", "ready", "installed", "completed"] as const;

/** The client's private page: quotation, Accept button, progress and payments. */
export default async function ClientOrderPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  const t = getDict(locale);
  const L = t.site.client;
  const st = t.admin.orders.statuses;
  const o = orderByToken(token);
  const s = getSettings(locale);
  const cur = s.currency || "IQD";

  if (!o) {
    return <section className="mx-auto max-w-2xl px-4 py-24 text-center text-lg text-muted">{L.invalid}</section>;
  }
  const items = db().prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY sort, id").all(o.id) as OrderItem[];
  const tt = orderTotals(o.id);
  const next = db()
    .prepare("SELECT date, time, type FROM bookings WHERE client_id = ? AND status = 'scheduled' AND date >= ? ORDER BY date, time LIMIT 1")
    .get(o.client_id, todayISO()) as { date: string; time: string | null; type: string } | undefined;
  const reviewed = !!db().prepare("SELECT 1 FROM reviews WHERE order_id = ?").get(o.id);
  const stepIdx = STEPS.indexOf(o.status as (typeof STEPS)[number]);
  const m = (v: number) => money(v, cur, locale);

  return (
    <section className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6">
      <p className="text-muted">{L.hello.replace("{name}", o.cname)}</p>
      <h1 className="display mt-2 text-4xl md:text-5xl">{L.title} <span className="num text-muted" dir="ltr">{orderNo(o.id)}</span></h1>
      {o.title && <p className="mt-2 text-lg">{o.title}</p>}

      {/* Progress */}
      {o.status !== "cancelled" && (
        <ol className="mt-10 grid grid-cols-3 gap-y-6 sm:grid-cols-6">
          {STEPS.map((k, i) => {
            const done = i < stepIdx || (i === stepIdx && k === "completed");
            const current = i === stepIdx && k !== "completed";
            return (
              <li key={k} className="flex flex-col items-center gap-2 text-center">
                <span className={`grid h-9 w-9 place-items-center rounded-full border-2 ${done ? "border-ok bg-ok text-white" : current ? "border-brass bg-brass-soft text-brass" : "border-line text-muted"}`}>
                  {done ? <Check size={18} /> : <span className="text-sm font-semibold">{i + 1}</span>}
                </span>
                <span className={`text-[13px] leading-tight ${current ? "font-semibold" : done ? "" : "text-muted"}`}>{st[k]}</span>
              </li>
            );
          })}
        </ol>
      )}

      {next && (
        <p className="mt-8 rounded-xl border border-brass/40 bg-brass-soft/60 px-5 py-4">
          <span className="text-sm text-muted">{L.next}: </span>
          <b>{t.admin.bookings.types[next.type as keyof typeof t.admin.bookings.types]}</b> · {dateFmt(next.date, locale)} {next.time && <span className="num" dir="ltr">{next.time}</span>}
        </p>
      )}

      {/* Quotation */}
      <div className="mt-10 rounded-xl border border-line bg-white">
        <h2 className="border-b border-line px-5 py-4 text-lg font-semibold">{L.quote}</h2>
        <ul className="divide-y divide-[#eceae6]">
          {items.map((i, n) => (
            <li key={n} className="flex items-start justify-between gap-4 px-5 py-3.5">
              <div>
                <p className="font-medium">{t.products[i.product_type as keyof typeof t.products]}</p>
                <p className="text-sm text-muted">
                  {i.description}
                  {(i.width || i.height) && <span className="num ms-2" dir="ltr">{num(i.width)} × {num(i.height)} cm</span>}
                  {i.qty > 1 && <span className="num ms-2">× {num(i.qty)}</span>}
                </p>
              </div>
              <bdi dir="ltr" className="num whitespace-nowrap font-medium">{m(lineTotal(i))}</bdi>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 border-t border-line px-5 py-4">
          {o.discount > 0 && <div className="flex justify-between text-muted"><dt>{t.admin.orders.discount}</dt><dd className="num"><bdi dir="ltr">− {m(o.discount)}</bdi></dd></div>}
          <div className="flex justify-between text-xl font-bold"><dt>{L.total}</dt><dd className="num"><bdi dir="ltr">{m(tt.total)}</bdi></dd></div>
          {tt.paid > 0 && (
            <>
              <div className="flex justify-between text-ok"><dt>{L.paid}</dt><dd className="num"><bdi dir="ltr">{m(tt.paid)}</bdi></dd></div>
              <div className="flex justify-between font-semibold"><dt>{L.remaining}</dt><dd className="num"><bdi dir="ltr">{m(tt.balance)}</bdi></dd></div>
            </>
          )}
        </dl>
      </div>

      <div className="mt-8">
        {o.status === "quote" ? (
          <>
            <AcceptButton token={token} label={L.accept} done={L.acceptedThanks} />
            <p className="mt-3 text-sm text-muted">{L.acceptNote}</p>
          </>
        ) : o.accepted_at ? (
          <p className="text-ok">✓ {L.accepted.replace("{date}", dateFmt(o.accepted_at.slice(0, 10), locale))}</p>
        ) : null}
        {(o.status === "installed" || o.status === "completed") && !reviewed && (
          <Link href={`/${locale}/r/${token}`} className="btn btn-ghost mt-4 px-6 py-3"><Star size={18} className="text-brass" /> {L.review}</Link>
        )}
      </div>

      <p className="mt-12 flex flex-wrap items-center gap-3 text-muted">
        {L.questions}
        {[s.phone1, s.phone2].filter(Boolean).map((p) => (
          <a key={p} href={`tel:${p.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 font-medium text-graphite hover:text-brass" dir="ltr"><Phone size={15} /> {p}</a>
        ))}
      </p>
    </section>
  );
}
