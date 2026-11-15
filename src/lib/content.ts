import { db, getSettings } from "./db";
import { getDict, type Dict } from "./i18n";
import en from "./i18n/en";
import ckb from "./i18n/ckb";
import ar from "./i18n/ar";

/* ------------------------------------------------------------------
 * Editable website text. Each field is a dotted path into the dictionary
 * (e.g. "site.hero.title"). Edits are stored per language in site_content
 * and override the built-in text; "reset" removes the override.
 * ------------------------------------------------------------------ */

type L3 = { en: string; ckb: string; ar: string };
export type Field = { path: string; label: L3; long?: boolean };
export type Section = { id: string; label: L3; fields: Field[] };

const l = (en: string, ckb: string, ar: string): L3 => ({ en, ckb, ar });
const PRODUCTS = ["door", "window", "kitchen", "wardrobe", "bathroom", "vanity", "bed_panel"] as const;
const NTH = (i: number): L3 => l(`${i + 1}`, `${i + 1}`, `${i + 1}`);

export const SECTIONS: Section[] = [
  {
    id: "nav",
    label: l("Menu and buttons", "مێنیو و دوگمەکان", "القائمة والأزرار"),
    fields: [
      { path: "site.nav.home", label: l("Home", "سەرەکی", "الرئيسية") },
      { path: "site.nav.work", label: l("Our work", "کارەکانمان", "أعمالنا") },
      { path: "site.nav.about", label: l("About", "دەربارە", "من نحن") },
      { path: "site.nav.contact", label: l("Contact", "پەیوەندی", "اتصل بنا") },
      { path: "site.nav.estimate", label: l("Price estimate", "خەمڵاندنی نرخ", "تقدير السعر") },
      { path: "site.nav.book", label: l("Book button", "دوگمەی ژوان", "زر الحجز") },
    ],
  },
  {
    id: "hero",
    label: l("Home: top section", "سەرەکی: بەشی سەرەوە", "الرئيسية: القسم العلوي"),
    fields: [
      { path: "site.hero.title", label: l("Headline", "سەردێڕی سەرەکی", "العنوان الرئيسي"), long: true },
      { path: "site.hero.sub", label: l("Text under headline", "دەقی ژێر سەردێڕ", "النص تحت العنوان"), long: true },
      { path: "site.hero.cta", label: l("Main button", "دوگمەی سەرەکی", "الزر الرئيسي") },
      { path: "site.hero.cta2", label: l("Second button", "دوگمەی دووەم", "الزر الثاني") },
      { path: "site.hero.dimW", label: l("Width label on photo", "پانیی سەر وێنە", "العرض على الصورة") },
      { path: "site.hero.dimH", label: l("Height label on photo", "بەرزیی سەر وێنە", "الارتفاع على الصورة") },
    ],
  },
  {
    id: "products",
    label: l("Home: what we make", "سەرەکی: چی دروست دەکەین", "الرئيسية: ماذا نصنع"),
    fields: [
      { path: "site.products.title", label: l("Title", "سەردێڕ", "العنوان") },
      { path: "site.products.sub", label: l("Intro text", "دەقی سەرەتا", "نص المقدمة"), long: true },
      ...PRODUCTS.flatMap((k) => [
        { path: `products.${k}`, label: l(`${en.products[k]}: name`, `${ckb.products[k]}: ناو`, `${ar.products[k]}: الاسم`) },
        { path: `site.products.items.${k}`, label: l(`${en.products[k]}: description`, `${ckb.products[k]}: وەسف`, `${ar.products[k]}: الوصف`), long: true },
      ]),
    ],
  },
  {
    id: "process",
    label: l("Home: how a project runs", "سەرەکی: هەنگاوەکانی کار", "الرئيسية: خطوات العمل"),
    fields: [
      { path: "site.process.title", label: l("Title", "سەردێڕ", "العنوان") },
      ...[0, 1, 2, 3].flatMap((i) => [
        { path: `site.process.steps.${i}.t`, label: l(`Step ${NTH(i).en}: name`, `هەنگاوی ${i + 1}: ناو`, `الخطوة ${i + 1}: الاسم`) },
        { path: `site.process.steps.${i}.d`, label: l(`Step ${NTH(i).en}: text`, `هەنگاوی ${i + 1}: دەق`, `الخطوة ${i + 1}: النص`), long: true },
      ]),
    ],
  },
  {
    id: "home_more",
    label: l("Home: work, reviews and booking", "سەرەکی: کارەکان، بۆچوونەکان و ژوان", "الرئيسية: الأعمال والآراء والحجز"),
    fields: [
      { path: "site.featured.title", label: l("Recent work: title", "دوایین کارەکان: سەردێڕ", "أحدث الأعمال: العنوان") },
      { path: "site.featured.all", label: l("Recent work: button", "دوایین کارەکان: دوگمە", "أحدث الأعمال: الزر") },
      { path: "site.cta.title", label: l("Booking: title", "ژوان: سەردێڕ", "الحجز: العنوان"), long: true },
      { path: "site.cta.sub", label: l("Booking: text", "ژوان: دەق", "الحجز: النص"), long: true },
    ],
  },
  {
    id: "work",
    label: l("Our work page", "پەڕەی کارەکانمان", "صفحة أعمالنا"),
    fields: [
      { path: "site.work.title", label: l("Title", "سەردێڕ", "العنوان") },
      { path: "site.work.sub", label: l("Text", "دەق", "النص"), long: true },
      { path: "site.work.empty", label: l("Text when a category is empty", "دەق کاتێک بەشێک بەتاڵە", "النص عندما يكون القسم فارغاً") },
    ],
  },
  {
    id: "about",
    label: l("About page", "پەڕەی دەربارە", "صفحة من نحن"),
    fields: [
      { path: "site.about.title", label: l("Title", "سەردێڕ", "العنوان") },
      { path: "site.about.lead", label: l("Main sentence", "ڕستەی سەرەکی", "الجملة الرئيسية"), long: true },
      { path: "site.about.body.0", label: l("Paragraph 1", "بڕگەی ١", "الفقرة ١"), long: true },
      { path: "site.about.body.1", label: l("Paragraph 2", "بڕگەی ٢", "الفقرة ٢"), long: true },
      ...[0, 1, 2].flatMap((i) => [
        { path: `site.about.values.${i}.t`, label: l(`Strength ${i + 1}: title`, `خاڵی بەهێز ${i + 1}: سەردێڕ`, `الميزة ${i + 1}: العنوان`) },
        { path: `site.about.values.${i}.d`, label: l(`Strength ${i + 1}: text`, `خاڵی بەهێز ${i + 1}: دەق`, `الميزة ${i + 1}: النص`), long: true },
      ]),
      { path: "site.about.ownerTitle", label: l("Owner block: heading", "بەشی خاوەن: سەردێڕ", "قسم المالك: العنوان") },
      { path: "site.about.ownerText", label: l("Owner block: quote", "بەشی خاوەن: قسە", "قسم المالك: الاقتباس"), long: true },
      { path: "site.about.ownerName", label: l("Owner name", "ناوی خاوەن", "اسم المالك") },
      { path: "site.about.ownerRole", label: l("Owner role", "پۆستی خاوەن", "منصب المالك") },
      { path: "site.about.faqTitle", label: l("Questions: heading", "پرسیارەکان: سەردێڕ", "الأسئلة: العنوان") },
    ],
  },
  {
    id: "contact",
    label: l("Contact page and form", "پەڕەی پەیوەندی و فۆرم", "صفحة الاتصال والنموذج"),
    fields: [
      { path: "site.contact.title", label: l("Title", "سەردێڕ", "العنوان") },
      { path: "site.contact.sub", label: l("Text", "دەق", "النص"), long: true },
      { path: "site.contact.formTitle", label: l("Form title", "سەردێڕی فۆرم", "عنوان النموذج") },
      { path: "site.contact.submit", label: l("Form button", "دوگمەی فۆرم", "زر النموذج") },
      { path: "site.contact.success", label: l("Message after sending", "پەیام دوای ناردن", "الرسالة بعد الإرسال"), long: true },
      { path: "site.contact.hoursValue", label: l("Opening hours", "کاتی کارکردن", "ساعات العمل") },
    ],
  },
  {
    id: "footer",
    label: l("Footer", "خوارەوەی ماڵپەڕ", "أسفل الموقع"),
    fields: [{ path: "site.footer.blurb", label: l("Short description", "وەسفی کورت", "وصف قصير"), long: true }],
  },
];

