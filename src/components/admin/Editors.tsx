"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Copy } from "lucide-react";
import { ItemSketch } from "./ItemSketch";

type Opt = [string, string];

/* ---------------- Measurement rows ---------------- */

export type MRow = { photo?: string; product_type: string; room: string; width: string; height: string; depth: string; qty: string; material: string; color: string; notes: string };
const emptyM = (type = "window"): MRow => ({ product_type: type, room: "", width: "", height: "", depth: "", qty: "1", material: "", color: "", notes: "" });

export function MeasurementEditor({ initial, products, L }: { initial: MRow[]; products: Opt[]; L: Record<string, string> }) {
  const [rows, setRows] = useState<MRow[]>(initial.length ? initial : [emptyM()]);
  const set = (i: number, k: keyof MRow, v: string) => setRows((r) => r.map((row, j) => (j === i ? { ...row, [k]: v } : row)));

  return (
    <div>
      <input type="hidden" name="items" value={JSON.stringify(rows)} />
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="flex gap-3 rounded-lg border border-line bg-[#fbfbfa] p-3">
            <div className="hidden w-24 shrink-0 flex-col items-center gap-2 sm:flex">
              <ItemSketch type={r.product_type} width={Number(r.width) || null} height={Number(r.height) || null} depth={Number(r.depth) || null} size={96} />
              {r.photo && (
                <a href={r.photo} target="_blank" rel="noreferrer"><img src={r.photo} alt="" className="h-16 w-20 rounded-md object-cover" /></a>
              )}
            </div>
            <div className="min-w-0 flex-1">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              <label className="col-span-2 sm:col-span-1 lg:col-span-1">
                <span className="label">{L.type}</span>
                <select className="input py-2" value={r.product_type} onChange={(e) => set(i, "product_type", e.target.value)}>
                  {products.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="col-span-2 sm:col-span-1 lg:col-span-1"><span className="label">{L.room}</span><input className="input py-2" value={r.room} onChange={(e) => set(i, "room", e.target.value)} /></label>
              {(["width", "height", "depth"] as const).map((k) => (
                <label key={k}><span className="label">{L[k]}</span><input className="input num py-2" inputMode="decimal" dir="ltr" value={r[k]} onChange={(e) => set(i, k, e.target.value)} /></label>
              ))}
              <label><span className="label">{L.qty}</span><input className="input num py-2" inputMode="numeric" dir="ltr" value={r.qty} onChange={(e) => set(i, "qty", e.target.value)} /></label>
              <label><span className="label">{L.material}</span><input className="input py-2" value={r.material} onChange={(e) => set(i, "material", e.target.value)} /></label>
              <label><span className="label">{L.color}</span><input className="input py-2" value={r.color} onChange={(e) => set(i, "color", e.target.value)} /></label>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input className="input flex-1 py-2" placeholder={L.notes} value={r.notes} onChange={(e) => set(i, "notes", e.target.value)} />
              <button type="button" title={L.copy} onClick={() => setRows((rs) => [...rs.slice(0, i + 1), { ...r }, ...rs.slice(i + 1)])} className="rounded-md p-2 text-muted hover:bg-stone"><Copy size={16} /></button>
              <button type="button" title={L.remove} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="rounded-md p-2 text-muted hover:bg-[#f8e9e7] hover:text-bad"><Trash2 size={16} /></button>
            </div>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setRows((r) => [...r, emptyM(r[r.length - 1]?.product_type)])} className="btn btn-ghost mt-3 bg-white">
        <Plus size={16} /> {L.add}
      </button>
    </div>
  );
}

/* ---------------- Order lines ---------------- */

export type ORow = { product_type: string; description: string; width: string; height: string; qty: string; unit: string; unit_price: string };
const emptyO = (): ORow => ({ product_type: "door", description: "", width: "", height: "", qty: "1", unit: "piece", unit_price: "" });

function lineTotal(r: ORow) {
  const w = (Number(r.width) || 0) / 100, h = (Number(r.height) || 0) / 100, q = Number(r.qty) || 0, p = Number(String(r.unit_price).replace(/,/g, "")) || 0;
  if (r.unit === "m2") return w * h * q * p;
  if (r.unit === "m") return w * q * p;
  return q * p;
}

export type PriceOpt = { id: number; type: string; label: string; unit: string; price: number };

