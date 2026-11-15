"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import {
  AppWindow, Bath, BedDouble, Bluetooth, BluetoothConnected, Box, Camera, Check, CookingPot, DoorOpen, Minus, Plus, ScanLine, Shirt, Sparkles, X,
} from "lucide-react";
import type { Dict } from "@/lib/i18n";
import { connectLaser, laserSupported, type LaserConnection } from "@/lib/laser";
import { arSupported, startAr, type ArController, type ArState } from "@/lib/ar-measure";
import { addMeasurementItem, uploadItemPhoto } from "@/app/[locale]/admin/actions";
import { ItemSketch } from "./ItemSketch";

type L = Dict["admin"]["measure"];
type FieldKey = "width" | "height" | "depth";
type FieldState = { readings: number[]; typed: string };

const ICONS: Record<string, typeof DoorOpen> = { door: DoorOpen, window: AppWindow, kitchen: CookingPot, wardrobe: Shirt, bathroom: Bath, vanity: Sparkles, bed_panel: BedDouble, other: Box };
const NEEDS_DEPTH = ["kitchen", "wardrobe", "bathroom", "vanity"];
const THREE_DEFAULT = ["door", "window"];
const emptyField = (): FieldState => ({ readings: [], typed: "" });
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Downscales a phone photo before upload (faster on mobile data). */
async function compress(file: File): Promise<Blob> {
  try {
    const img = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b || file), "image/jpeg", 0.82));
  } catch {
    return file;
  }
}

