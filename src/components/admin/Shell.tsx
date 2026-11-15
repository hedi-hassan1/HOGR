"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, LayoutTemplate, Users, CalendarRange, HardHat, BarChart3, Tags, CalendarDays, Ruler, ClipboardList, Wallet, Receipt, Boxes, Inbox, Images, Settings, LogOut, Globe, Menu, X,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { LangSwitch } from "@/components/site/Header";
import { logout } from "@/app/[locale]/admin/actions";
import { PwaClient } from "./Pwa";

type Nav = Record<string, string>;

const ITEMS = [
  { key: "dashboard", href: "", icon: LayoutDashboard, group: "" },
  { key: "clients", href: "/clients", icon: Users, group: "groupWork" },
  { key: "calendar", href: "/calendar", icon: CalendarRange, group: "" },
  { key: "bookings", href: "/bookings", icon: CalendarDays, group: "" },
  { key: "measurements", href: "/measurements", icon: Ruler, group: "" },
  { key: "orders", href: "/orders", icon: ClipboardList, group: "" },
  { key: "prices", href: "/prices", icon: Tags, group: "" },
  { key: "payments", href: "/payments", icon: Wallet, group: "" },
  { key: "expenses", href: "/expenses", icon: Receipt, group: "" },
  { key: "inventory", href: "/inventory", icon: Boxes, group: "" },
  { key: "workers", href: "/workers", icon: HardHat, group: "" },
  { key: "reports", href: "/reports", icon: BarChart3, group: "" },
  { key: "site", href: "/website", icon: LayoutTemplate, group: "groupSite" },
  { key: "portfolio", href: "/portfolio", icon: Images, group: "" },
  { key: "leads", href: "/leads", icon: Inbox, group: "" },
  { key: "settings", href: "/settings", icon: Settings, group: "-" },
] as const;

export function Shell({ locale, nav, userName, newLeads, overdue = 0, debts = 0, children }: { locale: string; nav: Nav; userName: string; newLeads: number; overdue?: number; debts?: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const base = `/${locale}/admin`;
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === "" ? pathname === base : pathname.startsWith(base + href));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Link href={base}><Logo light height={30} /></Link>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {ITEMS.map(({ key, href, icon: Icon, group }) => (
          <div key={key}>
          {group && group !== "-" && <p className="px-3 pb-1.5 pt-5 text-xs text-white/35">{nav[group]}</p>}
          {group === "-" && <div className="mx-3 my-3 border-t border-white/10" />}
          <Link
            href={base + href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] ${isActive(href) ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/6 hover:text-white"}`}
          >
            <Icon size={18} className={isActive(href) ? "text-brass" : ""} />
            <span className="flex-1">{nav[key]}</span>
            {key === "leads" && newLeads > 0 && <span className="rounded-full bg-brass px-2 text-xs font-semibold text-white">{newLeads}</span>}
            {key === "measurements" && overdue > 0 && <span className="rounded-full bg-bad px-2 text-xs font-semibold text-white">{overdue}</span>}
            {key === "payments" && debts > 0 && <span className="rounded-full bg-bad px-2 text-xs font-semibold text-white">{debts}</span>}
          </Link>
          </div>
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3">
        <Link href={`/${locale}`} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/6 hover:text-white">
          <Globe size={17} /> {nav.website}
        </Link>
        <form action={logout}>
          <input type="hidden" name="locale" value={locale} />
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/6 hover:text-white">
            <LogOut size={17} className="rtl:-scale-x-100" /> {nav.logout}
            <span className="ms-auto truncate text-xs text-white/35">{userName}</span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-[#f3f3f1]">
      <PwaClient badge={newLeads + overdue + debts} />
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 bg-graphite lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 max-w-[85vw] bg-graphite">
            <button onClick={() => setOpen(false)} className="absolute end-3 top-4 p-1 text-white/70" aria-label="Close"><X /></button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="lg:ps-64">
        <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-[#f3f3f1]/90 px-4 backdrop-blur md:px-8">
          <button onClick={() => setOpen(true)} className="-ms-1 p-1 lg:hidden" aria-label="Menu"><Menu /></button>
          <span className="lg:hidden"><Logo height={24} /></span>
          <LangSwitch locale={locale} className="ms-auto" />
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
