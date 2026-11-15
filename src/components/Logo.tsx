import { DIVIDER_X, HANDLE_PATH, LATIN_END, LOGO_WIDTH, MARK_PATHS, WORD_KURDISH, WORD_LATIN } from "./logo-data";

const BRASS = "#A07A3F";

/**
 * HOGR CO. logo: an "H" whose right leg is a door leaf swinging open, with a brass pull handle.
 * - "full": mark + HOGR + هۆگر (default)
 * - "latin": mark + HOGR (tight spaces)
 * - "mark": the symbol alone
 */
export function Logo({ light = false, height = 30, variant = "full", className = "" }: { light?: boolean; height?: number; variant?: "full" | "latin" | "mark"; className?: string }) {
  const fg = light ? "#FFFFFF" : "#202427";
  const w = variant === "mark" ? 48 : variant === "latin" ? LATIN_END : LOGO_WIDTH;
  return (
    <svg
      viewBox={`0 0 ${w} 48`}
      height={height}
      width={(height * w) / 48}
      className={`block shrink-0 ${className}`}
      role="img"
      aria-label="HOGR CO."
    >
      {MARK_PATHS.map((d) => <path key={d} d={d} fill={fg} />)}
      <path d={HANDLE_PATH} stroke={BRASS} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      {variant !== "mark" && <path d={WORD_LATIN.d} transform={WORD_LATIN.transform} fill={fg} />}
      {variant === "full" && (
        <>
          <path d={`M${DIVIDER_X} 14v22`} stroke={fg} strokeOpacity={0.28} strokeWidth={1.2} />
          <path d={WORD_KURDISH.d} transform={WORD_KURDISH.transform} fill={fg} />
        </>
      )}
    </svg>
  );
}
