import { getDict, PRODUCT_TYPES } from "@/lib/i18n";
import { getPortfolio } from "@/lib/site";
import { Empty, Field, Hidden, PageHeader, Panel, Select } from "@/components/admin/ui";
import { ConfirmButton, SubmitButton } from "@/components/admin/client";
import { deletePortfolio, setBeforeImage, updatePortfolio, uploadPortfolio } from "../../actions";

export default async function PortfolioPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const a = t.admin;
  const items = getPortfolio();
  const cats = PRODUCT_TYPES.map((k) => [k, t.products[k]] as [string, string]);

  return (
    <>
      <PageHeader title={a.portfolio.title} sub={a.portfolio.sub} />
      <Panel title={a.portfolio.upload} className="mb-6">
        <form action={uploadPortfolio} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Hidden values={{ locale }} />
          <Field label={a.portfolio.image} className="sm:col-span-2"><input type="file" name="image" accept="image/jpeg,image/png,image/webp" multiple required className="input py-2" /><span className="mt-1 block text-xs text-muted">{a.website.multi}</span></Field>
          <Field label={a.common.category}><Select name="category" defaultValue="door" options={cats} /></Field>
          <label className="flex items-end gap-2 pb-2.5"><input type="checkbox" name="featured" className="h-4 w-4 accent-graphite" /> {a.portfolio.featured}</label>
          <Field label={a.portfolio.titleCkb}><input name="title_ckb" dir="rtl" className="input" /></Field>
          <Field label={a.portfolio.titleAr}><input name="title_ar" dir="rtl" className="input" /></Field>
          <Field label={a.portfolio.titleEn}><input name="title_en" dir="ltr" className="input" /></Field>
          <div className="flex items-end"><SubmitButton>{a.portfolio.upload}</SubmitButton></div>
        </form>
      </Panel>

      {items.length === 0 ? <Panel><Empty text={a.portfolio.empty} /></Panel> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-xl border border-line bg-white">
              <div className="relative">
                <img src={p.image} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
                {p.before_image && (
                  <img src={p.before_image} alt="" className="absolute bottom-2 start-2 h-16 w-20 rounded border-2 border-white object-cover shadow" title={t.site.ba.before} />
                )}
              </div>
              <form action={updatePortfolio} className="grid grid-cols-2 gap-2 p-4">
                <Hidden values={{ locale, id: p.id }} />
                <input name="title_ckb" dir="rtl" defaultValue={p.title_ckb ?? ""} placeholder={a.portfolio.titleCkb} className="input col-span-2 py-2 text-sm" />
                <input name="title_ar" dir="rtl" defaultValue={p.title_ar ?? ""} placeholder={a.portfolio.titleAr} className="input py-2 text-sm" />
                <input name="title_en" dir="ltr" defaultValue={p.title_en ?? ""} placeholder={a.portfolio.titleEn} className="input py-2 text-sm" />
                <Select name="category" defaultValue={p.category} options={cats} className="py-2 text-sm" />
                <input name="sort" type="number" defaultValue={p.sort} title={a.portfolio.sort} className="input num py-2 text-sm" dir="ltr" />
                <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={!!p.featured} className="h-4 w-4 accent-graphite" /> {a.portfolio.featured}</label>
                <div className="col-span-2 flex items-center justify-between">
                  <SubmitButton className="btn btn-primary btn-sm">{a.common.save}</SubmitButton>
                </div>
              </form>
              <form action={deletePortfolio} className="-mt-12 px-4 pb-4 text-end">
                <Hidden values={{ locale, id: p.id }} />
                <ConfirmButton message={a.common.confirmDelete}>{a.common.delete}</ConfirmButton>
              </form>
              {/* Optional "before" photo turns this project into a before/after slider on the website */}
              <form action={setBeforeImage} className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
                <Hidden values={{ locale, id: p.id }} />
                <span className="text-xs text-muted">{t.site.ba.before}:</span>
                <input type="file" name="before" accept="image/jpeg,image/png,image/webp" className="min-w-0 flex-1 text-xs" />
                <SubmitButton className="btn btn-ghost btn-sm">{a.website.images.save}</SubmitButton>
              </form>
              {p.before_image && (
                <form action={setBeforeImage} className="-mt-2 px-4 pb-3">
                  <Hidden values={{ locale, id: p.id, remove: 1 }} />
                  <button className="text-xs text-muted underline hover:text-bad">{a.common.removeRow}: {t.site.ba.before}</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
