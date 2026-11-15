"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";

type Nav = { home: string; work: string; about: string; contact: string; book: string; estimate: string };

const LANGS = [
  { code: "ckb", label: "کوردی" },
  { code: "ar", label: "عربي" },
  { code: "en", label: "EN" },
];

export function LangSwitch({ locale, className = "" }: { locale: string; className?: string }) {
  const pathname = usePathname();
  const rest = pathname.split("/").slice(2).join("/");
  return (
    <div className={`flex items-center gap-1 text-sm ${className}`}>
      {LANGS.map((l) => (
        <Link
          key={l.code}
          href={`/${l.code}${rest ? "/" + rest : ""}`}
          onClick={() => (document.cookie = `hogr_locale=${l.code};path=/;max-age=31536000`)}
          className={`rounded-md px-2 py-1 ${l.code === locale ? "bg-graphite text-white" : "text-muted hover:bg-stone"}`}
          aria-current={l.code === locale ? "true" : undefined}
          lang={l.code === "ckb" ? "ckb" : l.code}
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}

export function Header({ locale, nav }: { locale: string; nav: Nav }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = [
    { href: `/${locale}`, label: nav.home },
    { href: `/${locale}/work`, label: nav.work },
    { href: `/${locale}/estimate`, label: nav.estimate },
    { href: `/${locale}/about`, label: nav.about },
    { href: `/${locale}/contact`, label: nav.contact },
  ];
  const isActive = (href: string) => (href === `/${locale}` ? pathname === href : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href={`/${locale}`} aria-label="HOGR CO." className="shrink-0">
          <Logo height={32} />
        </Link>
        <nav className="ms-6 hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-2 text-[15px] ${isActive(l.href) ? "text-graphite" : "text-muted hover:text-graphite"}`}
            >
              <span className={isActive(l.href) ? "border-b-2 border-brass pb-1" : ""}>{l.label}</span>
            </Link>
          ))}
        </nav>
        <div className="ms-auto hidden items-center gap-4 md:flex">
          <LangSwitch locale={locale} />
          <Link href={`/${locale}/contact#book`} className="btn btn-primary">
            {nav.book}
          </Link>
        </div>
        <button className="ms-auto rounded-md p-2 md:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <div className="border-t border-line bg-paper px-4 pb-5 md:hidden">
          <nav className="flex flex-col py-2">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={`py-3 text-lg ${isActive(l.href) ? "font-semibold" : ""}`}>
                {l.label}
              </Link>
            ))}
          </nav>
          <LangSwitch locale={locale} className="mb-4" />
          <Link href={`/${locale}/contact#book`} onClick={() => setOpen(false)} className="btn btn-primary w-full">
            {nav.book}
          </Link>
        </div>
      )}
    </header>
  );
}
