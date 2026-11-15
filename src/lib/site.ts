import { db } from "./db";

export type PortfolioRow = {
  id: number; title_ckb: string | null; title_ar: string | null; title_en: string | null;
  category: string; image: string; featured: number; sort: number; before_image: string | null;
};

export function getPortfolio(opts: { category?: string; featured?: boolean } = {}) {
  const where: string[] = [];
  const args: unknown[] = [];
  if (opts.category) { where.push("category = ?"); args.push(opts.category); }
  if (opts.featured) where.push("featured = 1");
  const sql = `SELECT * FROM portfolio ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY sort, id DESC`;
  return db().prepare(sql).all(...args) as PortfolioRow[];
}

export function titleFor(p: PortfolioRow, locale: string) {
  const v = locale === "ckb" ? p.title_ckb : locale === "ar" ? p.title_ar : p.title_en;
  return v || p.title_en || p.title_ckb || "";
}

/** First portfolio image per category, used as the product thumbnail. */
export function categoryCovers() {
  const rows = db().prepare("SELECT category, image FROM portfolio ORDER BY featured DESC, sort, id").all() as { category: string; image: string }[];
  const map: Record<string, string> = {};
  for (const r of rows) if (!map[r.category]) map[r.category] = r.image;
  return map;
}
