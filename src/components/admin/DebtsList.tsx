import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getSettings, orderNo } from "@/lib/db";
import type { Dict } from "@/lib/i18n";
import { dateFmt } from "@/lib/format";
import { getDebts } from "@/lib/ops";
import { remindDebt } from "@/app/[locale]/admin/actions";
import { Badge, Empty, Hidden, Money } from "./ui";
import { SubmitButton } from "./client";

/** Installed orders that still have money to pay, with one-tap WhatsApp reminders. */
export function DebtsList({ locale, a, limit }: { locale: string; a: Dict["admin"]; limit?: number }) {
  const s = getSettings();
  const L = a.debts;
  const base = `/${locale}/admin`;
  const debts = getDebts().slice(0, limit ?? 500);
  if (!debts.length) return <Empty text={L.empty} />;
  const langs: [string, string][] = [["ckb", "کوردی"], ["ar", "عربي"], ["en", "EN"]];
  const first = s.debt_locale || "ckb";

  return (
    <ul className="divide-y divide-[#eceae6]">
      {debts.map((d) => (
        <li key={d.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 ${d.due ? "bg-[#fbeceb]" : ""}`}>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`${base}/clients/${d.client_id}`} className={`font-medium hover:text-brass ${d.due ? "text-bad" : ""}`}>{d.name}</Link>
              <Link href={`${base}/orders/${d.id}`} className="num text-sm text-muted hover:text-brass">{orderNo(d.id)}</Link>
              {d.due && <Badge tone="red">{L.due}</Badge>}
            </div>
            <p className="mt-0.5 text-sm text-muted">
              {L.installed} {L.daysSince.replace("{n}", String(d.days))}
              {" · "}{L.lastReminded}: {d.debt_reminded_at ? dateFmt(d.debt_reminded_at.slice(0, 10), locale) : L.never}
              {d.debt_reminders > 0 && ` (${d.debt_reminders})`}
            </p>
          </div>
          <div className="text-end">
            <span className="block text-xs text-muted">{L.balance}</span>
            <Money v={d.balance} cur={s.currency} locale={locale} className="text-lg font-bold text-bad" />
          </div>
          {d.phone ? (
            <div className="flex items-center gap-1">
              <form action={remindDebt}>
                <Hidden values={{ locale, id: d.id, lang: first }} />
                <SubmitButton className="btn btn-sm bg-[#25D366] text-white hover:bg-[#1fb457]"><MessageCircle size={15} /> {L.remind}</SubmitButton>
              </form>
              {langs.filter(([l]) => l !== first).map(([l, label]) => (
                <form key={l} action={remindDebt}>
                  <Hidden values={{ locale, id: d.id, lang: l }} />
                  <SubmitButton className="btn btn-ghost btn-sm px-2">{label}</SubmitButton>
                </form>
              ))}
            </div>
          ) : (
            <span className="text-sm text-muted">{L.noPhone}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