export function OrderEditor({ initial, initialDiscount, products, units, L, fmt, prices = [] }: { initial: ORow[]; initialDiscount: number; products: Opt[]; units: Opt[]; L: Record<string, string>; fmt: { cur: string; label: string }; prices?: PriceOpt[] }) {
  const [rows, setRows] = useState<ORow[]>(initial.length ? initial : [emptyO()]);
  const [discount, setDiscount] = useState(initialDiscount ? String(initialDiscount) : "");
  const set = (i: number, k: keyof ORow, v: string) => setRows((r) => r.map((row, j) => (j === i ? { ...row, [k]: v } : row)));
  const subtotal = useMemo(() => rows.reduce((s, r) => s + lineTotal(r), 0), [rows]);
  const total = Math.max(0, subtotal - (Number(discount.replace(/,/g, "")) || 0));
  const f = (n: number) => {
    const s = new Intl.NumberFormat("en-US", { maximumFractionDigits: fmt.cur === "USD" ? 2 : 0 }).format(n);
    return fmt.cur === "USD" ? `$${s}` : `${s} ${fmt.label}`;
  };

  return (
    <div>
      <input type="hidden" name="items" value={JSON.stringify(rows)} />
      <input type="hidden" name="discount" value={discount.replace(/,/g, "")} />
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="rounded-lg border border-line bg-[#fbfbfa] p-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-[1.1fr_2fr_.8fr_.8fr_.6fr_.8fr_1.1fr]">
              <label>
                <span className="label">{L.type}</span>
                <select className="input py-2" value={r.product_type} onChange={(e) => set(i, "product_type", e.target.value)}>
                  {products.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="sm:col-span-3 lg:col-span-1"><span className="label">{L.description}</span><input className="input py-2" value={r.description} onChange={(e) => set(i, "description", e.target.value)} /></label>
              <label><span className="label">{L.width}</span><input className="input num py-2" inputMode="decimal" dir="ltr" value={r.width} onChange={(e) => set(i, "width", e.target.value)} /></label>
              <label><span className="label">{L.height}</span><input className="input num py-2" inputMode="decimal" dir="ltr" value={r.height} onChange={(e) => set(i, "height", e.target.value)} /></label>
              <label><span className="label">{L.qty}</span><input className="input num py-2" inputMode="decimal" dir="ltr" value={r.qty} onChange={(e) => set(i, "qty", e.target.value)} /></label>
              <label>
                <span className="label">{L.unit}</span>
                <select className="input py-2" value={r.unit} onChange={(e) => set(i, "unit", e.target.value)}>
                  {units.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label><span className="label">{L.unitPrice}</span><input className="input num py-2" inputMode="decimal" dir="ltr" value={r.unit_price} onChange={(e) => set(i, "unit_price", e.target.value)} /></label>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="flex flex-wrap items-center gap-3 text-xs text-muted">
                {prices.some((p) => p.type === r.product_type) && (
                  <select
                    className="input w-auto py-1 text-xs"
                    value=""
                    aria-label={L.pick}
                    onChange={(e) => {
                      const p = prices.find((x) => x.id === Number(e.target.value));
                      if (p) setRows((rs) => rs.map((row, j) => (j === i ? { ...row, unit: p.unit, unit_price: String(p.price), description: row.description || p.label } : row)));
                    }}
                  >
                    <option value="">{L.pick}…</option>
                    {prices.filter((p) => p.type === r.product_type).map((p) => <option key={p.id} value={p.id}>{p.label} · {p.price.toLocaleString("en-US")}</option>)}
                  </select>
                )}
                {r.unit === "m2" && r.width && r.height ? `${((Number(r.width) * Number(r.height)) / 10000).toFixed(2)} m² × ${r.qty || 0}` : r.unit === "m" && r.width ? `${(Number(r.width) / 100).toFixed(2)} m × ${r.qty || 0}` : ""}
              </span>
              <div className="flex items-center gap-2">
                <span className="num font-semibold" dir="ltr">{f(lineTotal(r))}</span>
                <button type="button" title={L.remove} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="rounded-md p-2 text-muted hover:bg-[#f8e9e7] hover:text-bad"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <button type="button" onClick={() => setRows((r) => [...r, emptyO()])} className="btn btn-ghost bg-white"><Plus size={16} /> {L.add}</button>
          <p className="mt-2 text-xs text-muted">{L.unitHint}</p>
        </div>
        <dl className="w-full max-w-xs space-y-2 text-[15px]">
          <div className="flex justify-between gap-4"><dt className="text-muted">{L.subtotal}</dt><dd className="num" dir="ltr">{f(subtotal)}</dd></div>
          <div className="flex items-center justify-between gap-4"><dt className="text-muted">{L.discount}</dt><dd><input className="input num w-36 py-1.5" inputMode="decimal" dir="ltr" value={discount} onChange={(e) => setDiscount(e.target.value)} /></dd></div>
          <div className="flex justify-between gap-4 border-t border-line pt-2 text-lg font-bold"><dt>{L.total}</dt><dd className="num" dir="ltr">{f(total)}</dd></div>
        </dl>
      </div>
    </div>
  );
}
