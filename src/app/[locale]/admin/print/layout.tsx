import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

export default async function PrintLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireUser(locale);
  return <div className="min-h-dvh bg-[#e9e9e6] py-6 print:bg-white print:py-0">{children}</div>;
}
