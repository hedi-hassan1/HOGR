import Link from "next/link";
import type { Metadata } from "next";
import { SITE_PRODUCTS } from "@/lib/i18n";
import { getSiteDict } from "@/lib/content";
import { getPortfolio, titleFor } from "@/lib/site";
import { Gallery } from "@/components/site/Gallery";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getSiteDict(locale).site.work.title };
}

export default async function WorkPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ c?: string }> }) {
  const { locale } = await params;
  const { c } = await searchParams;
  const t = getSiteDict(locale);
  const active = c && (SITE_PRODUCTS as readonly string[]).includes(c) ? c : undefined;
  const items = getPortfolio({ category: active });

  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 md:pt-16">
      <h1 className="display text-5xl md:text-7xl">{t.site.work.title}</h1>
      <p className="mt-4 max-w-xl text-lg text-muted">{t.site.work.sub}</p>

      <nav className="-mx-4 mt-10 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0" aria-label={t.site.work.title}>
        {[{ k: undefined, label: t.site.work.all }, ...SITE_PRODUCTS.map((k) => ({ k, label: t.products[k] }))].map(({ k, label }) => (
          <Link
            key={k ?? "all"}
            href={k ? `/${locale}/work?c=${k}` : `/${locale}/work`}
            scroll={false}
            className={`shrink-0 rounded-full border px-4 py-2 text-[15px] ${active === k ? "border-graphite bg-graphite text-white" : "border-line text-muted hover:border-graphite hover:text-graphite"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className="mt-16 text-lg text-muted">{t.site.work.empty}</p>
      ) : (
        <Gallery items={items.map((p) => ({ id: p.id, src: p.image, before: p.before_image, title: titleFor(p, locale), cat: t.products[p.category as keyof typeof t.products] }))} ba={t.site.ba} />
      )}
    </section>
  );
}
