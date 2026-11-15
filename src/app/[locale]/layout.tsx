import type { Metadata, Viewport } from "next";
import { Archivo, Vazirmatn } from "next/font/google";
import { notFound } from "next/navigation";
import { dirOf, htmlLang, isLocale, LOCALES } from "@/lib/i18n";
import { getSiteDict } from "@/lib/content";
import "../globals.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
const vazir = Vazirmatn({ subsets: ["arabic", "latin"], variable: "--font-vazir", display: "swap" });

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getSiteDict(locale);
  return {
    title: { default: `HOGR CO. | ${t.site.hero.title}`, template: "%s | HOGR CO." },
    description: t.site.hero.sub,
    metadataBase: new URL(process.env.HOGR_SITE_URL || "http://localhost:3000"),
    icons: { icon: "/icon.svg", apple: `/${locale}/apple-icon` },
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])) },
  };
}

export const viewport: Viewport = { themeColor: "#202427", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={htmlLang(locale)} dir={dirOf(locale)} className={`${archivo.variable} ${vazir.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
