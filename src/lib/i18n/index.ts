import en, { type Dict } from "./en";
import ckb from "./ckb";
import ar from "./ar";

export const LOCALES = ["ckb", "ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];

const dicts: Record<Locale, Dict> = { ckb, ar, en };

export function isLocale(v: string): v is Locale {
  return (LOCALES as readonly string[]).includes(v);
}
export function getDict(locale: string): Dict {
  return dicts[isLocale(locale) ? locale : "ckb"];
}
export const dirOf = (l: string) => (l === "en" ? "ltr" : "rtl");
export const htmlLang = (l: string) => (l === "ckb" ? "ckb" : l);

export const PRODUCT_TYPES = ["door", "window", "kitchen", "wardrobe", "bathroom", "vanity", "bed_panel", "other"] as const;
export const SITE_PRODUCTS = ["door", "window", "kitchen", "wardrobe", "bathroom", "vanity", "bed_panel"] as const;
export const ORDER_STATUSES = ["quote", "confirmed", "production", "ready", "installed", "completed", "cancelled"] as const;
export const BOOKING_TYPES = ["measurement", "installation", "consultation", "delivery", "other"] as const;
export const BOOKING_STATUSES = ["scheduled", "done", "cancelled"] as const;
export const PAY_METHODS = ["cash", "transfer", "fib", "fastpay", "zaincash", "other"] as const;
export const EXPENSE_CATS = ["materials", "salaries", "rent", "utilities", "transport", "tools", "other"] as const;
export const INV_CATS = ["aluminium", "upvc", "glass", "boards", "hardware", "other"] as const;
export const LEAD_STATUSES = ["new", "contacted", "converted", "closed"] as const;
export const CLIENT_SOURCES = ["walk_in", "referral", "facebook", "instagram", "website", "other"] as const;
export const UNITS = ["piece", "m2", "m"] as const;

export type { Dict };
