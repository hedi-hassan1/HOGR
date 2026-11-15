import Link from "next/link";
import { db } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { dateFmt } from "@/lib/format";
import { Badge, Empty, Field, Hidden, PageHeader, Panel, Select } from "@/components/admin/ui";
import { followupDays, getWaiting } from "@/lib/followup";
import { SubmitButton } from "@/components/admin/client";
import { createMeasurement } from "../../actions";

export default async function MeasurementsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const a = t.admin;
  const base = `/${locale}/admin`;
  const rows = db()
    .prepare(
      `SELECT m.*, c.name cname, (SELECT COUNT(*) FROM measurement_items i WHERE i.measurement_id = m.id) n,
       (SELECT GROUP_CONCAT(DISTINCT product_type) FROM measurement_items i WHERE i.measurement_id = m.id) types,
       (SELECT id FROM orders o WHERE o.measurement_id = m.id LIMIT 1) order_id
       FROM measurements m JOIN clients c ON c.id = m.client_id ORDER BY m.id DESC`,
    )
    .all() as { id: number; title: string | null; date: string | null; cname: string; client_id: number; n: number; types: string | null; taken_by: string | null; order_id: number | null; closed: number }[];
  const waiting = new Map(getWaiting().map((w) => [w.id, w]));
  const { red } = followupDays();
  const isRed = (id: number) => (waiting.get(id)?.days ?? -1) >= red;
  // Overdue sheets first, then newest
  rows.sort((x, y) => Number(isRed(y.id)) - Number(isRed(x.id)) || (waiting.get(y.id)?.days ?? 0) - (waiting.get(x.id)?.days ?? 0) || y.id - x.id);
  const fu = a.followup;
  const clients = db().prepare("SELECT id, name FROM clients ORDER BY name").all() as { id: number; name: string }[];

  return (
    <>
      <PageHeader title={a.measurements.title} />
      <Panel className="mb-4">
        <form action={createMeasurement} className="flex flex-wrap items-end gap-3">
          <Hidden values={{ locale }} />
          <Field label={a.common.client} className="min-w-56 flex-1">
            <Select name="client_id" required placeholder={a.common.selectClient} options={clients.map((c) => [c.id, c.name])} />
          </Field>
          <Field label={`${a.common.title} (${a.common.optional})`} className="min-w-56 flex-1"><input name="title" className="input" /></Field>
          <SubmitButton>+ {a.measurements.new}</SubmitButton>
        </form>
      </Panel>

      <Panel pad={false}>
        {rows.length === 0 ? <Empty text={a.measurements.empty} /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>{a.measurements.sheet}</th><th>{a.common.client}</th><th>{a.common.date}</th><th>{a.measurements.items}</th><th>{a.measurements.takenBy}</th></tr></thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className={isRed(m.id) ? "!bg-[#fbeceb]" : ""}>
                    <td>
                      <Link href={`${base}/measurements/${m.id}`} className={`font-medium hover:text-brass ${isRed(m.id) ? "text-bad" : ""}`}>{m.title || `#${m.id}`}</Link>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {waiting.has(m.id) && (
                          <Badge tone={isRed(m.id) ? "red" : "amber"}>{fu.waiting} · {fu.days.replace("{n}", String(waiting.get(m.id)!.days))}</Badge>
                        )}
                        {!!m.closed && <Badge tone="gray">{fu.closed}</Badge>}
                      </div>
                    </td>
                    <td><Link href={`${base}/clients/${m.client_id}`} className="hover:text-brass">{m.cname}</Link></td>
                    <td className="whitespace-nowrap text-muted">{dateFmt(m.date, locale)}</td>
                    <td className="text-muted"><span className="num">{m.n}</span> · {(m.types || "").split(",").filter(Boolean).map((k) => t.products[k as keyof typeof t.products]).join("، ")}</td>
                    <td className="text-muted">{m.taken_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
