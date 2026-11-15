const CURRENCY_LABEL: Record<string, Record<string, string>> = {
  IQD: { en: "IQD", ckb: "د.ع", ar: "د.ع" },
  USD: { en: "$", ckb: "$", ar: "$" },
};

export function money(value: number, currency = "IQD", locale = "en") {
  const digits = currency === "USD" ? 2 : 0;
  const n = new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(
    Math.round((value || 0) * 100) / 100,
  );
  const label = CURRENCY_LABEL[currency]?.[locale] ?? currency;
  const out = currency === "USD" ? `${label}${n.replace("-", "")}` : `${n.replace("-", "")} ${label}`;
  return value < 0 ? `−${out}` : out;
}

export function num(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}

const MONTHS: Record<string, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ckb: ["کانوونی دووەم", "شوبات", "ئازار", "نیسان", "ئایار", "حوزەیران", "تەمووز", "ئاب", "ئەیلوول", "تشرینی یەکەم", "تشرینی دووەم", "کانوونی یەکەم"],
  ar: ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"],
};

export function monthName(m: number, locale: string) {
  return (MONTHS[locale] || MONTHS.en)[m];
}

/** "2026-11-14" → "14 Nov 2026" (Latin digits everywhere for clarity on invoices). */
export function dateFmt(iso: string | null | undefined, locale = "en") {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${monthName(m - 1, locale)} ${y}`;
}

export function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
