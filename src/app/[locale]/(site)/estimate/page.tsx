import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { SITE_PRODUCTS } from "@/lib/i18n";
import { getSiteDict } from "@/lib/content";
import { getPrices, priceName } from "@/lib/extras";
import { Estimator } from "@/components/site/Estimator";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getSiteDict(locale)).site.estimate.title };
}

export default async function EstimatePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = (await getSiteDict(locale));
  const s = (await getSettings());
  const prices = (await getPrices()).filter((p) => p.on_site && p.price > 0);
  // Only offer products that have at least one public price
  const products = SITE_PRODUCTS.filter((k) => prices.some((p) => p.product_type === k)).map((k) => [k, t.products[k]] as [string, string]);
  const cur = s.currency || "IQD";

  return (
    <section className="mx-auto max-w-5xl px-4 pb-24 pt-12 sm:px-6 md:pt-16">
      <h1 className="display text-5xl md:text-6xl">{t.site.estimate.title}</h1>
      <p className="mb-10 mt-4 max-w-xl text-lg text-muted">{t.site.estimate.sub}</p>
      <Estimator
        locale={locale}
        products={products}
        prices={prices.map((p) => ({ id: p.id, type: p.product_type, label: priceName(p, locale), unit: p.unit, price: p.price }))}
        L={t.site.estimate}
        cur={cur}
        curLabel={cur === "IQD" ? (locale === "en" ? "IQD" : "د.ع") : "$"}
        low={Number(s.estimate_low) || 0.9}
        high={Number(s.estimate_high) || 1.2}
      />
    </section>
  );
}
