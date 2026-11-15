"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { BeforeAfter } from "./BeforeAfter";

type Item = { id: number; src: string; title: string; cat: string; before?: string | null };
type BA = { before: string; after: string; label: string };

export function Gallery({ items, ba }: { items: Item[]; ba: BA }) {
  const [idx, setIdx] = useState<number | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (idx === null) dlg.current?.close();
    else if (!dlg.current?.open) dlg.current?.showModal();
  }, [idx]);

  const step = (d: number) => setIdx((i) => (i === null ? null : (i + d + items.length) % items.length));

  return (
    <>
      <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {items.map((p, i) =>
          p.before ? (
            // Before/after projects: the slider is the main interaction; a small button opens full screen
            <figure key={p.id} className="mb-4 break-inside-avoid">
              <div className="relative">
                <BeforeAfter before={p.before} after={p.src} alt={p.title} labels={ba} className="rounded-sm" />
                <button onClick={() => setIdx(i)} className="absolute bottom-3 end-3 rounded-full bg-black/60 p-2 text-white hover:bg-black/80" aria-label={p.title}><Maximize2 size={16} /></button>
              </div>
              <figcaption className="mt-2 flex items-baseline justify-between gap-3">
                <span className="font-medium">{p.title}</span>
                <span className="shrink-0 text-sm text-muted">{ba.before} / {ba.after}</span>
              </figcaption>
            </figure>
          ) : (
          <button key={p.id} onClick={() => setIdx(i)} className="group mb-4 block w-full break-inside-avoid text-start">
            <img src={p.src} alt={p.title} loading="lazy" className="w-full rounded-sm transition-opacity group-hover:opacity-90" />
            <span className="mt-2 flex items-baseline justify-between gap-3">
              <span className="font-medium">{p.title}</span>
              <span className="shrink-0 text-sm text-muted">{p.cat}</span>
            </span>
          </button>
          ),
        )}
      </div>
      <dialog
        ref={dlg}
        onClose={() => setIdx(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(document.dir === "rtl" ? -1 : 1);
          if (e.key === "ArrowLeft") step(document.dir === "rtl" ? 1 : -1);
        }}
        onClick={(e) => e.target === dlg.current && setIdx(null)}
        className="m-auto max-h-[100dvh] max-w-[100vw] bg-transparent p-0 backdrop:bg-black/85"
      >
        {idx !== null && (
          <div className="relative flex h-[100dvh] w-[100vw] flex-col items-center justify-center p-4 sm:p-10">
            {items[idx].before ? (
              <BeforeAfter before={items[idx].before!} after={items[idx].src} alt={items[idx].title} labels={ba} className="max-h-[82dvh] max-w-full [&_img]:max-h-[82dvh] [&_img]:object-contain" />
            ) : (
              <img src={items[idx].src} alt={items[idx].title} className="max-h-[82dvh] max-w-full object-contain" />
            )}
            <p className="mt-4 text-center text-white">{items[idx].title}</p>
            <button onClick={() => setIdx(null)} className="absolute end-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close">
              <X />
            </button>
            {items.length > 1 && (
              <>
                <button onClick={() => step(-1)} className="absolute start-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Previous">
                  <ChevronLeft className="rtl:-scale-x-100" />
                </button>
                <button onClick={() => step(1)} className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Next">
                  <ChevronRight className="rtl:-scale-x-100" />
                </button>
              </>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
