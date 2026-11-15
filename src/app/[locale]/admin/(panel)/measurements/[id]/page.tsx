import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Printer } from "lucide-react";
import { db, orderNo } from "@/lib/db";
import { getDict, PRODUCT_TYPES } from "@/lib/i18n";
import { Field, Hidden, Panel } from "@/components/admin/ui";
import { ConfirmButton, SubmitButton } from "@/components/admin/client";
import { MeasurementEditor, type MRow } from "@/components/admin/Editors";
import { createOrder, deleteMeasurement, saveMeasurement, setMeasurementClosed } from "../../../actions";
import { followupDays, waitingInfo } from "@/lib/followup";
import { AlarmClock } from "lucide-react";
import { MeasureMode } from "@/components/admin/MeasureMode";
import { PhoneLink } from "@/components/admin/PhoneLink";

export default async function MeasurementPage({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ measure?: string }> }) {
  const { locale, id } = await params;
  const { measure } = await searchParams;
  const t = getDict(locale);
  const a = t.admin;
  const base = `/${locale}/admin`;
  const m = db().prepare("SELECT m.*, c.name cname FROM measurements m JOIN clients c ON c.id = m.client_id WHERE m.id = ?").get(Number(id)) as
    | { id: number; client_id: number; cname: string; title: string | null; address: string | null; taken_by: string | null; date: string | null; notes: string | null; closed: number }
    | undefined;
  if (!m) notFound();
  const wait = waitingInfo(m.id);
  const { red } = followupDays();
  const fu = a.followup;
  const items = db().prepare("SELECT * FROM measurement_items WHERE measurement_id = ? ORDER BY sort, id").all(m.id) as Record<string, string | number | null>[];
  const orders = db().prepare("SELECT id FROM orders WHERE measurement_id = ?").all(m.id) as { id: number }[];
  const initial: MRow[] = items.map((i) => ({
    product_type: String(i.product_type ?? "other"), room: String(i.room ?? ""), width: i.width == null ? "" : String(i.width), height: i.height == null ? "" : String(i.height),
    depth: i.depth == null ? "" : String(i.depth), qty: String(i.qty ?? 1), material: String(i.material ?? ""), color: String(i.color ?? ""), notes: String(i.notes ?? ""),
    photo: i.photo ? String(i.photo) : undefined,
  }));

  return (
    <>
      <Link href={`${base}/measurements`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-graphite">
        <ChevronLeft size={16} className="rtl:-scale-x-100" /> {a.measurements.title}
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-[28px]">{m.title || `${a.measurements.sheet} #${m.id}`}</h1>
          <Link href={`${base}/clients/${m.client_id}`} className="text-muted hover:text-brass">{m.cname}</Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <MeasureMode
            measurementId={m.id}
            clientName={m.cname}
            initialCount={items.length}
            products={PRODUCT_TYPES.map((k) => [k, t.products[k]])}
            L={a.measure}
            startOpen={measure === "1"}
          />
          <Link href={`${base}/print/measurement/${m.id}`} target="_blank" className="btn btn-ghost bg-white"><Printer size={16} /> {a.common.print}</Link>
          {orders.map((o) => (
            <Link key={o.id} href={`${base}/orders/${o.id}`} className="btn btn-ghost num bg-white">{orderNo(o.id)}</Link>
          ))}
          <form action={createOrder}>
            <Hidden values={{ locale, measurement_id: m.id, client_id: m.client_id }} />
            <SubmitButton>{a.measurements.toOrder}</SubmitButton>
          </form>
        </div>
      </div>

      {wait && (
        <section className={`mb-4 flex flex-wrap items-center gap-4 rounded-xl border p-4 ${wait.days >= red ? "border-[#e6c5c2] bg-[#fbeceb]" : "border-[#ecdcbc] bg-[#fbf4e6]"}`}>
          <AlarmClock className={`shrink-0 ${wait.days >= red ? "text-bad" : "text-warn"}`} />
          <div className="min-w-0 flex-1">
            <p className={`font-semibold ${wait.days >= red ? "text-bad" : ""}`}>{fu.banner.replace("{n}", String(wait.days))}</p>
            {wait.days >= red && <p className="text-sm text-muted">{fu.bannerRed}</p>}
          </div>
          <form action={createOrder}>
            <Hidden values={{ locale, measurement_id: m.id, client_id: m.client_id }} />
            <SubmitButton>{a.measurements.toOrder}</SubmitButton>
          </form>
          <form action={setMeasurementClosed}>
            <Hidden values={{ locale, id: m.id, closed: 1 }} />
            <SubmitButton className="btn btn-ghost bg-white">{fu.close}</SubmitButton>
          </form>
        </section>
      )}
      {!!m.closed && (
        <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-4">
          <p className="text-muted">{fu.closed}</p>
          <form action={setMeasurementClosed}>
            <Hidden values={{ locale, id: m.id, closed: 0 }} />
            <SubmitButton className="btn btn-ghost btn-sm">{fu.reopen}</SubmitButton>
          </form>
        </section>
      )}

      <PhoneLink path={`/${locale}/admin/measurements/${m.id}?measure=1`} L={a.measure.phone} />

      <form action={saveMeasurement}>
        <Hidden values={{ locale, id: m.id }} />
        <Panel className="mb-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={a.common.title}><input name="title" defaultValue={m.title ?? ""} className="input" /></Field>
            <Field label={a.common.date}><input name="date" type="date" defaultValue={m.date ?? ""} className="input" /></Field>
            <Field label={a.measurements.takenBy}><input name="taken_by" defaultValue={m.taken_by ?? ""} className="input" /></Field>
            <Field label={a.common.address}><input name="address" defaultValue={m.address ?? ""} className="input" /></Field>
            <Field label={a.common.notes} className="sm:col-span-2 lg:col-span-4"><textarea name="notes" defaultValue={m.notes ?? ""} rows={2} className="input" /></Field>
          </div>
        </Panel>
        <Panel title={a.measurements.items}>
          <MeasurementEditor
            initial={initial}
            products={PRODUCT_TYPES.map((k) => [k, t.products[k]])}
            L={{ type: a.common.type, room: a.measurements.room, width: a.measurements.width, height: a.measurements.height, depth: a.measurements.depth, qty: a.measurements.qty, material: a.measurements.material, color: a.measurements.color, notes: a.common.notes, add: a.common.addRow, remove: a.common.removeRow, copy: "Copy" }}
          />
        </Panel>
        <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-line bg-[#f3f3f1]/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-xl md:border">
          <SubmitButton>{a.common.save}</SubmitButton>
        </div>
      </form>
      <form action={deleteMeasurement} className="mt-6 text-end">
        <Hidden values={{ locale, id: m.id }} />
        <ConfirmButton message={a.common.confirmDelete}>{a.common.delete}</ConfirmButton>
      </form>
    </>
  );
}
