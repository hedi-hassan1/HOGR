import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { getSiteConfig } from "@/lib/content";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Login", robots: { index: false } };

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (await getUser()) redirect(`/${locale}/admin`);
  const t = getDict(locale).admin.login;
  return (
    <div className="grid min-h-dvh md:grid-cols-2">
      <div className="relative hidden bg-graphite md:block">
        <img src={(await getSiteConfig()).images.login || "/images/work/kawantar3.jpg"} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
      </div>
      <div className="flex items-center justify-center px-6 py-16">
        <LoginForm locale={locale} t={t} />
      </div>
    </div>
  );
}
