import Link from "next/link";
import { ArrowUpRight, Phone } from "lucide-react";
import { SITE_PRODUCTS } from "@/lib/i18n";
import { getSiteConfig, getSiteDict, getTestimonials } from "@/lib/content";
import { getSettings } from "@/lib/db";
import { categoryCovers, getPortfolio, titleFor } from "@/lib/site";
import { BookingForm } from "@/components/site/BookingForm";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getSiteDict(locale);
  const cfg = getSiteConfig();
  const reviews = getTestimonials(locale) as { id: number; name: string; role: string; text: string; rating: number | null }[];
  const q = locale === "en" ? ["“", "”"] : ["«", "»"];
  const sep = locale === "en" ? ", " : "، ";
  const s = getSettings(locale);
  const covers = { ...categoryCovers(), ...cfg.covers };
  const featured = getPortfolio({ featured: true }).slice(0, 8);
  const heroImg = cfg.images.hero || "/images/work/darga4.jpg";

  return (
    <>
      {/* Hero: the photo carries workshop-drawing dimension lines */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 md:grid-cols-12 md:gap-8 md:pb-24 md:pt-16">
        <div className="md:col-span-6 lg:col-span-6">
          <h1 className="display text-[44px] sm:text-6xl lg:text-[78px]">{t.site.hero.title}</h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">{t.site.hero.sub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/${locale}/contact#book`} className="btn btn-primary px-6 py-3.5 text-base">{t.site.hero.cta}</Link>
            <Link href={`/${locale}/work`} className="btn btn-ghost px-6 py-3.5 text-base">{t.site.hero.cta2}</Link>
          </div>
          <a href={`tel:${s.phone1?.replace(/\s/g, "")}`} className="mt-8 inline-flex items-center gap-2 text-[15px] text-muted hover:text-graphite">
            <Phone size={16} /> <span dir="ltr">{s.phone1}</span>
          </a>
        </div>
        <div className="md:col-span-6 lg:col-span-5 lg:col-start-8">
          <div className="relative me-9 mt-9">
            <div className="dim dim-h" style={{ top: -30 }}><span>{t.site.hero.dimW}</span></div>
            <div className="dim dim-v" style={{ insetInlineEnd: -32 }}><span>{t.site.hero.dimH}</span></div>
            <img src={heroImg} alt={t.products.door} className="aspect-[4/5] w-full rounded-sm object-cover" fetchPriority="high" />
          </div>
        </div>
      </section>

      {/* Products as a catalogue index */}
      {cfg.show.products && (
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
        <div className="grid gap-4 md:grid-cols-12">
          <h2 className="display text-4xl md:col-span-5 md:text-5xl">{t.site.products.title}</h2>
          <p className="max-w-md text-lg text-muted md:col-span-6 md:col-start-7">{t.site.products.sub}</p>
        </div>
        <ul className="mt-10 border-t border-graphite">
          {SITE_PRODUCTS.map((key) => (
            <li key={key} className="border-b border-line">
              <Link href={`/${locale}/work?c=${key}`} className="group grid grid-cols-[1fr_auto] items-center gap-4 py-5 md:grid-cols-12 md:gap-8">
                <span className="display text-2xl transition-colors group-hover:text-brass sm:text-3xl md:col-span-4">{t.products[key]}</span>
                <span className="col-span-1 row-start-2 text-[15px] text-muted md:col-span-5 md:row-start-auto">{t.site.products.items[key]}</span>
                <span className="row-span-2 flex items-center justify-end gap-4 md:col-span-3 md:row-span-1">
                  {covers[key] && <img src={covers[key]} alt="" className="h-20 w-28 rounded-sm object-cover sm:h-24 sm:w-36" loading="lazy" />}
                  <ArrowUpRight className="hidden shrink-0 text-muted transition-colors group-hover:text-brass md:block rtl:-scale-x-100" size={22} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      )}

      {/* Process: a real sequence, so it is numbered */}
      {cfg.show.process && (
      <section className="bg-graphite text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <h2 className="display text-4xl md:text-5xl">{t.site.process.title}</h2>
          <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
            {t.site.process.steps.map((step, i) => (
              <li key={i} className="relative lg:pe-8">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-brass text-sm text-brass">{(i + 1).toLocaleString(locale === "en" ? "en" : "ar-EG")}</span>
                  {i < 3 && <span className="hidden h-px flex-1 bg-white/20 lg:block" />}
                </div>
                <h3 className="mt-5 text-xl font-semibold">{step.t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-white/65">{step.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      )}

      {/* Featured work */}
      {cfg.show.featured && featured.length > 0 && (
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="display text-4xl md:text-5xl">{t.site.featured.title}</h2>
          <Link href={`/${locale}/work`} className="btn btn-ghost">{t.site.featured.all}</Link>
        </div>
        <div className="mt-10 columns-2 gap-3 md:columns-3 md:gap-4 lg:columns-4">
          {featured.map((p) => (
            <figure key={p.id} className="mb-3 break-inside-avoid md:mb-4">
              <img src={p.image} alt={titleFor(p, locale)} loading="lazy" className="w-full rounded-sm" />
              <figcaption className="mt-2 text-sm text-muted">{titleFor(p, locale)}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      )}

      {/* Client words */}
      {cfg.show.reviews && reviews.length > 0 && (
        <section className="bg-stone">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-20">
            <figure>
              <blockquote className="display text-3xl !leading-tight md:text-[42px]">{q[0]}{reviews[0].text}{q[1]}</blockquote>
              <figcaption className="mt-6 text-muted">
                {reviews[0].rating && <span className="me-3 text-brass" dir="ltr" aria-label={`${reviews[0].rating}/5`}>{"★".repeat(reviews[0].rating)}</span>}
                <span className="font-semibold text-graphite">{reviews[0].name}</span>{reviews[0].role && `${sep}${reviews[0].role}`}
              </figcaption>
            </figure>
            {reviews.length > 1 && (
              <div className="mt-12 grid gap-8 border-t border-graphite/15 pt-10 md:grid-cols-2">
                {reviews.slice(1).map((r) => (
                  <figure key={r.id}>
                    <blockquote className="text-lg leading-relaxed">{q[0]}{r.text}{q[1]}</blockquote>
                    <figcaption className="mt-3 text-sm text-muted">{r.rating && <span className="me-2 text-brass" dir="ltr" aria-label={`${r.rating}/5`}>{"★".repeat(r.rating)}</span>}<span className="font-semibold text-graphite">{r.name}</span>{r.role && `${sep}${r.role}`}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Booking */}
      {cfg.show.booking && (
      <section id="book" className="bg-graphite text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-12 md:py-24">
          <div className="md:col-span-5">
            <h2 className="display text-4xl md:text-5xl">{t.site.cta.title}</h2>
            <p className="mt-5 max-w-md text-lg text-white/65">{t.site.cta.sub}</p>
            <div className="mt-8 space-y-1 text-lg" dir="ltr">
              {[s.phone1, s.phone2].filter(Boolean).map((p) => (
                <a key={p} href={`tel:${p.replace(/\s/g, "")}`} className="block w-fit hover:text-brass rtl:ms-auto">{p}</a>
              ))}
            </div>
          </div>
          <div className="md:col-span-7">
            <BookingForm locale={locale} labels={t.site.contact} products={SITE_PRODUCTS.map((k) => [k, t.products[k]])} dark />
          </div>
        </div>
      </section>
      )}
    </>
  );
}
