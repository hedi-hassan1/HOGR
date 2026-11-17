import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { addDaysISO, dateFmt, todayISO } from "@/lib/format";
import { getWorkers } from "@/lib/ops";
import { PageHeader } from "@/components/admin/ui";

type B = { id: number; worker_id: number | null; type: string; date: string; time: string | null; duration_min: number | null; status: string; cname: string | null; name: string | null; address: string | null; caddress: string | null };

const DEFAULT_MIN: Record<string, number> = { measurement: 60, installation: 240, delivery: 60, consultation: 60, other: 60 };
const TYPE_STYLE: Record<string, string> = {
  measurement: "border-brass bg-brass-soft",
  installation: "border-graphite bg-[#e8eaeb]",
  delivery: "border-[#5d8a93] bg-[#e3edf0]",
  consultation: "border-line bg-white",
  other: "border-line bg-white",
};

const toMin = (t: string | null) => (t && /^\d{1,2}:\d{2}/.test(t) ? Number(t.slice(0, 2).replace(":", "")) * 60 + Number(t.slice(-2)) : null);

/** Saturday that starts the week containing `iso` (work week Sat–Thu, Friday off). */
function weekStart(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  const diff = (d.getUTCDay() + 1) % 7; // Sat=0 … Fri=6
  return addDaysISO(iso, -diff);
}

/** Bookings of one worker on one day that overlap in time (no time = whole day). */
function conflictsOf(list: B[]) {
  const ids = new Set<number>();
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      const as = toMin(a.time), bs = toMin(b.time);
      const overlap =
        as === null || bs === null ||
        (as < bs + (b.duration_min || DEFAULT_MIN[b.type] || 60) && bs < as + (a.duration_min || DEFAULT_MIN[a.type] || 60));
      if (overlap) { ids.add(a.id); ids.add(b.id); }
    }
  return ids;
}

