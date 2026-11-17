import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { getFaqs, getSiteConfig, getSiteDict } from "@/lib/content";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getSiteDict(locale)).site.about.title };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = (await getSiteDict(locale));
  const a = t.site.about;
  const cfg = (await getSiteConfig());
  const faqs = (await getFaqs(locale)) as { id: number; q: string; a: string }[];
  const q = locale === "en" ? ["“", "”"] : ["«", "»"];

  return (
    <>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-12 md:pt-16">
        <div className="md:col-span-7">
          <h1 className="display text-5xl md:text-7xl">{a.title}</h1>
          <p className="mt-8 max-w-2xl text-2xl leading-snug">{a.lead}</p>
          {a.body.filter(Boolean).map((p, i) => (
            <p key={i} className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{p}</p>
          ))}
        </div>
        {cfg.images.about && (
          <div className="md:col-span-4 md:col-start-9">
            <img src={cfg.images.about} alt="" className="aspect-[3/4] w-full rounded-sm object-cover" />
          </div>
        )}
      </section>

      <section className="border-y border-line bg-stone/60">
        <dl className="mx-auto grid max-w-7xl gap-px px-4 sm:px-6 md:grid-cols-3">
          {a.values.filter((v) => v.t).map((v) => (
            <div key={v.t} className="py-10 md:pe-10">
              <dt className="text-xl font-semibold">{v.t}</dt>
              <dd className="mt-2 text-muted">{v.d}</dd>
            </div>
          ))}
        </dl>
      </section>

      {cfg.show.owner && (
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-12">
          {cfg.images.owner && <img src={cfg.images.owner} alt={a.ownerName} className="aspect-square w-48 rounded-full object-cover md:col-span-3 md:w-full md:max-w-[260px]" />}
          <figure className="md:col-span-8 md:col-start-5">
            <h2 className="text-sm text-muted">{a.ownerTitle}</h2>
            <blockquote className="display mt-3 text-3xl !leading-tight md:text-4xl">{q[0]}{a.ownerText}{q[1]}</blockquote>
            <figcaption className="mt-5"><span className="font-semibold">{a.ownerName}</span> <span className="text-muted">— {a.ownerRole}</span></figcaption>
          </figure>
        </section>
      )}

      <section className={`mx-auto max-w-4xl px-4 pb-24 sm:px-6 ${cfg.show.owner ? "" : "pt-20"}`}>
        {cfg.show.faq && faqs.length > 0 && (
          <>
            <h2 className="display text-4xl">{a.faqTitle}</h2>
            <div className="mb-10 mt-8 border-t border-graphite">
              {faqs.map((f) => (
                <details key={f.id} className="group border-b border-line">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <Plus size={20} className="shrink-0 text-muted transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="max-w-2xl whitespace-pre-line pb-6 leading-relaxed text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </>
        )}
        <Link href={`/${locale}/contact#book`} className="btn btn-primary px-6 py-3.5 text-base">{t.site.cta.button}</Link>
      </section>
    </>
  );
}
