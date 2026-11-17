import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { Shell } from "@/components/admin/Shell";
import { getOverdue } from "@/lib/followup";
import { getDebts } from "@/lib/ops";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function PanelLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await requireUser(locale);
  const t = getDict(locale);
  const newLeads = (await db().prepare("SELECT COUNT(*) c FROM leads WHERE status = 'new'").get() as { c: number }).c;
  return (
    <Shell locale={locale} nav={t.admin.nav} userName={user.name} newLeads={newLeads} overdue={(await getOverdue()).length} debts={(await getDebts()).filter((d) => d.due).length}>
      {children}
    </Shell>
  );
}