export function MeasureMode({ measurementId, clientName, initialCount, products, L, startOpen }: { measurementId: number; clientName: string; initialCount: number; products: [string, string][]; L: L; startOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(!!startOpen);
  const [count, setCount] = useState(initialCount);

  const [type, setType] = useState<string | null>(null);
  const [room, setRoom] = useState("");
  const [qty, setQty] = useState(1);
  const [material, setMaterial] = useState("");
  const [color, setColor] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [fields, setFields] = useState<Record<FieldKey, FieldState>>({ width: emptyField(), height: emptyField(), depth: emptyField() });
  const [active, setActive] = useState<FieldKey>("width");
  const [three, setThree] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const [laser, setLaser] = useState<LaserConnection | null>(null);
  const [laserBusy, setLaserBusy] = useState(false);
  const [lastReading, setLastReading] = useState<number | null>(null);
  const [flash, setFlash] = useState<FieldKey | null>(null);

  const [ar, setAr] = useState<{ field: FieldKey; state: ArState | null } | null>(null);
  const arCtl = useRef<ArController | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const needsDepth = !!type && NEEDS_DEPTH.includes(type);
  const order: FieldKey[] = needsDepth ? ["width", "height", "depth"] : ["width", "height"];

  const valueOf = (f: FieldState): number | null => {
    if (f.typed.trim()) {
      const n = Number(f.typed.replace(",", "."));
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    if (!f.readings.length) return null;
    return three ? Math.min(...f.readings) : f.readings[f.readings.length - 1];
  };
  const width = valueOf(fields.width), height = valueOf(fields.height), depth = needsDepth ? valueOf(fields.depth) : null;

  // Laser readings arrive outside React's event flow; keep the handler current via a ref.
  const onReading = useRef<(m: number) => void>(() => {});
  onReading.current = (metres: number) => {
    const cm = r1(metres * 100);
    setLastReading(cm);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(35);
    const f = fields[active];
    const readings = [...f.readings, cm];
    setFields((prev) => ({ ...prev, [active]: { readings, typed: "" } }));
    setFlash(active);
    setTimeout(() => setFlash(null), 450);
    if (!three || readings.length >= 3) {
      const next = order[order.indexOf(active) + 1];
      if (next) setActive(next);
    }
  };

  useEffect(() => () => { laser?.disconnect(); arCtl.current?.end(); }, [laser]);

  const chooseType = (k: string) => {
    setType(k);
    setThree(THREE_DEFAULT.includes(k));
    setActive("width");
  };

  const connect = async () => {
    setMsg(null);
    // Practice mode without a device: open the page with ?laser=demo, then call window.hogrDemoLaser(metres)
    if (new URLSearchParams(window.location.search).get("laser") === "demo") {
      (window as unknown as { hogrDemoLaser: (m: number) => void }).hogrDemoLaser = (m) => onReading.current(m);
      return setLaser({ name: "Demo laser", brand: "bosch", disconnect: () => {} });
    }
    if (!laserSupported()) return setMsg({ tone: "bad", text: L.laser.unsupported });
    setLaserBusy(true);
    try {
      const c = await connectLaser((m) => onReading.current(m), () => {
        setLaser(null);
        setMsg({ tone: "bad", text: L.laser.lost });
      });
      setLaser(c);
    } catch (e) {
      const name = (e as Error)?.name;
      if (name !== "NotFoundError") setMsg({ tone: "bad", text: (e as Error)?.message === "unsupported" ? L.laser.unknown : L.laser.failed });
    } finally {
      setLaserBusy(false);
    }
  };

  const openAr = async (field: FieldKey) => {
    setMsg(null);
    if (!(await arSupported())) return setMsg({ tone: "bad", text: L.ar.unsupported });
    flushSync(() => setAr({ field, state: null }));
    try {
      arCtl.current = await startAr(overlayRef.current!, (state) => setAr((a) => (a ? { ...a, state } : a)), () => {
        arCtl.current = null;
        setAr(null);
      });
    } catch {
      setAr(null);
      setMsg({ tone: "bad", text: L.ar.unsupported });
    }
  };

  const useAr = () => {
    const cm = ar?.state?.liveCm;
    if (ar && cm && ar.state?.points.length === 2) {
      setFields((prev) => ({ ...prev, [ar.field]: { readings: [r1(cm)], typed: "" } }));
      const next = order[order.indexOf(ar.field) + 1];
      if (next) setActive(next);
    }
    arCtl.current?.end();
  };

  const takePhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    try {
      const fd = new FormData();
      fd.append("photo", new File([await compress(file)], "photo.jpg", { type: "image/jpeg" }));
      const res = await uploadItemPhoto(fd);
      if (res.ok) setPhoto(res.path);
    } finally {
      setPhotoBusy(false);
      if (photoInput.current) photoInput.current.value = "";
    }
  };

  const save = async () => {
    if (!type) return setMsg({ tone: "bad", text: L.what });
    if (!width || !height) return setMsg({ tone: "bad", text: L.needSize });
    setSaving(true);
    setMsg(null);
    try {
      const res = await addMeasurementItem(measurementId, { product_type: type, room, width, height, depth, qty, material, color, notes, photo });
      if (!res.ok) throw new Error();
      setCount(res.count);
      setFields({ width: emptyField(), height: emptyField(), depth: emptyField() });
      setNotes("");
      setPhoto(null);
      setQty(1);
      setActive("width");
      setMsg({ tone: "ok", text: `${L.saved} ✓` });
      window.scrollTo({ top: 0 });
      document.getElementById("mm-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setMsg({ tone: "bad", text: L.error });
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    laser?.disconnect();
    setLaser(null);
    setOpen(false);
    router.refresh();
  };

  const chip = (on: boolean) => `shrink-0 rounded-full border px-3.5 py-2 text-[15px] ${on ? "border-graphite bg-graphite text-white" : "border-line bg-white"}`;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn bg-brass px-5 py-3 text-base text-white hover:bg-[#8d6b36]">
        <ScanLine size={18} /> {L.start}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#f3f3f1]">
      {/* header */}
      <header className="flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{clientName}</p>
          <p className="text-sm text-muted"><span className="num font-semibold text-graphite">{count}</span> {L.items}</p>
        </div>
        <button onClick={close} className="btn btn-primary"><Check size={17} /> {L.finish}</button>
      </header>

      {/* laser bar */}
      <div className={`flex items-center gap-3 px-4 py-2.5 text-sm ${laser ? "bg-[#dff0e6]" : "bg-white"} border-b border-line`}>
        {laser ? (
          <>
            <BluetoothConnected size={18} className="text-ok" />
            <span className="min-w-0 flex-1 truncate"><b>{L.laser.connected}</b> · {laser.name}</span>
            {lastReading !== null && <span className="num font-semibold" dir="ltr">{lastReading} cm</span>}
          </>
        ) : (
          <>
            <Bluetooth size={18} className="text-muted" />
            <button onClick={connect} disabled={laserBusy} className="font-semibold text-graphite underline-offset-2 hover:underline disabled:opacity-50">
              {L.laser.connect}
            </button>
          </>
        )}
      </div>

      {msg && (
        <div role="status" className={`px-4 py-2.5 text-sm ${msg.tone === "ok" ? "bg-graphite text-white" : "bg-[#f6e1df] text-[#9a332c]"}`}>{msg.text}</div>
      )}

      <div id="mm-scroll" className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-5">
          {/* 1. what */}
          <section>
            <h2 className="mb-2.5 font-semibold">{L.what}</h2>
            <div className="grid grid-cols-4 gap-2">
              {products.map(([k, label]) => {
                const Icon = ICONS[k] || Box;
                return (
                  <button key={k} onClick={() => chooseType(k)} className={`flex flex-col items-center gap-1.5 rounded-xl border px-1 py-3 text-center text-[12.5px] leading-tight ${type === k ? "border-graphite bg-graphite text-white" : "border-line bg-white"}`}>
                    <Icon size={24} className={type === k ? "text-brass" : "text-graphite"} />
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          {type && (
            <>
              {/* 2. where */}
              <section>
                <h2 className="mb-2.5 font-semibold">{L.room}</h2>
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                  {Object.values(L.rooms).map((r) => (
                    <button key={r} onClick={() => setRoom(r)} className={chip(room === r)}>{r}</button>
                  ))}
                </div>
                <input value={room} onChange={(e) => setRoom(e.target.value)} className="input mt-2" placeholder={L.room} />
              </section>

              {/* 3. sizes */}
              <section className="rounded-2xl border border-line bg-white p-4">
                <div className="flex justify-center"><ItemSketch type={type} width={width} height={height} depth={depth} size={200} /></div>
                {laser && <p className="mb-3 text-center text-sm text-muted">{L.laser.hint}</p>}
                <div className="space-y-3">
                  {order.map((k) => {
                    const f = fields[k];
                    const isActive = active === k;
                    return (
                      <div key={k} className={`rounded-xl border-2 p-3 transition-colors ${isActive ? "border-brass bg-brass-soft/50" : "border-transparent bg-[#f6f6f4]"} ${flash === k ? "bg-[#dff0e6]" : ""}`} onClick={() => setActive(k)}>
                        <div className="flex items-center gap-3">
                          <label className="w-20 shrink-0 text-[15px] font-medium" htmlFor={`mm-${k}`}>{L[k]}</label>
                          <input
                            id={`mm-${k}`}
                            inputMode="decimal"
                            dir="ltr"
                            value={f.typed || (valueOf(f) ?? "").toString()}
                            onFocus={() => setActive(k)}
                            onChange={(e) => setFields((p) => ({ ...p, [k]: { readings: [], typed: e.target.value } }))}
                            className="num min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2.5 text-center text-2xl font-bold"
                            placeholder="0"
                          />
                          <span className="text-muted">{L.cm}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); openAr(k); }} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-line bg-white" aria-label={L.ar.button} title={L.ar.button}>
                            <Camera size={19} />
                          </button>
                        </div>
                        {f.readings.length > 0 && !f.typed && (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm" dir="ltr">
                            {f.readings.map((r, i) => (
                              <span key={i} className={`num rounded-md px-2 py-0.5 ${three && r === Math.min(...f.readings) ? "bg-graphite text-white" : "bg-white text-muted"}`}>{r}</span>
                            ))}
                            <button type="button" onClick={(e) => { e.stopPropagation(); setFields((p) => ({ ...p, [k]: emptyField() })); setActive(k); }} className="ms-auto text-xs text-muted underline">{L.clear}</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <label className="mt-4 flex items-start gap-3 text-sm">
                  <input type="checkbox" checked={three} onChange={(e) => setThree(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-graphite" />
                  <span><b>{L.three}</b><span className="block text-muted">{L.threeHint}</span></span>
                </label>
              </section>

              {/* 4. quantity */}
              <section className="flex items-center justify-between">
                <h2 className="font-semibold">{L.qty}</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-white" aria-label="−"><Minus size={18} /></button>
                  <span className="num w-10 text-center text-2xl font-bold">{qty}</span>
                  <button onClick={() => setQty((q) => q + 1)} className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-white" aria-label="+"><Plus size={18} /></button>
                </div>
              </section>

              {/* 5. material and colour */}
              <section>
                <h2 className="mb-2.5 font-semibold">{L.material}</h2>
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                  {Object.values(L.materials).map((m) => <button key={m} onClick={() => setMaterial(material === m ? "" : m)} className={chip(material === m)}>{m}</button>)}
                </div>
                <h2 className="mb-2.5 mt-4 font-semibold">{L.color}</h2>
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                  {Object.values(L.colors).map((c) => <button key={c} onClick={() => setColor(color === c ? "" : c)} className={chip(color === c)}>{c}</button>)}
                </div>
                <input value={color} onChange={(e) => setColor(e.target.value)} className="input mt-2" placeholder={L.color} />
              </section>

              {/* 6. notes and photo */}
              <section className="space-y-3">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={2} placeholder={L.notes} />
                <input ref={photoInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => takePhoto(e.target.files?.[0])} />
                <div className="flex items-center gap-3">
                  <button onClick={() => photoInput.current?.click()} disabled={photoBusy} className="btn btn-ghost bg-white py-3 disabled:opacity-60">
                    <Camera size={18} /> {photoBusy ? L.photoUploading : L.photo}
                  </button>
                  {photo && <img src={photo} alt="" className="h-14 w-14 rounded-lg object-cover" />}
                  {photo && <span className="text-sm text-ok">{L.photoDone}</span>}
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {type && (
        <footer className="border-t border-line bg-white px-4 py-3">
          <button onClick={save} disabled={saving || photoBusy} className="btn w-full bg-brass py-4 text-lg text-white hover:bg-[#8d6b36] disabled:opacity-60">
            {saving ? L.saving : L.save}
          </button>
        </footer>
      )}

      {/* AR overlay: shown over the live camera while a WebXR session runs */}
      <div ref={overlayRef} className={ar ? "fixed inset-0 z-[70]" : "hidden"} style={{ touchAction: "none" }}>
        {ar && (
          <div className="relative h-full w-full text-white">
            <svg className="pointer-events-none absolute inset-0 h-full w-full">
              {ar.state?.screen.length === 2 && (
                <line x1={ar.state.screen[0].x} y1={ar.state.screen[0].y} x2={ar.state.screen[1].x} y2={ar.state.screen[1].y} stroke="#A07A3F" strokeWidth={3} />
              )}
              {ar.state?.screen.length === 1 && ar.state.cursor && (
                <line x1={ar.state.screen[0].x} y1={ar.state.screen[0].y} x2={ar.state.cursor.x} y2={ar.state.cursor.y} stroke="#fff" strokeWidth={2} strokeDasharray="6 5" />
              )}
              {ar.state?.screen.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={7} fill="#A07A3F" stroke="#fff" strokeWidth={2} />)}
            </svg>
            {/* crosshair: hit-testing aims through the screen centre */}
            <div className={`pointer-events-none absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${ar.state?.tracking ? "border-white" : "border-white/40"}`}>
              <div className={`absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${ar.state?.tracking ? "bg-brass" : "bg-white/40"}`} />
            </div>
            <div className="absolute inset-x-0 top-0 bg-black/55 px-4 pb-3 pt-4 text-center text-[15px]">
              {!ar.state?.tracking ? L.ar.noSurface : (ar.state.points.length === 0 ? L.ar.aim : ar.state.points.length === 1 ? L.ar.aim2 : "")}
              {ar.state?.liveCm != null && <div className="num mt-1 text-4xl font-bold" dir="ltr">{ar.state.liveCm} cm</div>}
              <div className="mt-1 text-xs text-white/70">{L.ar.accuracy}</div>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-black/55 p-4">
              <button onClick={() => arCtl.current?.end()} className="btn flex-1 bg-white/15 py-3.5 text-white"><X size={18} /> {L.ar.cancel}</button>
              {ar.state && ar.state.points.length === 2 ? (
                <>
                  <button onClick={() => arCtl.current?.reset()} className="btn flex-1 bg-white/15 py-3.5 text-white">{L.ar.again}</button>
                  <button onClick={useAr} className="btn flex-1 bg-brass py-3.5 text-white"><Check size={18} /> {L.ar.use}</button>
                </>
              ) : (
                <button onClick={() => arCtl.current?.addPoint()} disabled={!ar.state?.tracking} className="btn flex-[2] bg-brass py-3.5 text-white disabled:opacity-50"><Plus size={18} /> {L.ar.add}</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
