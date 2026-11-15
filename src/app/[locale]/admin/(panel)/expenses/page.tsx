import Link from "next/link";
import { db, getSettings, orderNo } from "@/lib/db";
import { EXPENSE_CATS, getDict } from "@/lib/i18n";
import { dateFmt, todayISO } from "@/lib/format";
import { Badge, Empty, Field, Hidden, Money, PageHeader, Panel, Select } from "@/components/admin/ui";
import { ConfirmButton, SubmitButton } from "@/components/admin/client";
import { deleteExpense, saveExpense } from "../../actions";

type E = { id: number; category: string; amount: number; date: string; description: string | null; supplier: string | null; order_id: number | null };

export default async function ExpensesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ from?: string; to?: string; cat?: string; edit?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const a = getDict(locale).admin;
  const base = `/${locale}/admin`;
  const cur = getSettings().currency;
  const from = sp.from || todayISO().slice(0, 8) + "01";
  const to = sp.to || todayISO();

  const args: unknown[] = [from, to];
  let where = "date >= ? AND date <= ?";
  if (sp.cat) { where += " AND category = ?"; args.push(sp.cat); }
  const rows = db().prepare(`SELECT * FROM expenses WHERE ${where} ORDER BY date DESC, id DESC`).all(...args) as E[];
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const byCat = EXPENSE_CATS.map((c) => ({ c, v: rows.filter((r) => r.category === c).reduce((s, r) => s + r.amount, 0) })).filter((x) => x.v > 0);
  const editing = sp.edit ? (db().prepare("SELECT * FROM expenses WHERE id = ?").get(Number(sp.edit)) as E | undefined) : undefined;
  const orders = db().prepare("SELECT o.id, c.name FROM orders o JOIN clients c ON c.id = o.client_id WHERE o.status NOT IN ('cancelled') ORDER BY o.id DESC LIMIT 200").all() as { id: number; name: string }[];

  return (
    <>
      <PageHeader title={a.expenses.title} />
      <Panel title={editing ? a.common.edit : a.expenses.new} className="mb-4" action={editing && <Link href={`${base}/expenses`} className="text-sm text-muted">{a.common.cancel}</Link>}>
        <form action={saveExpense} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Hidden values={{ locale, id: editing?.id }} />
          <Field label={a.common.category}><Select name="category" defaultValue={editing?.category ?? "materials"} options={EXPENSE_CATS.map((c) => [c, a.expenses.categories[c]])} /></Field>
          <Field label={a.common.amount}><input name="amount" required inputMode="decimal" dir="ltr" defaultValue={editing?.amount} className="input num rtl:text-right" /></Field>
          <Field label={a.common.date}><input name="date" type="date" defaultValue={editing?.date ?? todayISO()} className="input" /></Field>
          <Field label={a.common.description} className="lg:col-span-2"><input name="description" defaultValue={editing?.description ?? ""} className="input" /></Field>
          <Field label={a.common.supplier}><input name="supplier" defaultValue={editing?.supplier ?? ""} className="input" /></Field>
          <Field label={`${a.common.order} (${a.common.optional})`} className="sm:col-span-2"><Select name="order_id" defaultValue={editing?.order_id} placeholder="—" options={orders.map((o) => [o.id, `${orderNo(o.id)} · ${o.name}`])} /></Field>
          <div className="flex items-end sm:col-span-2 lg:col-span-4"><SubmitButton>{a.common.save}</SubmitButton></div>
        </form>
      </Panel>

      <form className="mb-4 flex flex-wrap items-end gap-3">
        <label><span className="label">{a.common.from}</span><input type="date" name="from" defaultValue={from} className="input" /></label>
        <label><span className="label">{a.common.to}</span><input type="date" name="to" defaultValue={to} className="input" /></label>
        <label className="w-48"><span className="label">{a.common.category}</span><Select name="cat" defaultValue={sp.cat} placeholder={a.common.all} options={EXPENSE_CATS.map((c) => [c, a.expenses.categories[c]])} /></label>
        <button className="btn btn-ghost bg-white">{a.common.filter}</button>
        <div className="ms-auto rounded-lg bg-white px-4 py-2 text-end">
          <span className="block text-xs text-muted">{a.expenses.totalShown}</span>
          <Money v={total} cur={cur} locale={locale} className="text-lg font-bold text-bad" />
        </div>
      </form>

      {byCat.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {byCat.map((x) => (
            <span key={x.c} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm">
              <span className="text-muted">{a.expenses.categories[x.c]}:</span> <Money v={x.v} cur={cur} locale={locale} className="font-medium" />
            </span>
          ))}
        </div>
      )}

      <Panel pad={false}>
        {rows.length === 0 ? <Empty text={a.expenses.empty} /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>{a.common.date}</th><th>{a.common.category}</th><th>{a.common.description}</th><th>{a.common.supplier}</th><th className="text-end">{a.common.amount}</th><th /></tr></thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap">{dateFmt(e.date, locale)}</td>
                    <td><Badge>{a.expenses.categories[e.category as keyof typeof a.expenses.categories]}</Badge></td>
                    <td>{e.description}{e.order_id && <Link href={`${base}/orders/${e.order_id}`} className="num ms-2 text-sm text-muted hover:text-brass">{orderNo(e.order_id)}</Link>}</td>
                    <td className="text-muted">{e.supplier}</td>
                    <td className="text-end"><Money v={e.amount} cur={cur} locale={locale} className="font-medium" /></td>
                    <td className="whitespace-nowrap text-end">
                      <Link href={`${base}/expenses?edit=${e.id}`} className="btn btn-ghost btn-sm me-1">{a.common.edit}</Link>
                      <form action={deleteExpense} className="inline">
                        <Hidden values={{ locale, id: e.id }} />
                        <ConfirmButton message={a.common.confirmDelete}>{a.common.delete}</ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
