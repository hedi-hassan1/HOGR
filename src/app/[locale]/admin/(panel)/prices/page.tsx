import Link from "next/link";
import { getSettings } from "@/lib/db";
import { getDict, PRODUCT_TYPES, UNITS } from "@/lib/i18n";
import { getPrices, priceName, type Price } from "@/lib/extras";
import { Badge, Empty, Field, Hidden, Money, PageHeader, Panel, Select } from "@/components/admin/ui";
import { ConfirmButton, SubmitButton } from "@/components/admin/client";
import { deletePrice, savePrice } from "../../actions";

export default async function PricesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ edit?: string; new?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = getDict(locale);
  const a = t.admin;
  const L = a.prices;
  const base = `/${locale}/admin`;
  const cur = getSettings().currency;
  const prices = getPrices();
  const editing = sp.edit ? prices.find((p) => p.id === Number(sp.edit)) : undefined;
  const showForm = !!editing || sp.new === "1";

  const form = (p?: Price) => (
    <form action={savePrice} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Hidden values={{ locale, id: p?.id }} />
      <Field label={a.common.type}><Select name="product_type" defaultValue={p?.product_type ?? "window"} options={PRODUCT_TYPES.map((k) => [k, t.products[k]])} /></Field>
      <Field label={`${L.name} (کوردی)`}><input name="name_ckb" dir="rtl" defaultValue={p?.name_ckb ?? ""} className="input" /></Field>
      <Field label={`${L.name} (عربي)`}><input name="name_ar" dir="rtl" defaultValue={p?.name_ar ?? ""} className="input" /></Field>
      <Field label={`${L.name} (English)`}><input name="name_en" dir="ltr" defaultValue={p?.name_en ?? ""} className="input" /></Field>
      <Field label={L.unit}><Select name="unit" defaultValue={p?.unit ?? "m2"} options={UNITS.map((u) => [u, a.orders.units[u]])} /></Field>
      <Field label={L.price}><input name="price" required inputMode="decimal" dir="ltr" defaultValue={p?.price ?? ""} className="input num rtl:text-right" /></Field>
      <Field label={L.material}><input name="material" defaultValue={p?.material ?? ""} className="input" /></Field>
      <Field label={L.color}><input name="color" defaultValue={p?.color ?? ""} className="input" /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_default" defaultChecked={!!p?.is_default} className="h-4 w-4 accent-graphite" /> {L.isDefault}</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="on_site" defaultChecked={p ? !!p.on_site : true} className="h-4 w-4 accent-graphite" /> {L.onSite}</label>
      <Field label={a.website.sort}><input name="sort" type="number" defaultValue={p?.sort ?? 0} dir="ltr" className="input num" /></Field>
      <div className="flex items-end"><SubmitButton>{a.common.save}</SubmitButton></div>
    </form>
  );

  return (
    <>
      <PageHeader title={L.title} sub={L.sub}>
        {!showForm && <Link href={`${base}/prices?new=1`} className="btn btn-primary">+ {L.new}</Link>}
      </PageHeader>

      {showForm && (
        <Panel title={editing ? a.common.edit : L.new} className="mb-4" action={<Link href={`${base}/prices`} className="text-sm text-muted">{a.common.cancel}</Link>}>
          {form(editing)}
          {editing && (
            <form action={deletePrice} className="mt-3 text-end">
              <Hidden values={{ locale, id: editing.id }} />
              <ConfirmButton message={a.common.confirmDelete}>{a.common.delete}</ConfirmButton>
            </form>
          )}
        </Panel>
      )}

      <Panel pad={false}>
        {prices.length === 0 ? <Empty text={L.empty} /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>{a.common.type}</th><th>{L.name}</th><th>{L.material}</th><th className="text-end">{L.price}</th><th /></tr></thead>
              <tbody>
                {prices.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap">{t.products[p.product_type as keyof typeof t.products]}</td>
                    <td>
                      <span className="font-medium">{priceName(p, locale)}</span>
                      <span className="ms-2 inline-flex gap-1">
                        {!!p.is_default && <Badge tone="dark">{L.isDefault}</Badge>}
                        {!!p.on_site && <Badge tone="brass">{t.site.nav.estimate}</Badge>}
                      </span>
                    </td>
                    <td className="text-muted">{[p.material, p.color].filter(Boolean).join(" · ")}</td>
                    <td className="whitespace-nowrap text-end"><Money v={p.price} cur={cur} locale={locale} className="font-semibold" /> <span className="text-sm text-muted">/ {a.orders.units[p.unit]}</span></td>
                    <td className="text-end"><Link href={`${base}/prices?edit=${p.id}`} className="btn btn-ghost btn-sm">{a.common.edit}</Link></td>
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
