import { ImageInput } from "@/components/admin/ImageInput";
import Link from "next/link";
import { ExternalLink, Trash2 } from "lucide-react";
import { getDict, LOCALES } from "@/lib/i18n";
import { getAt, getFaqs, getOverrides, getSiteConfig, getTestimonials, IMAGE_SLOTS, SECTIONS, SECTION_TOGGLES, type Faq, type Testimonial } from "@/lib/content";
import { getPortfolio, titleFor } from "@/lib/site";
import { Badge, Hidden, PageHeader, Panel, Tabs } from "@/components/admin/ui";
import { ConfirmButton, SubmitButton } from "@/components/admin/client";
import { approveReview, deleteFaq, deleteReview, deleteTestimonial, resetContent, saveContent, saveFaq, saveSiteImage, saveTestimonial, saveToggles } from "../../actions";
import { db } from "@/lib/db";
import { dateFmt } from "@/lib/format";

const COVERS = ["door", "window", "kitchen", "wardrobe", "bathroom", "vanity", "bed_panel"] as const;
const dirFor = (l: string) => (l === "en" ? "ltr" : "rtl");

export default async function WebsitePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string; saved?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = getDict(locale);
  const a = t.admin;
  const w = a.website;
  const base = `/${locale}/admin`;
  const tab = ["texts", "images", "reviews", "faq", "sections"].includes(sp.tab || "") ? sp.tab! : "texts";
  const loc = locale as "ckb" | "ar" | "en";

  return (
    <>
      <PageHeader title={w.title} sub={w.sub}>
        <a href={`/${locale}`} target="_blank" className="btn btn-ghost bg-white"><ExternalLink size={16} /> {w.open}</a>
      </PageHeader>

      <Tabs
        active={tab}
        items={[
          { key: "texts", href: `${base}/website?tab=texts`, label: w.tabs.texts },
          { key: "images", href: `${base}/website?tab=images`, label: w.tabs.images },
          { key: "gallery", href: `${base}/portfolio`, label: w.tabs.gallery },
          { key: "reviews", href: `${base}/website?tab=reviews`, label: w.tabs.reviews },
          { key: "faq", href: `${base}/website?tab=faq`, label: w.tabs.faq },
          { key: "sections", href: `${base}/website?tab=sections`, label: w.tabs.sections },
          { key: "contact", href: `${base}/settings`, label: w.tabs.contact },
        ]}
      />

      {tab === "texts" && <TextsTab locale={locale} w={w} saved={sp.saved} loc={loc} />}
      {tab === "images" && <ImagesTab locale={locale} t={t} />}
      {tab === "reviews" && <ReviewsTab locale={locale} t={t} />}
      {tab === "faq" && <FaqTab locale={locale} t={t} />}
      {tab === "sections" && <SectionsTab locale={locale} t={t} saved={!!sp.saved} />}
    </>
  );
}

type W = ReturnType<typeof getDict>["admin"]["website"];
type T = ReturnType<typeof getDict>;

/* ---------------- Texts ---------------- */

