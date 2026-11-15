"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type P = { id: number; type: string; label: string; unit: "piece" | "m2" | "m"; price: number };
type L = { product: string; option: string; width: string; height: string; length: string; qty: string; result: string; range: string; note: string; book: string; none: string };

const round = (n: number, cur: string) => (cur === "USD" ? Math.round(n / 10) * 10 : Math.round(n / 5000) * 5000);

export function Estimator({ locale, products, prices, L, cur, curLabel, low, high }: {
  locale: string; products: [string, string][]; prices: P[]; L: L; cur: string; curLabel: string; low: number; high: number;
}) {
  const [type, setType] = useState(products[0]?.[0] ?? "window");
  const options = prices.filter((p) => p.type === type);
  const [pid, setPid] = useState<number | null>(options[0]?.id ?? null);
  const [w, setW] = useState("");
  const [h, setH] = useState("");
  const [q, setQ] = useState("1");
  const p = options.find((x) => x.id === pid) || options[0];

  const total = useMemo(() => {
    if (!p) return 0;
    const qty = Math.max(1, Number(q) || 1);
    if (p.unit === "m2") return ((Number(w) || 0) / 100) * ((Number(h) || 0) / 100) * p.price * qty;
    if (p.unit === "m") return ((Number(w) || 0) / 100) * p.price * qty;
    return p.price * qty;
  }, [p, w, h, q]);

  const fmt = (n: number) => {
    const s = new Intl.NumberFormat("en-US").format(round(n, cur));
    return cur === "USD" ? `$${s}` : `${s} ${curLabel}`;
  };
  const message = p ? `${p.label}${w ? ` · ${w}${p.unit === "m2" && h ? `×${h}` : ""} cm` : ""}${Number(q) > 1 ? ` × ${q}` : ""}` : "";

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-4">
        <div>
          <span className="label">{L.product}</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {products.map(([k, label]) => (
              <button key={k} type="button" onClick={() => { setType(k); setPid(prices.find((x) => x.type === k)?.id ?? null); }}
                className={`rounded-lg border px-3 py-2.5 text-start text-[15px] ${type === k ? "border-graphite bg-graphite text-white" : "border-line bg-white hover:border-graphite"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {options.length > 1 && (
          <label className="block">
            <span className="label">{L.option}</span>
            <select className="input" value={p?.id} onChange={(e) => setPid(Number(e.target.value))}>
              {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
        )}
        {p && p.unit !== "piece" && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="label">{p.unit === "m" ? L.length : L.width}</span><input inputMode="numeric" dir="ltr" value={w} onChange={(e) => setW(e.target.value.replace(/[^\d.]/g, ""))} className="input num text-lg" placeholder={p.unit === "m" ? "400" : "180"} /></label>
            {p.unit === "m2" && <label className="block"><span className="label">{L.height}</span><input inputMode="numeric" dir="ltr" value={h} onChange={(e) => setH(e.target.value.replace(/[^\d.]/g, ""))} className="input num text-lg" placeholder="150" /></label>}
          </div>
        )}
        {p && (
          <label className="block w-32"><span className="label">{L.qty}</span><input inputMode="numeric" dir="ltr" value={q} onChange={(e) => setQ(e.target.value.replace(/\D/g, ""))} className="input num text-lg" /></label>
        )}
      </div>

      <div className="flex flex-col justify-between rounded-2xl bg-graphite p-6 text-white">
        {!p ? (
          <p className="text-white/70">{L.none}</p>
        ) : (
          <div aria-live="polite">
            <p className="text-sm text-white/60">{L.result}</p>
            <p className="display mt-3 text-3xl md:text-4xl" dir="ltr" style={{ textAlign: "start" }}>
              {total > 0 ? L.range.replace("{low}", fmt(total * low)).replace("{high}", fmt(total * high)) : "—"}
            </p>
            <p className="mt-4 text-sm text-white/60">{L.note}</p>
          </div>
        )}
        <Link
          href={`/${locale}/contact?service=${type}${message ? `&msg=${encodeURIComponent(message)}` : ""}#book`}
          className="btn mt-8 bg-brass py-3.5 text-base text-white hover:bg-[#8d6b36]"
        >
          {L.book}
        </Link>
      </div>
    </div>
  );
}
