import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { orderByToken } from "@/lib/extras";
import { ReviewForm } from "@/components/site/ClientActions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** The client rates the work (sent after installation). */
export default async function ReviewPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  const t = getDict(locale);
  const L = t.site.review;
  const o = (await orderByToken(token));
  if (!o) return <section className="mx-auto max-w-2xl px-4 py-24 text-center text-lg text-muted">{t.site.client.invalid}</section>;
  const already = !!await db().prepare("SELECT 1 FROM reviews WHERE order_id = ?").get(o.id);

  return (
    <section className="mx-auto max-w-xl px-4 pb-24 pt-12 sm:px-6">
      <h1 className="display text-4xl md:text-5xl">{L.title}</h1>
      <p className="mb-8 mt-4 text-lg text-muted">{L.sub}</p>
      {already ? <p className="rounded-xl bg-stone p-5 text-lg">{L.already}</p> : <ReviewForm token={token} locale={locale} defaultName={o.cname} L={L} />}
    </section>
  );
}
