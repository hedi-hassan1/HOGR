import Link from "next/link";
import { Check, MapPin, Phone, ScanLine } from "lucide-react";
import { db } from "@/lib/db";
import { BOOKING_STATUSES, BOOKING_TYPES, getDict } from "@/lib/i18n";
import { dateFmt, todayISO } from "@/lib/format";
import { Badge, Empty, Field, Hidden, PageHeader, Panel, Select, STATUS_TONE, Tabs } from "@/components/admin/ui";
import { ConfirmButton, SubmitButton } from "@/components/admin/client";
import { deleteBooking, saveBooking, setBookingStatus, startMeasuring } from "../../actions";
import { getWorkers } from "@/lib/ops";

type B = { worker_id: number | null; duration_min: number | null; wname?: string | null; id: number; client_id: number | null; name: string | null; phone: string | null; type: string; date: string; time: string | null; address: string | null; status: string; assigned_to: string | null; notes: string | null; cname: string | null; cphone: string | null; caddress: string | null };

export default async function BookingsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string; edit?: string; new?: string; client?: string; date?: string; worker?: string; back?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const a = getDict(locale).admin;
  const base = `/${locale}/admin`;
  const today = todayISO();
  const tab = sp.tab === "past" ? "past" : "upcoming";

  const sel = "SELECT b.*, c.name cname, c.phone cphone, c.address caddress, w.name wname FROM bookings b LEFT JOIN clients c ON c.id = b.client_id LEFT JOIN workers w ON w.id = b.worker_id";
  const workers = getWorkers(true);
  const backTo = sp.back && sp.back.startsWith(`/${locale}/admin/`) ? sp.back : undefined;
  const rows = (
    tab === "upcoming"
      ? db().prepare(`${sel} WHERE b.status = 'scheduled' ORDER BY b.date, b.time`).all()
      : db().prepare(`${sel} WHERE b.status != 'scheduled' ORDER BY b.date DESC, b.time DESC LIMIT 200`).all()
  ) as B[];
  const counts = db().prepare("SELECT SUM(status='scheduled') up, SUM(status!='scheduled') past FROM bookings").get() as { up: number; past: number };

  const editing = sp.edit ? (db().prepare(`${sel} WHERE b.id = ?`).get(Number(sp.edit)) as B | undefined) : undefined;
  const clients = db().prepare("SELECT id, name FROM clients ORDER BY name").all() as { id: number; name: string }[];
  const showForm = !!editing || sp.new === "1";

  // Group by date
  const groups = new Map<string, B[]>();
  for (const r of rows) groups.set(r.date, [...(groups.get(r.date) || []), r]);

  return (
    <>
      <PageHeader title={a.bookings.title}>
        {!showForm && <Link href={`${base}/bookings?new=1`} className="btn btn-primary">+ {a.bookings.new}</Link>}
      </PageHeader>

      {showForm && (
        <Panel title={editing ? a.common.edit : a.bookings.new} className="mb-4" action={<Link href={`${base}/bookings`} className="text-sm text-muted">{a.common.cancel}</Link>}>
          <form action={saveBooking} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Hidden values={{ locale, id: editing?.id, back: backTo }} />
            <Field label={a.common.client} className="sm:col-span-2">
              <Select name="client_id" defaultValue={editing?.client_id ?? sp.client} placeholder="—" options={clients.map((c) => [c.id, c.name])} />
            </Field>
            <Field label={a.bookings.contact}><input name="name" placeholder={a.bookings.contactPh} defaultValue={editing?.name ?? ""} className="input" /></Field>
            <Field label={a.common.phone}><input name="phone" type="tel" dir="ltr" defaultValue={editing?.phone ?? ""} className="input rtl:text-right" /></Field>
            <Field label={a.common.type}><Select name="type" defaultValue={editing?.type ?? "measurement"} options={BOOKING_TYPES.map((k) => [k, a.bookings.types[k]])} /></Field>
            <Field label={a.common.date}><input name="date" type="date" required defaultValue={editing?.date ?? sp.date ?? today} className="input" /></Field>
            <Field label={a.common.time}><input name="time" type="time" defaultValue={editing?.time ?? ""} className="input" /></Field>
            <Field label={a.common.status}><Select name="status" defaultValue={editing?.status ?? "scheduled"} options={BOOKING_STATUSES.map((k) => [k, a.bookings.statuses[k]])} /></Field>
            <Field label={a.common.address} className="sm:col-span-2"><input name="address" defaultValue={editing?.address ?? editing?.caddress ?? ""} className="input" /></Field>
            <Field label={a.bookings.worker}>
              <Select name="worker_id" defaultValue={editing?.worker_id ?? sp.worker} placeholder="—" options={workers.map((w) => [w.id, w.name])} />
            </Field>
            <Field label={a.bookings.duration}>
              <input name="duration" type="number" min={0.5} step={0.5} dir="ltr" defaultValue={editing?.duration_min ? editing.duration_min / 60 : ""} placeholder={"1"} className="input num" />
            </Field>
            <Field label={a.common.notes}><input name="notes" defaultValue={editing?.notes ?? ""} className="input" /></Field>
            <div className="flex items-center justify-between gap-3 sm:col-span-2 lg:col-span-4">
              <SubmitButton>{a.common.save}</SubmitButton>
            </div>
          </form>
          {editing && (
            <form action={deleteBooking} className="mt-3 text-end">
              <Hidden values={{ locale, id: editing.id }} />
              <ConfirmButton message={a.common.confirmDelete}>{a.common.delete}</ConfirmButton>
            </form>
          )}
        </Panel>
      )}

      <Tabs
        active={tab}
        items={[
          { key: "upcoming", href: `${base}/bookings`, label: a.bookings.upcoming, count: counts.up || 0 },
          { key: "past", href: `${base}/bookings?tab=past`, label: a.bookings.past, count: counts.past || 0 },
        ]}
      />

      {rows.length === 0 ? (
        <Panel><Empty text={a.bookings.empty} /></Panel>
      ) : (
        <div className="space-y-5">
          {[...groups.entries()].map(([date, list]) => (
            <section key={date}>
              <h2 className={`mb-2 text-sm font-semibold ${tab === "upcoming" && date < today ? "text-bad" : date === today ? "text-brass" : "text-muted"}`}>
                {date === today ? `${a.common.today} · ` : ""}{dateFmt(date, locale)}
                {tab === "upcoming" && date < today && ` · ${a.bookings.overdue}`}
              </h2>
              <div className="divide-y divide-[#eceae6] overflow-hidden rounded-xl border border-line bg-white">
                {list.map((b) => {
                  const phone = b.cphone || b.phone;
                  return (
                    <div key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                      <span className="num w-14 shrink-0 font-semibold">{b.time || "—"}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {b.client_id ? <Link href={`${base}/clients/${b.client_id}`} className="font-medium hover:text-brass">{b.cname}</Link> : <span className="font-medium">{b.name}</span>}
                          <Badge tone="gray">{a.bookings.types[b.type as keyof typeof a.bookings.types]}</Badge>
                          {tab === "past" && <Badge tone={STATUS_TONE[b.status]}>{a.bookings.statuses[b.status as keyof typeof a.bookings.statuses]}</Badge>}
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-4 text-sm text-muted">
                          {phone && <a href={`tel:${phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 hover:text-graphite" dir="ltr"><Phone size={13} />{phone}</a>}
                          {(b.address || b.caddress) && <span className="inline-flex items-center gap-1"><MapPin size={13} />{b.address || b.caddress}</span>}
                          {(b.wname || b.assigned_to) && <span>· {b.wname || b.assigned_to}</span>}
                        </div>
                        {b.notes && <p className="mt-1 text-sm">{b.notes}</p>}
                      </div>
                      <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
                        {b.status === "scheduled" && b.type === "measurement" && b.client_id && (
                          <form action={startMeasuring}>
                            <Hidden values={{ locale, booking_id: b.id }} />
                            <SubmitButton className="btn btn-sm bg-brass text-white hover:bg-[#8d6b36]"><ScanLine size={15} /> {a.measure.startFromBooking}</SubmitButton>
                          </form>
                        )}
                        {b.status === "scheduled" && (
                          <form action={setBookingStatus}>
                            <Hidden values={{ locale, id: b.id, status: "done", back: `${base}/bookings` }} />
                            <SubmitButton className="btn btn-ghost btn-sm"><Check size={15} /> {a.bookings.markDone}</SubmitButton>
                          </form>
                        )}
                        <Link href={`${base}/bookings?edit=${b.id}${tab === "past" ? "&tab=past" : ""}`} className="btn btn-ghost btn-sm">{a.common.edit}</Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
