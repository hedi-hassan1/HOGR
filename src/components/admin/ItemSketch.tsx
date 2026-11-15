/**
 * Front-view drawing of a measured item with dimension lines, so a wrong number is easy to spot
 * (a 2400 cm window looks obviously wrong). Pure SVG — works on screen and in print.
 */

const INK = "#202427";
const BRASS = "#A07A3F";
const GLASS = "#dfe9ea";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function ItemSketch({ type, width, height, depth, size = 220, className = "" }: { type: string; width?: number | null; height?: number | null; depth?: number | null; size?: number; className?: string }) {
  const w0 = width && width > 0 ? width : null;
  const h0 = height && height > 0 ? height : null;
  const W = 200, H = 200, pad = 34;
  // Fit the item's proportions into the drawing area (fallback square if sizes are missing)
  const ratio = w0 && h0 ? w0 / h0 : type === "door" ? 0.45 : type === "kitchen" || type === "bed_panel" ? 2.2 : 1;
  const maxW = W - pad * 2, maxH = H - pad * 2;
  let dw = maxW, dh = maxW / ratio;
  if (dh > maxH) { dh = maxH; dw = maxH * ratio; }
  dw = Math.max(dw, 14); dh = Math.max(dh, 14);
  const x = pad + (maxW - dw) / 2 + 6, y = pad + (maxH - dh) / 2 - 4;
  const sw = 1.6;

  const doorsFor = (cm: number | null, per: number) => Math.max(1, Math.min(8, Math.round((cm || per * 2) / per)));

  let detail: React.ReactNode = null;
  switch (type) {
    case "door": {
      const leaf = { x: x + dw * 0.08, y: y + dh * 0.05, w: dw * 0.84, h: dh * 0.95 };
      detail = (
        <>
          <rect x={leaf.x} y={leaf.y} width={leaf.w} height={leaf.h} fill="none" stroke={INK} strokeWidth={sw * 0.8} />
          <line x1={leaf.x + leaf.w * 0.82} y1={leaf.y + leaf.h * 0.42} x2={leaf.x + leaf.w * 0.82} y2={leaf.y + leaf.h * 0.6} stroke={BRASS} strokeWidth={2.4} strokeLinecap="round" />
        </>
      );
      break;
    }
    case "window": {
      const panes = w0 && w0 > 150 ? 3 : 2;
      const inset = Math.min(dw, dh) * 0.06;
      detail = (
        <>
          {Array.from({ length: panes }, (_, i) => {
            const pw = (dw - inset * 2) / panes;
            return <rect key={i} x={x + inset + i * pw + 1} y={y + inset} width={pw - 2} height={dh - inset * 2} fill={GLASS} stroke={INK} strokeWidth={sw * 0.7} />;
          })}
        </>
      );
      break;
    }
    case "kitchen": {
      const n = doorsFor(w0, 60);
      const top = y + dh * 0.12;
      detail = (
        <>
          <rect x={x} y={y} width={dw} height={dh * 0.12} fill={INK} opacity={0.85} />
          {Array.from({ length: n }, (_, i) => (
            <rect key={i} x={x + (dw / n) * i + 2} y={top + 3} width={dw / n - 4} height={dh * 0.88 - 6} fill="none" stroke={INK} strokeWidth={sw * 0.6} />
          ))}
        </>
      );
      break;
    }
    case "wardrobe":
    case "bathroom":
    case "vanity": {
      const n = doorsFor(w0, type === "wardrobe" ? 50 : 45);
      detail = Array.from({ length: n }, (_, i) => (
        <g key={i}>
          <rect x={x + (dw / n) * i + 2} y={y + 3} width={dw / n - 4} height={dh - 6} fill="none" stroke={INK} strokeWidth={sw * 0.6} />
          <line x1={x + (dw / n) * (i + (i % 2 ? 0.15 : 0.85))} y1={y + dh * 0.42} x2={x + (dw / n) * (i + (i % 2 ? 0.15 : 0.85))} y2={y + dh * 0.58} stroke={BRASS} strokeWidth={2} strokeLinecap="round" />
        </g>
      ));
      break;
    }
    case "bed_panel": {
      const n = Math.max(3, Math.min(12, Math.round((w0 || 200) / 30)));
      detail = Array.from({ length: n }, (_, i) => (
        <rect key={i} x={x + (dw / n) * i + 1} y={y + 2} width={dw / n - 2} height={dh - 4} rx={3} fill="none" stroke={INK} strokeWidth={sw * 0.5} />
      ));
      break;
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={size} height={size} className={className} role="img" aria-label={`${w0 ?? "?"} × ${h0 ?? "?"} cm`}>
      {/* the item */}
      <rect x={x} y={y} width={dw} height={dh} fill="#fff" stroke={INK} strokeWidth={sw} />
      {detail}
      {/* width dimension (below) */}
      <g stroke={BRASS} strokeWidth={1}>
        <line x1={x} y1={y + dh + 10} x2={x + dw} y2={y + dh + 10} />
        <line x1={x} y1={y + dh + 5} x2={x} y2={y + dh + 15} />
        <line x1={x + dw} y1={y + dh + 5} x2={x + dw} y2={y + dh + 15} />
      </g>
      <text x={x + dw / 2} y={y + dh + 26} textAnchor="middle" fontSize={12} fontWeight={600} fill={w0 ? INK : "#9a9a95"} style={{ fontFamily: "system-ui, sans-serif" }}>
        {w0 ? fmt(w0) : "W"}
      </text>
      {/* height dimension (left) */}
      <g stroke={BRASS} strokeWidth={1}>
        <line x1={x - 10} y1={y} x2={x - 10} y2={y + dh} />
        <line x1={x - 15} y1={y} x2={x - 5} y2={y} />
        <line x1={x - 15} y1={y + dh} x2={x - 5} y2={y + dh} />
      </g>
      <text x={x - 16} y={y + dh / 2} textAnchor="middle" fontSize={12} fontWeight={600} fill={h0 ? INK : "#9a9a95"} transform={`rotate(-90 ${x - 16} ${y + dh / 2})`} dy={-2} style={{ fontFamily: "system-ui, sans-serif" }}>
        {h0 ? fmt(h0) : "H"}
      </text>
      {depth && depth > 0 ? (
        <text x={x + dw} y={y - 6} textAnchor="end" fontSize={10.5} fill="#5f6468" style={{ fontFamily: "system-ui, sans-serif" }}>
          D {fmt(depth)}
        </text>
      ) : null}
    </svg>
  );
}
