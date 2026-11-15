import Link from "next/link";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { db, getSettings } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { addDaysISO, dateFmt, num, todayISO } from "@/lib/format";
import { getAttendance, getWorkers, monthLabel, monthOf, monthRange, shiftMonth, wageSummary, type Worker } from "@/lib/ops";
import { Badge, Empty, Field, Hidden, Money, PageHeader, Panel, Select } from "@/components/admin/ui";
import { ConfirmButton, SubmitButton } from "@/components/admin/client";
import { AttendanceGrid } from "@/components/admin/AttendanceGrid";
import { deleteWorker, deleteWorkerPayment, saveWorker, saveWorkerPayment } from "../../actions";

const ROLES = ["installer", "workshop", "measurer", "driver", "other"] as const;

export default async function WorkersPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ m?: string; edit?: string; new?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const a = getDict(locale).admin;
  const L = a.workers;
  const base = `/${locale}/admin`;
  const cur = getSettings().currency;
  const today = todayISO();
  const month = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : monthOf(today);
  const { start, end, days: nDays } = monthRange(month);
  const days = Array.from({ length: nDays }, (_, i) => addDaysISO(start, i));
  const fridays = days.filter((d) => new Date(d + "T00:00:00Z").getUTCDay() === 5);

  const all = getWorkers();
  const active = all.filter((w) => w.active);
  const summary = wageSummary(month);
  const att = getAttendance(month);
  const editing = sp.edit ? all.find((w) => w.id === Number(sp.edit)) : undefined;
  const showForm = !!editing || sp.new === "1" || all.length === 0;
  const pays = db()
    .prepare("SELECT p.*, w.name wname FROM worker_payments p JOIN workers w ON w.id = p.worker_id WHERE p.date BETWEEN ? AND ? ORDER BY p.date DESC, p.id DESC")
    .all(start, end) as { id: number; worker_id: number; wname: string; kind: string; amount: number; date: string; note: string | null }[];
  const here = `${base}/workers?m=${month}`;

  const workerForm = (w?: Worker) => (
    <form action={saveWorker} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <Hidden values={{ locale, id: w?.id, back: here }} />
      <Field label={L.name} className="lg:col-span-2"><input name="name" required defaultValue={w?.name} className="input" /></Field>
      <Field label={L.phone}><input name="phone" type="tel" dir="ltr" defaultValue={w?.phone ?? ""} className="input rtl:text-right" /></Field>
      <Field label={L.role}><Select name="role" defaultValue={w?.role ?? "installer"} options={ROLES.map((r) => [r, L.roles[r]])} /></Field>
      <Field label={L.payType}><Select name="pay_type" defaultValue={w?.pay_type ?? "daily"} options={[["daily", L.payTypes.daily], ["monthly", L.payTypes.monthly]]} /></Field>
      <Field label={L.rate}><input name="rate" inputMode="decimal" dir="ltr" defaultValue={w?.rate ?? ""} className="input num rtl:text-right" /></Field>
      <Field label={a.common.notes} className="sm:col-span-2 lg:col-span-4"><input name="notes" defaultValue={w?.notes ?? ""} className="input" /></Field>
      <label className="flex items-end gap-2 pb-2.5 text-sm"><input type="checkbox" name="active" defaultChecked={w ? !!w.active : true} className="h-4 w-4 accent-graphite" /> {L.active}</label>
      <div className="flex items-end"><SubmitButton>{a.common.save}</SubmitButton></div>
    </form>
  );

  return (
    <>
      <PageHeader title={L.title}>
        <Link href={`${base}/workers?m=${shiftMonth(month, -1)}`} className="btn btn-ghost bg-white" aria-label="‹"><ChevronLeft size={18} className="rtl:-scale-x-100" /></Link>
        <span className="min-w-36 text-center font-semibold">{monthLabel(month, locale)}</span>
        <Link href={`${base}/workers?m=${shiftMonth(month, 1)}`} className="btn btn-ghost bg-white" aria-label="›"><ChevronRight size={18} className="rtl:-scale-x-100" /></Link>
        {!showForm && <Link href={`${base}/workers?m=${month}&new=1`} className="btn btn-primary">+ {L.new}</Link>}
      </PageHeader>

      {showForm && (
        <Panel title={editing ? `${a.common.edit}: ${editing.name}` : L.new} className="mb-4" action={all.length > 0 && <Link href={here} className="text-sm text-muted">{a.common.cancel}</Link>}>
          {workerForm(editing)}
          {editing && (
            <form action={deleteWorker} className="mt-3 text-end">
              <Hidden values={{ locale, id: editing.id, back: here }} />
              <ConfirmButton message={a.common.confirmDelete}>{a.common.delete}</ConfirmButton>
            </form>
          )}
        </Panel>
      )}

      {all.length === 0 ? (
        <Panel><Empty text={L.empty} /></Panel>
      ) : (
        <>
          {/* wages this month */}
          <Panel pad={false} className="mb-4">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr><th>{L.name}</th><th>{L.role}</th><th>{L.payType}</th><th>{L.days}</th><th className="text-end">{L.earned}</th><th className="text-end">{L.paid}</th><th className="text-end">{L.remaining}</th><th /></tr>
                </thead>
                <tbody>
                  {all.map((w) => {
                    const s = summary.get(w.id)!;
                    return (
                      <tr key={w.id} className={w.active ? "" : "opacity-55"}>
                        <td>
                          <span className="font-medium">{w.name}</span>
                          {w.phone && <a href={`tel:${w.phone.replace(/\s/g, "")}`} className="num block text-xs text-muted" dir="ltr" style={{ textAlign: "start" }}>{w.phone}</a>}
                          {!w.active && <Badge>{L.inactive}</Badge>}
                        </td>
                        <td className="text-muted">{w.role ? L.roles[w.role as keyof typeof L.roles] : ""}</td>
                        <td className="whitespace-nowrap text-muted"><Money v={w.rate} cur={cur} locale={locale} /> / {L.payTypes[w.pay_type]}</td>
                        <td className="num">{num(s.days, 1)}</td>
                        <td className="text-end"><Money v={s.earned} cur={cur} locale={locale} /></td>
                        <td className="text-end"><Money v={s.paid} cur={cur} locale={locale} className="text-ok" /></td>
                        <td className="text-end">
                          {s.remaining > 0.009 ? <Money v={s.remaining} cur={cur} locale={locale} className="font-semibold text-bad" />
                            : s.remaining < -0.009 ? <span className="text-xs text-muted">{L.overpaid} <Money v={-s.remaining} cur={cur} locale={locale} /></span>
                            : <span className="text-muted">—</span>}
                        </td>
                        <td className="text-end"><Link href={`${base}/workers?m=${month}&edit=${w.id}`} className="btn btn-ghost btn-sm">{a.common.edit}</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* attendance */}
          {active.length > 0 && (
            <Panel title={L.attendance} className="mb-4">
              <p className="mb-3 text-sm text-muted">{L.attendanceHint}</p>
              <AttendanceGrid
                key={month}
                workers={active.map((w) => ({ id: w.id, name: w.name }))}
                days={days}
                initial={Object.fromEntries(active.map((w) => [w.id, att.get(w.id) || {}]))}
                fridays={fridays}
                today={today}
                labels={L.status}
              />
            </Panel>
          )}

          {/* payments */}
          <Panel title={L.payments} pad={false}>
            <form action={saveWorkerPayment} className="grid gap-3 border-b border-line p-5 sm:grid-cols-2 lg:grid-cols-6">
              <Hidden values={{ locale, back: here }} />
              <Field label={a.nav.workers} className="lg:col-span-2"><Select name="worker_id" required placeholder="—" options={active.map((w) => [w.id, w.name])} /></Field>
              <Field label={L.kind}><Select name="kind" defaultValue="advance" options={(["salary", "advance", "bonus"] as const).map((k) => [k, L.kinds[k]])} /></Field>
              <Field label={a.common.amount}><input name="amount" required inputMode="decimal" dir="ltr" className="input num rtl:text-right" /></Field>
              <Field label={a.common.date}><input name="date" type="date" defaultValue={today >= start && today <= end ? today : end} className="input" /></Field>
              <Field label={a.common.notes}><input name="note" className="input" /></Field>
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-6">
                <SubmitButton>{L.pay}</SubmitButton>
                <span className="text-xs text-muted">{L.expenseNote}</span>
              </div>
            </form>
            {pays.length === 0 ? (
              <p className="p-5 text-muted">{L.noPayments}</p>
            ) : (
              <table className="table">
                <tbody>
                  {pays.map((p) => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap">{dateFmt(p.date, locale)}</td>
                      <td className="font-medium">{p.wname}</td>
                      <td><Badge tone={p.kind === "advance" ? "amber" : p.kind === "bonus" ? "green" : "gray"}>{L.kinds[p.kind as keyof typeof L.kinds]}</Badge></td>
                      <td className="text-muted">{p.note}</td>
                      <td className="text-end"><Money v={p.amount} cur={cur} locale={locale} className="font-medium" /></td>
                      <td className="w-10">
                        <form action={deleteWorkerPayment}>
                          <Hidden values={{ locale, id: p.id, back: here }} />
                          <ConfirmButton message={a.common.confirmDelete} className="p-1 text-muted hover:text-bad"><Trash2 size={16} /></ConfirmButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </>
      )}
    </>
  );
}
