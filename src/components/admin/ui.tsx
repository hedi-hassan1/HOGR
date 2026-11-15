import Link from "next/link";
import { money } from "@/lib/format";

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold md:text-[28px]">{title}</h1>
        {sub && <p className="mt-1 text-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className = "", pad = true }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`rounded-xl border border-line bg-white ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="font-semibold">{title}</h2>
          {action}
        </div>
      )}
      <div className={pad ? "p-5" : ""}>{children}</div>
    </section>
  );
}

const TONES: Record<string, string> = {
  gray: "bg-stone text-graphite",
  blue: "bg-[#e3edf0] text-[#2c5a66]",
  amber: "bg-[#f7ecd7] text-[#8a5a12]",
  green: "bg-[#dff0e6] text-[#23633f]",
  red: "bg-[#f6e1df] text-[#9a332c]",
  brass: "bg-brass-soft text-[#7a5a28]",
  dark: "bg-graphite text-white",
};

export const STATUS_TONE: Record<string, keyof typeof TONES> = {
  quote: "gray", confirmed: "blue", production: "amber", ready: "brass", installed: "green", completed: "dark", cancelled: "red",
  scheduled: "blue", done: "green",
  new: "amber", contacted: "blue", converted: "green", closed: "gray",
};

export function Badge({ tone = "gray", children }: { tone?: keyof typeof TONES | string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12.5px] font-medium ${TONES[tone] || TONES.gray}`}>{children}</span>;
}

export function Empty({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
      <p className="max-w-sm text-muted">{text}</p>
      {children}
    </div>
  );
}

export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function Select({ name, options, defaultValue, required, className = "", placeholder }: { name: string; options: [string | number, string][]; defaultValue?: string | number | null; required?: boolean; className?: string; placeholder?: string }) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} required={required} className={`input ${className}`}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: "bad" | "ok" }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={`num mt-2 text-2xl font-bold md:text-[26px] ${tone === "bad" ? "text-bad" : tone === "ok" ? "text-ok" : ""}`} dir="ltr" style={{ textAlign: "start" }}>
        <bdi dir="ltr">{value}</bdi>
      </p>
    </div>
  );
}

export function Tabs({ items, active }: { items: { href: string; label: string; key: string; count?: number }[]; active: string }) {
  return (
    <div className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1">
      {items.map((i) => (
        <Link key={i.key} href={i.href} className={`shrink-0 rounded-lg px-3 py-1.5 text-sm ${active === i.key ? "bg-graphite text-white" : "text-muted hover:bg-stone"}`}>
          {i.label}
          {i.count !== undefined && <span className="ms-1.5 opacity-60">{i.count}</span>}
        </Link>
      ))}
    </div>
  );
}

export function Money({ v, cur, locale, className = "" }: { v: number; cur: string; locale: string; className?: string }) {
  return <bdi dir="ltr" className={`num whitespace-nowrap ${className}`}>{money(v, cur, locale)}</bdi>;
}

export function Hidden({ values }: { values: Record<string, string | number | undefined | null> }) {
  return (
    <>
      {Object.entries(values).map(([k, v]) => (v === undefined || v === null ? null : <input key={k} type="hidden" name={k} value={v} />))}
    </>
  );
}