export default async function CalendarPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ w?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = getDict(locale);
  const a = t.admin;
  const L = a.calendar;
  const base = `/${locale}/admin`;
  const today = todayISO();
  const start = weekStart(sp.w && /^\d{4}-\d{2}-\d{2}$/.test(sp.w) ? sp.w : today);
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(start, i));
  const here = `${base}/calendar?w=${start}`;

  const bookings = await db().prepare(
      `SELECT b.*, c.name cname, c.address caddress FROM bookings b LEFT JOIN clients c ON c.id = b.client_id
       WHERE b.date BETWEEN ? AND ? AND b.status != 'cancelled' ORDER BY b.date, b.time`,
    )
    .all(days[0], days[6]) as B[];
  const workers = (await getWorkers(true));
  const rows: { id: number | null; name: string }[] = [...workers.map((w) => ({ id: w.id as number | null, name: w.name })), { id: null, name: L.unassigned }];

  const cell = (wid: number | null, day: string) => bookings.filter((b) => (b.worker_id ?? null) === wid && b.date === day);
  const conflicts = new Set<number>();
  for (const r of rows) if (r.id !== null) for (const d of days) conflictsOf(cell(r.id, d)).forEach((id) => conflicts.add(id));

  const chip = (b: B) => (
    <Link
      key={b.id}
      href={`${base}/bookings?edit=${b.id}&back=${encodeURIComponent(here)}`}
      className={`block rounded-md border-s-4 px-2 py-1.5 text-[12.5px] leading-snug hover:brightness-95 ${conflicts.has(b.id) ? "border-bad bg-[#f6e1df] ring-1 ring-bad" : TYPE_STYLE[b.type] || TYPE_STYLE.other} ${b.status === "done" ? "opacity-55" : ""}`}
    >
      <span className="num font-semibold">{b.time || "—"}</span>
      {conflicts.has(b.id) && <AlertTriangle size={12} className="ms-1 inline text-bad" />}
      <span className="block truncate">{b.cname || b.name}</span>
      <span className="block truncate text-muted">{a.bookings.types[b.type as keyof typeof a.bookings.types]}{(b.duration_min || DEFAULT_MIN[b.type]) ? ` · ${L.hours.replace("{n}", String(((b.duration_min || DEFAULT_MIN[b.type]) / 60).toString()))}` : ""}</span>
    </Link>
  );
  const addLink = (wid: number | null, day: string) => `${base}/bookings?new=1&date=${day}${wid ? `&worker=${wid}` : ""}&back=${encodeURIComponent(here)}`;
  const dayName = (iso: string) => new Intl.DateTimeFormat(locale === "ckb" ? "ckb-IQ" : locale === "ar" ? "ar-IQ" : "en-GB", { weekday: "short", timeZone: "UTC" }).format(new Date(iso + "T00:00:00Z"));

  return (
    <>
      <PageHeader title={L.title} sub={`${dateFmt(days[0], locale)} – ${dateFmt(days[6], locale)}`}>
        <Link href={`${base}/calendar?w=${addDaysISO(start, -7)}`} className="btn btn-ghost bg-white" aria-label={L.prev}><ChevronLeft size={18} className="rtl:-scale-x-100" /></Link>
        <Link href={`${base}/calendar`} className="btn btn-ghost bg-white">{L.today}</Link>
        <Link href={`${base}/calendar?w=${addDaysISO(start, 7)}`} className="btn btn-ghost bg-white" aria-label={L.next}><ChevronRight size={18} className="rtl:-scale-x-100" /></Link>
      </PageHeader>

      {conflicts.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#e6c5c2] bg-[#fbeceb] px-4 py-3 text-bad">
          <AlertTriangle size={18} className="shrink-0" />
          <span><b>{L.conflict}.</b> {L.conflictText.replace("{n}", String(conflicts.size))}</span>
        </div>
      )}
      {workers.length === 0 && <p className="mb-4 rounded-xl border border-line bg-white px-4 py-3 text-sm text-muted">{L.noWorkers} <Link href={`${base}/workers`} className="underline">{a.nav.workers}</Link></p>}

      {/* Desktop: workers × days grid */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
        <table className="w-full min-w-[980px] table-fixed border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-36 border-b border-line p-2" />
              {days.map((d, i) => (
                <th key={d} className={`border-b border-s border-line p-2 text-start font-medium ${d === today ? "bg-brass-soft" : i === 6 ? "bg-[#f6f6f4]" : ""}`}>
                  <span className="block text-xs text-muted">{dayName(d)}</span>
                  <span className={d === today ? "font-bold text-brass" : ""}>{dateFmt(d, locale).replace(/ \d{4}$/, "")}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id ?? "none"}>
                <th className={`border-b border-line p-2 text-start align-top font-medium ${r.id === null ? "text-muted" : ""}`}>{r.name}</th>
                {days.map((d, i) => {
                  const list = cell(r.id, d);
                  return (
                    <td key={d} className={`group h-24 border-b border-s border-line p-1.5 align-top ${i === 6 ? "bg-[#fafaf8]" : ""}`}>
                      <div className="space-y-1">{list.map(chip)}</div>
                      <Link href={addLink(r.id, d)} className="mt-1 flex h-6 items-center justify-center rounded text-muted opacity-0 hover:bg-stone group-hover:opacity-100 focus:opacity-100" aria-label={L.add}>
                        <Plus size={14} />
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone: one block per day */}
      <div className="space-y-3 md:hidden">
        {days.map((d) => {
          const list = bookings.filter((b) => b.date === d);
          return (
            <section key={d} className={`rounded-xl border bg-white ${d === today ? "border-brass" : "border-line"}`}>
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                <span className={`font-semibold ${d === today ? "text-brass" : ""}`}>{dayName(d)} · {dateFmt(d, locale).replace(/ \d{4}$/, "")}</span>
                <Link href={addLink(null, d)} className="rounded-md p-1 text-muted hover:bg-stone" aria-label={L.add}><Plus size={18} /></Link>
              </div>
              {list.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted">—</p>
              ) : (
                <div className="space-y-2 p-3">
                  {list.map((b) => (
                    <div key={b.id}>
                      <p className="mb-1 text-xs text-muted">{workers.find((w) => w.id === b.worker_id)?.name || L.unassigned}</p>
                      {chip(b)}
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
