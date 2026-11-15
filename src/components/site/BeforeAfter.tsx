"use client";

import { useState } from "react";
import { ChevronsLeftRight } from "lucide-react";

/** Drag (or use arrow keys) to compare the "before" photo with the finished work. */
export function BeforeAfter({ before, after, alt, labels, className = "" }: { before: string; after: string; alt: string; labels: { before: string; after: string; label: string }; className?: string }) {
  const [pos, setPos] = useState(50);
  return (
    <div className={`relative select-none overflow-hidden ${className}`} dir="ltr">
      <img src={after} alt={alt} className="block w-full" draggable={false} />
      <img
        src={before}
        alt=""
        aria-hidden
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />
      <span className="pointer-events-none absolute start-3 top-3 rounded bg-black/60 px-2 py-0.5 text-xs text-white">{labels.before}</span>
      <span className="pointer-events-none absolute end-3 top-3 rounded bg-black/60 px-2 py-0.5 text-xs text-white">{labels.after}</span>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }}>
        <span className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-graphite shadow-lg">
          <ChevronsLeftRight size={20} />
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label={labels.label}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
