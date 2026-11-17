import Link from "next/link";
import { Search } from "lucide-react";
import { allOrderTotals, db, getSettings } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { Empty, Money, PageHeader, Panel } from "@/components/admin/ui";
import { ClientForm, type ClientRow } from "./ClientForm";

export default async function ClientsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string; new?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const a = getDict(locale).admin;
  const base = `/${locale}/admin`;
  const cur = (await getSettings()).currency;
  const q = (sp.q || "").trim();

  const rows = (
    q
      ? await db().prepare("SELECT * FROM clients WHERE name LIKE ? OR replace(phone,' ','') LIKE ? OR replace(phone2,' ','') LIKE ? ORDER BY id DESC").all(`%${q}%`, `%${q.replace(/\s/g, "")}%`, `%${q.replace(/\s/g, "")}%`)
      : await db().prepare("SELECT * FROM clients ORDER BY id DESC").all()
  ) as ClientRow[];

  const totals = (await allOrderTotals());
  const orders = await db().prepare("SELECT id, client_id, status FROM orders").all() as { id: number; client_id: number; status: string }[];
  const byClient = new Map<number, { n: number; bal: number }>();
  for (const o of orders) {
    const m = byClient.get(o.client_id) || { n: 0, bal: 0 };
    m.n++;
    if (o.status !== "quote" && o.status !== "cancelled") m.bal += totals.get(o.id)?.balance || 0;
    byClient.set(o.client_id, m);
  }

  return (
    <>
      <PageHeader title={a.clients.title}>
        <form className="relative">
          <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder={a.clients.searchPh} className="input w-64 ps-9" />
        </form>
      </PageHeader>

      <details open={sp.new === "1"} className="group mb-4 rounded-xl border border-line bg-white">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 font-semibold [&::-webkit-details-marker]:hidden">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-graphite text-white transition-transform group-open:rotate-45">+</span>
          {a.clients.new}
        </summary>
        <div className="border-t border-line p-5"><ClientForm locale={locale} a={a} /></div>
      </details>

      <Panel pad={false}>
        {rows.length === 0 ? (
          <Empty text={q ? a.common.noResults : a.clients.empty} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{a.common.name}</th>
                  <th>{a.common.phone}</th>
                  <th className="hidden md:table-cell">{a.common.address}</th>
                  <th>{a.clients.orders}</th>
                  <th>{a.clients.balance}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const s = byClient.get(c.id);
                  return (
                    <tr key={c.id}>
                      <td><Link href={`${base}/clients/${c.id}`} className="font-medium hover:text-brass">{c.name}</Link></td>
                      <td className="num" dir="ltr" style={{ textAlign: "start" }}>{c.phone}</td>
                      <td className="hidden max-w-xs truncate text-muted md:table-cell">{[c.address, c.city].filter(Boolean).join("، ")}</td>
                      <td className="num">{s?.n || 0}</td>
                      <td>{s && s.bal > 0 ? <Money v={s.bal} cur={cur} locale={locale} className="text-bad" /> : <span className="text-muted">—</span>}</td>
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
