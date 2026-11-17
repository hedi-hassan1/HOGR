import type { Metadata } from "next";
import { Clock, Mail, Map as MapIcon, MapPin, MessageCircle, Phone } from "lucide-react";
import { SITE_PRODUCTS } from "@/lib/i18n";
import { getSiteConfig, getSiteDict } from "@/lib/content";
import { getSettings } from "@/lib/db";
import { BookingForm } from "@/components/site/BookingForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getSiteDict(locale)).site.contact.title };
}

const MAP =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d25754.36972185636!2d44.806784739550785!3d36.207994499999984!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x400149bafec46631%3A0x3176c6721f8470ad!2z2qnYp9ix2q_blduMINq-24bar9ix!5e0!3m2!1sen!2siq!4v1757615864170!5m2!1sen!2siq";

export default async function ContactPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ service?: string; msg?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = (await getSiteDict(locale));
  const c = t.site.contact;
  const s = (await getSettings(locale));

  const rows = [
    { icon: Phone, label: c.call, value: [s.phone1, s.phone2].filter(Boolean), href: (v: string) => `tel:${v.replace(/\s/g, "")}`, ltr: true },
    s.whatsapp && { icon: MessageCircle, label: c.whatsapp, value: [`+${s.whatsapp}`], href: () => `https://wa.me/${s.whatsapp}`, ltr: true },
    s.email && { icon: Mail, label: c.email, value: [s.email], href: (v: string) => `mailto:${v}`, ltr: true },
    { icon: MapPin, label: c.location, value: [s.address] },
    { icon: Clock, label: c.hours, value: [c.hoursValue] },
    { icon: MapIcon, label: c.areasLabel, value: [c.areasValue] },
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string[]; href?: (v: string) => string; ltr?: boolean }[];

  return (
    <>
      <section className="mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-12 md:pt-16">
        <div className="md:col-span-5">
          <h1 className="display text-5xl md:text-7xl">{c.title}</h1>
          <p className="mt-5 max-w-md text-lg text-muted">{c.sub}</p>
          <dl className="mt-10 border-t border-graphite">
            {rows.map((r) => (
              <div key={r.label} className="flex gap-4 border-b border-line py-4">
                <r.icon size={20} className="mt-0.5 shrink-0 text-brass" />
                <div>
                  <dt className="text-sm text-muted">{r.label}</dt>
                  {r.value.map((v) => (
                    <dd key={v} className="text-lg" dir={r.ltr ? "ltr" : undefined}>
                      {r.href ? <a href={r.href(v)} className="hover:text-brass" target={r.href(v).startsWith("http") ? "_blank" : undefined} rel="noreferrer">{v}</a> : v}
                    </dd>
                  ))}
                </div>
              </div>
            ))}
          </dl>
        </div>
        <div id="book" className="scroll-mt-24 md:col-span-6 md:col-start-7">
          <div className="rounded-lg border border-line bg-white p-6 sm:p-8">
            <h2 className="mb-6 text-2xl font-semibold">{c.formTitle}</h2>
            <BookingForm locale={locale} labels={c} products={SITE_PRODUCTS.map((k) => [k, t.products[k]])} defaultService={sp.service} defaultMessage={sp.msg?.slice(0, 300)} />
          </div>
        </div>
      </section>
      {(await getSiteConfig()).show.map && <iframe src={MAP} title={c.location} className="block h-[420px] w-full border-0 grayscale-[60%]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />}
    </>
  );
}