async function TextsTab({ locale, w, saved, loc }: { locale: string; w: W; saved?: string; loc: "ckb" | "ar" | "en" }) {
  const overrides = (await getOverrides());
  return (
    <div className="space-y-3">
      {SECTIONS.map((section, si) => {
        const editedCount = section.fields.filter((fl) => LOCALES.some((l) => overrides.has(`${fl.path}|${l}`))).length;
        return (
          <details key={section.id} id={section.id} open={saved ? saved === section.id : si === 0} className="group scroll-mt-20 rounded-xl border border-line bg-white">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-stone text-sm transition-transform group-open:rotate-90 rtl:group-open:-rotate-90">›</span>
              <span className="font-semibold">{section.label[loc]}</span>
              {editedCount > 0 && <Badge tone="brass">{w.edited} · {editedCount}</Badge>}
              {saved === section.id && <Badge tone="green">{w.saved}</Badge>}
            </summary>
            <form action={saveContent} className="border-t border-line">
              <Hidden values={{ locale, section: section.id }} />
              <div className="hidden grid-cols-[minmax(140px,1fr)_2fr_2fr_2fr] gap-3 border-b border-line bg-[#fafaf8] px-5 py-2 text-xs text-muted lg:grid">
                <span />
                {LOCALES.map((l) => <span key={l}>{w.langs[l]}</span>)}
              </div>
              <div className="divide-y divide-[#eceae6]">
                {section.fields.map((field) => (
                  <div key={field.path} className="grid gap-2 px-5 py-3 lg:grid-cols-[minmax(140px,1fr)_2fr_2fr_2fr] lg:gap-3">
                    <span className="pt-2 text-sm font-medium">
                      {field.label[loc]}
                      {LOCALES.some((l) => overrides.has(`${field.path}|${l}`)) && <span className="ms-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brass align-middle" />}
                    </span>
                    {LOCALES.map((l) => {
                      const value = overrides.get(`${field.path}|${l}`) ?? getAt(getDict(l), field.path);
                      const common = { name: `${field.path}|${l}`, defaultValue: value, dir: dirFor(l), lang: l, "aria-label": `${field.label[loc]} (${w.langs[l]})`, className: "input text-[15px]" };
                      return (
                        <label key={l} className="block">
                          <span className="mb-1 block text-xs text-muted lg:hidden">{w.langs[l]}</span>
                          {field.long ? <textarea rows={2} {...common} /> : <input {...common} />}
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 border-t border-line px-5 py-3">
                <SubmitButton>{getDict(locale).admin.common.save}</SubmitButton>
              </div>
            </form>
            {editedCount > 0 && (
              <form action={resetContent} className="-mt-14 flex justify-end px-5 pb-3">
                <Hidden values={{ locale, section: section.id }} />
                <ConfirmButton message={w.resetConfirm} className="btn btn-ghost btn-sm">{w.reset}</ConfirmButton>
              </form>
            )}
          </details>
        );
      })}
    </div>
  );
}

/* ---------------- Images ---------------- */

function ImageForm({ locale, slot, current, w, gallery, auto }: { locale: string; slot: string; current?: string; w: W; gallery: [string, string][]; auto?: boolean }) {
  return (
    <form action={saveSiteImage} className="space-y-3 p-4">
      <Hidden values={{ locale, slot }} />
      <label className="block">
        <span className="label">{w.images.upload}</span>
        <ImageInput name="image" className="input py-2 text-sm" />
      </label>
      <label className="block">
        <span className="label">{w.images.orPick}</span>
        <select name="pick" defaultValue="" className="input py-2 text-sm">
          <option value="">—</option>
          {gallery.map(([src, title]) => <option key={src} value={src}>{title}</option>)}
        </select>
      </label>
      {auto && current && (
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="clear" className="h-4 w-4 accent-graphite" /> {w.images.auto}</label>
      )}
      <SubmitButton className="btn btn-primary btn-sm">{w.images.save}</SubmitButton>
    </form>
  );
}

async function ImagesTab({ locale, t }: { locale: string; t: T }) {
  const w = t.admin.website;
  const cfg = (await getSiteConfig());
  const gallery = (await getPortfolio()).map((p) => [p.image, `${t.products[p.category as keyof typeof t.products] ?? ""} · ${titleFor(p, locale)}`] as [string, string]);
  const autoCovers: Record<string, string> = {};
  for (const p of (await getPortfolio())) if (!autoCovers[p.category]) autoCovers[p.category] = p.image;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">{w.images.hint}</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {IMAGE_SLOTS.map((slot) => (
          <section key={slot} id={`img-${slot}`} className="scroll-mt-20 overflow-hidden rounded-xl border border-line bg-white">
            <h2 className="border-b border-line px-4 py-3 font-semibold">{w.images[slot]}</h2>
            <div className="bg-stone">
              {cfg.images[slot] ? <img src={cfg.images[slot]} alt="" className={`h-48 w-full ${slot === "owner" ? "object-contain" : "object-cover"}`} /> : <div className="h-48" />}
            </div>
            <ImageForm locale={locale} slot={slot} current={cfg.images[slot]} w={w} gallery={gallery} />
          </section>
        ))}
      </div>

      <Panel title={w.images.covers}>
        <p className="mb-4 text-sm text-muted">{w.images.coversHint}</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COVERS.map((k) => {
            const current = cfg.covers[k];
            const shown = current || autoCovers[k];
            return (
              <section key={k} id={`img-${k}`} className="scroll-mt-20 overflow-hidden rounded-lg border border-line">
                <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
                  <h3 className="font-medium">{t.products[k]}</h3>
                  {current && <Badge tone="brass">{w.edited}</Badge>}
                </div>
                {shown ? <img src={shown} alt="" className="h-36 w-full object-cover" /> : <div className="h-36 bg-stone" />}
                <ImageForm locale={locale} slot={k} current={current} w={w} gallery={gallery} auto />
              </section>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Reviews ---------------- */

function TriFields({ w, prefix, label, row, long }: { w: W; prefix: string; label: string; row?: Record<string, unknown>; long?: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {LOCALES.map((l) => {
        const common = { name: `${prefix}_${l}`, defaultValue: (row?.[`${prefix}_${l}`] as string) ?? "", dir: dirFor(l), lang: l, className: "input text-[15px]" };
        return (
          <label key={l} className="block">
            <span className="label">{label} · {w.langs[l]}</span>
            {long ? <textarea rows={3} {...common} /> : <input {...common} />}
          </label>
        );
      })}
    </div>
  );
}

function ReviewForm({ locale, t, row }: { locale: string; t: T; row?: Testimonial }) {
  const w = t.admin.website;
  return (
    <form action={saveTestimonial} className="space-y-3 p-5">
      <Hidden values={{ locale, id: row?.id }} />
      <TriFields w={w} prefix="text" label={w.reviews.text} row={row} long />
      <TriFields w={w} prefix="name" label={w.reviews.name} row={row} />
      <TriFields w={w} prefix="role" label={w.reviews.role} row={row} />
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visible" defaultChecked={row ? !!row.visible : true} className="h-4 w-4 accent-graphite" /> {w.reviews.visible}</label>
        <label className="flex items-center gap-2 text-sm">{w.sort} <input type="number" name="sort" defaultValue={row?.sort ?? 0} className="input num w-20 py-1.5" dir="ltr" /></label>
        <SubmitButton className="btn btn-primary btn-sm">{row ? t.admin.common.save : w.reviews.add}</SubmitButton>
      </div>
    </form>
  );
}

async function ReviewsTab({ locale, t }: { locale: string; t: T }) {
  const w = t.admin.website;
  const rows = (await getTestimonials(locale, true)) as Testimonial[];
  const pending = await db().prepare("SELECT * FROM reviews WHERE status = 'pending' ORDER BY id DESC").all() as { id: number; name: string; rating: number; text: string | null; created_at: string }[];
  const R = t.admin.reviewsAdmin;
  return (
    <div className="space-y-4">
      <Panel title={`${R.fromClients} · ${R.pending}`} pad={false}>
        {pending.length === 0 ? <p className="p-5 text-muted">{R.none}</p> : (
          <ul className="divide-y divide-[#eceae6]">
            {pending.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.name} <span className="ms-2 text-brass" dir="ltr">{"★".repeat(r.rating)}<span className="text-line">{"★".repeat(5 - r.rating)}</span></span></p>
                  {r.text && <p className="mt-1 whitespace-pre-line">{r.text}</p>}
                  <p className="mt-1 text-xs text-muted">{dateFmt(r.created_at.slice(0, 10), locale)}</p>
                </div>
                <form action={approveReview}><Hidden values={{ locale, id: r.id }} /><SubmitButton className="btn btn-primary btn-sm">{R.approve}</SubmitButton></form>
                <form action={deleteReview}><Hidden values={{ locale, id: r.id }} /><ConfirmButton message={t.admin.common.confirmDelete}>{t.admin.common.delete}</ConfirmButton></form>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {rows.length === 0 && <p className="text-muted">{w.reviews.empty}</p>}
      {rows.map((r) => (
        <section key={r.id} className={`rounded-xl border bg-white ${r.visible ? "border-line" : "border-dashed border-line opacity-75"}`}>
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
            <span className="font-semibold">{(r as unknown as Record<string, string>)[`name_${locale}`] || r.name_en || r.name_ckb}</span>
            <form action={deleteTestimonial}>
              <Hidden values={{ locale, id: r.id }} />
              <ConfirmButton message={t.admin.common.confirmDelete} className="rounded-md p-1.5 text-muted hover:bg-[#f8e9e7] hover:text-bad"><Trash2 size={16} /></ConfirmButton>
            </form>
          </div>
          <ReviewForm locale={locale} t={t} row={r} />
        </section>
      ))}
      <Panel title={`+ ${w.reviews.add}`} pad={false}>
        <ReviewForm locale={locale} t={t} />
      </Panel>
    </div>
  );
}

/* ---------------- FAQ ---------------- */

function FaqForm({ locale, t, row }: { locale: string; t: T; row?: Faq }) {
  const w = t.admin.website;
  return (
    <form action={saveFaq} className="space-y-3 p-5">
      <Hidden values={{ locale, id: row?.id }} />
      <TriFields w={w} prefix="q" label={w.faq.q} row={row} />
      <TriFields w={w} prefix="a" label={w.faq.a} row={row} long />
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visible" defaultChecked={row ? !!row.visible : true} className="h-4 w-4 accent-graphite" /> {w.faq.visible}</label>
        <label className="flex items-center gap-2 text-sm">{w.sort} <input type="number" name="sort" defaultValue={row?.sort ?? 0} className="input num w-20 py-1.5" dir="ltr" /></label>
        <SubmitButton className="btn btn-primary btn-sm">{row ? t.admin.common.save : w.faq.add}</SubmitButton>
      </div>
    </form>
  );
}

async function FaqTab({ locale, t }: { locale: string; t: T }) {
  const w = t.admin.website;
  const rows = (await getFaqs(locale, true)) as Faq[];
  return (
    <div className="space-y-4">
      {rows.length === 0 && <p className="text-muted">{w.faq.empty}</p>}
      {rows.map((r) => (
        <section key={r.id} className={`rounded-xl border bg-white ${r.visible ? "border-line" : "border-dashed border-line opacity-75"}`}>
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
            <span className="font-semibold">{(r as unknown as Record<string, string>)[`q_${locale}`] || r.q_en || r.q_ckb}</span>
            <form action={deleteFaq}>
              <Hidden values={{ locale, id: r.id }} />
              <ConfirmButton message={t.admin.common.confirmDelete} className="rounded-md p-1.5 text-muted hover:bg-[#f8e9e7] hover:text-bad"><Trash2 size={16} /></ConfirmButton>
            </form>
          </div>
          <FaqForm locale={locale} t={t} row={r} />
        </section>
      ))}
      <Panel title={`+ ${w.faq.add}`} pad={false}>
        <FaqForm locale={locale} t={t} />
      </Panel>
    </div>
  );
}

/* ---------------- Sections ---------------- */

async function SectionsTab({ locale, t, saved }: { locale: string; t: T; saved: boolean }) {
  const w = t.admin.website;
  const cfg = (await getSiteConfig());
  return (
    <Panel title={w.sections.title} action={saved && <Badge tone="green">{w.saved}</Badge>}>
      <form action={saveToggles} className="space-y-1">
        <Hidden values={{ locale }} />
        {SECTION_TOGGLES.map((k) => (
          <label key={k} className="flex cursor-pointer items-center justify-between gap-4 rounded-lg px-2 py-3 hover:bg-[#fafaf8]">
            <span>{w.sections[k]}</span>
            <span className="relative inline-flex">
              <input type="checkbox" name={k} defaultChecked={cfg.show[k]} className="peer sr-only" />
              <span className="h-6 w-11 rounded-full bg-line transition-colors peer-checked:bg-graphite peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brass" />
              <span className="absolute start-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5 rtl:peer-checked:-translate-x-5" />
            </span>
          </label>
        ))}
        <div className="pt-3"><SubmitButton>{t.admin.common.save}</SubmitButton></div>
      </form>
    </Panel>
  );
}