/* ---------------- path helpers ---------------- */

export function getAt(obj: unknown, path: string): string {
  let cur: unknown = obj;
  for (const k of path.split(".")) {
    if (cur == null) return "";
    cur = (cur as Record<string, unknown>)[k];
  }
  return typeof cur === "string" ? cur : "";
}

function setAt(obj: Record<string, unknown>, path: string, value: string) {
  const keys = path.split(".");
  let cur: Record<string, unknown> = obj;
  for (const k of keys.slice(0, -1)) {
    if (cur[k] == null || typeof cur[k] !== "object") return;
    cur = cur[k] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = value;
}

const ALLOWED = new Set(SECTIONS.flatMap((s) => s.fields.map((f) => f.path)));
export const isEditablePath = (p: string) => ALLOWED.has(p);

/** The dictionary with the owner's edits applied. Use for the public website. */
export function getSiteDict(locale: string): Dict {
  const base = getDict(locale);
  const rows = db().prepare("SELECT path, value FROM site_content WHERE locale = ?").all(locale) as { path: string; value: string }[];
  if (rows.length === 0) return base;
  const copy = structuredClone(base) as unknown as Record<string, unknown>;
  for (const r of rows) if (ALLOWED.has(r.path)) setAt(copy, r.path, r.value);
  return copy as unknown as Dict;
}

export function getOverrides(): Map<string, string> {
  const rows = db().prepare("SELECT path, locale, value FROM site_content").all() as { path: string; locale: string; value: string }[];
  return new Map(rows.map((r) => [`${r.path}|${r.locale}`, r.value]));
}

/* ---------------- reviews, FAQ, images, sections ---------------- */

export type Testimonial = { id: number; name_ckb: string | null; name_ar: string | null; name_en: string | null; role_ckb: string | null; role_ar: string | null; role_en: string | null; text_ckb: string | null; text_ar: string | null; text_en: string | null; visible: number; sort: number };
export type Faq = { id: number; q_ckb: string | null; q_ar: string | null; q_en: string | null; a_ckb: string | null; a_ar: string | null; a_en: string | null; visible: number; sort: number };

const pick = (row: Record<string, unknown>, field: string, locale: string) =>
  (row[`${field}_${locale}`] as string) || (row[`${field}_en`] as string) || (row[`${field}_ckb`] as string) || "";

export function getTestimonials(locale: string, all = false) {
  const rows = db().prepare(`SELECT * FROM testimonials ${all ? "" : "WHERE visible = 1"} ORDER BY sort, id`).all() as Testimonial[];
  return all ? rows : rows.map((r) => ({ id: r.id, name: pick(r, "name", locale), role: pick(r, "role", locale), text: pick(r, "text", locale), rating: (r as Testimonial & { rating?: number | null }).rating ?? null })).filter((r) => r.text);
}

export function getFaqs(locale: string, all = false) {
  const rows = db().prepare(`SELECT * FROM faqs ${all ? "" : "WHERE visible = 1"} ORDER BY sort, id`).all() as Faq[];
  return all ? rows : rows.map((r) => ({ id: r.id, q: pick(r, "q", locale), a: pick(r, "a", locale) })).filter((r) => r.q);
}

export const IMAGE_SLOTS = ["hero", "about", "owner", "login"] as const;
export const SECTION_TOGGLES = ["products", "process", "featured", "reviews", "booking", "faq", "owner", "map"] as const;

/** Website images and on/off switches for page sections. */
export function getSiteConfig() {
  const s = getSettings();
  const covers: Record<string, string> = {};
  for (const k of PRODUCTS) if (s[`cover_${k}`]) covers[k] = s[`cover_${k}`];
  return {
    images: Object.fromEntries(IMAGE_SLOTS.map((k) => [k, s[`image_${k}`]])) as Record<(typeof IMAGE_SLOTS)[number], string>,
    covers,
    show: Object.fromEntries(SECTION_TOGGLES.map((k) => [k, s[`show_${k}`] !== "0"])) as Record<(typeof SECTION_TOGGLES)[number], boolean>,
  };
}
