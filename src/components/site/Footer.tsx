import Link from "next/link";
import { Logo } from "@/components/Logo";
import type { Dict } from "@/lib/i18n";

export function Footer({ locale, t, s }: { locale: string; t: Dict; s: Record<string, string> }) {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-graphite text-white/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo light height={44} />
          <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-white/60">{t.site.footer.blurb}</p>
        </div>
        <div>
          <h3 className="mb-3 text-sm text-white/50">{t.site.contact.location}</h3>
          <p className="text-[15px]">{s.address}</p>
          <h3 className="mb-3 mt-6 text-sm text-white/50">{t.site.contact.hours}</h3>
          <p className="text-[15px]">{t.site.contact.hoursValue}</p>
        </div>
        <div>
          <h3 className="mb-3 text-sm text-white/50">{t.site.contact.call}</h3>
          <ul className="space-y-1.5 text-[15px]" dir="ltr">
            {[s.phone1, s.phone2].filter(Boolean).map((p) => (
              <li key={p} className="text-start rtl:text-end">
                <a href={`tel:${p.replace(/\s/g, "")}`} className="hover:text-white">{p}</a>
              </li>
            ))}
            {s.email && (
              <li className="text-start rtl:text-end">
                <a href={`mailto:${s.email}`} className="break-all hover:text-white">{s.email}</a>
              </li>
            )}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm text-white/50">{t.site.nav.home}</h3>
          <ul className="space-y-1.5 text-[15px]">
            <li><Link className="hover:text-white" href={`/${locale}/work`}>{t.site.nav.work}</Link></li>
            <li><Link className="hover:text-white" href={`/${locale}/about`}>{t.site.nav.about}</Link></li>
            <li><Link className="hover:text-white" href={`/${locale}/contact`}>{t.site.nav.contact}</Link></li>
            {s.facebook && <li><a className="hover:text-white" href={s.facebook} target="_blank" rel="noreferrer">Facebook</a></li>}
            {s.instagram && <li><a className="hover:text-white" href={s.instagram} target="_blank" rel="noreferrer">Instagram</a></li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm text-white/45 sm:px-6">
          <span>© {year} HOGR CO. {t.site.footer.rights}</span>
          <Link href={`/${locale}/admin`} className="hover:text-white">{t.site.footer.staff}</Link>
        </div>
      </div>
    </footer>
  );
}
