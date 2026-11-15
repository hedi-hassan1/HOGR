import Link from "next/link";
import { Phone, MessageCircle, CalendarDays, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { getDict, LEAD_STATUSES } from "@/lib/i18n";
import { dateFmt } from "@/lib/format";
import { Badge, Empty, Hidden, PageHeader, STATUS_TONE, Tabs } from "@/components/admin/ui";
import { AutoSelect, ConfirmButton, SubmitButton } from "@/components/admin/client";
import { convertLead, deleteLead, setLeadStatus } from "../../actions";

type L = { id: number; name: string; phone: string; service: string | null; message: string | null; preferred_date: string | null; address: string | null; status: string; client_id: number | null; created_at: string; locale: string | null };

export default async function LeadsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ status?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = getDict(locale);
  const a = t.admin;
  const base = `/${locale}/admin`;
  const status = sp.status && (LEAD_STATUSES as readonly string[]).includes(sp.status) ? sp.status : "all";
  const all = db().prepare("SELECT * FROM leads ORDER BY id DESC").all() as L[];
  const rows = status === "all" ? all : all.filter((l) => l.status === status);

  return (
    <>
      <PageHeader title={a.leads.title} />
      <Tabs
        active={status}
        items={[
          { key: "all", href: `${base}/leads`, label: a.common.all, count: all.length },
          ...LEAD_STATUSES.map((s) => ({ key: s, href: `${base}/leads?status=${s}`, label: a.leads.statuses[s], count: all.filter((l) => l.status === s).length })),
        ]}
      />
      {rows.length === 0 ? (
        <div className="rounded-xl border border-line bg-white"><Empty text={a.leads.empty} /></div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((l) => {
            const wa = l.phone.replace(/\D/g, "").replace(/^0/, "964");
            return (
              <article key={l.id} className={`rounded-xl border bg-white p-5 ${l.status === "new" ? "border-brass/60" : "border-line"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{l.name}</h2>
                    <p className="text-sm text-muted">{dateFmt(l.created_at.slice(0, 10), locale)} {l.created_at.slice(11, 16)}</p>
                  </div>
                  <Badge tone={STATUS_TONE[l.status]}>{a.leads.statuses[l.status as keyof typeof a.leads.statuses]}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[15px]">
                  <a href={`tel:${l.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-brass" dir="ltr"><Phone size={15} />{l.phone}</a>
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-brass"><MessageCircle size={15} />WhatsApp</a>
                  {l.preferred_date && <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} />{dateFmt(l.preferred_date, locale)}</span>}
                  {l.address && <span className="inline-flex items-center gap-1.5"><MapPin size={15} />{l.address}</span>}
                </div>
                {l.service && <p className="mt-3"><Badge tone="brass">{t.products[l.service as keyof typeof t.products] || l.service}</Badge></p>}
                {l.message && <p className="mt-3 whitespace-pre-line rounded-lg bg-[#f6f6f4] p-3 text-[15px]">{l.message}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                  {l.client_id ? (
                    <Link href={`${base}/clients/${l.client_id}`} className="btn btn-ghost btn-sm">{a.common.client} →</Link>
                  ) : (
                    <form action={convertLead}>
                      <Hidden values={{ locale, id: l.id }} />
                      <SubmitButton className="btn btn-primary btn-sm">{a.leads.convert}</SubmitButton>
                    </form>
                  )}
                  <form action={setLeadStatus} className="w-40">
                    <Hidden values={{ locale, id: l.id, back: `${base}/leads${status !== "all" ? `?status=${status}` : ""}` }} />
                    <AutoSelect name="status" defaultValue={l.status} options={LEAD_STATUSES.map((s) => [s, a.leads.statuses[s]])} />
                  </form>
                  <form action={deleteLead} className="ms-auto">
                    <Hidden values={{ locale, id: l.id }} />
                    <ConfirmButton message={a.common.confirmDelete}>{a.common.delete}</ConfirmButton>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
