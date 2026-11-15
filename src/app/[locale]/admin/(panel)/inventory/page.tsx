import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { db, getSettings } from "@/lib/db";
import { getDict, INV_CATS } from "@/lib/i18n";
import { num } from "@/lib/format";
import { Badge, Empty, Field, Hidden, Money, PageHeader, Panel, Select } from "@/components/admin/ui";
import { ConfirmButton, SubmitButton } from "@/components/admin/client";
import { adjustInventory, deleteInventory, saveInventory } from "../../actions";

type I = { id: number; name: string; category: string | null; unit: string | null; quantity: number; min_quantity: number; cost: number | null; supplier: string | null; notes: string | null };

export default async function InventoryPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ edit?: string; new?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const a = getDict(locale).admin;
  const base = `/${locale}/admin`;
  const cur = getSettings().currency;
  const rows = db().prepare("SELECT * FROM inventory ORDER BY (quantity <= min_quantity AND min_quantity > 0) DESC, category, name").all() as I[];
  const editing = sp.edit ? rows.find((r) => r.id === Number(sp.edit)) : undefined;
  const value = rows.reduce((s, r) => s + r.quantity * (r.cost || 0), 0);
  const showForm = !!editing || sp.new === "1";

  return (
    <>
      <PageHeader title={a.inventory.title}>
        <div className="rounded-lg bg-white px-4 py-2 text-end">
          <span className="block text-xs text-muted">{a.inventory.value}</span>
          <Money v={value} cur={cur} locale={locale} className="font-bold" />
        </div>
        {!showForm && <Link href={`${base}/inventory?new=1`} className="btn btn-primary">+ {a.inventory.new}</Link>}
      </PageHeader>

      {showForm && (
        <Panel title={editing ? a.common.edit : a.inventory.new} className="mb-4" action={<Link href={`${base}/inventory`} className="text-sm text-muted">{a.common.cancel}</Link>}>
          <form action={saveInventory} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Hidden values={{ locale, id: editing?.id }} />
            <Field label={a.common.name} className="sm:col-span-2"><input name="name" required defaultValue={editing?.name} className="input" /></Field>
            <Field label={a.common.category}><Select name="category" defaultValue={editing?.category ?? "aluminium"} options={INV_CATS.map((c) => [c, a.inventory.categories[c]])} /></Field>
            <Field label={a.common.unit}><input name="unit" placeholder="pcs / m / sheet" defaultValue={editing?.unit ?? ""} className="input" /></Field>
            <Field label={a.common.quantity}><input name="quantity" inputMode="decimal" dir="ltr" defaultValue={editing?.quantity ?? 0} className="input num rtl:text-right" /></Field>
            <Field label={a.inventory.minQty}><input name="min_quantity" inputMode="decimal" dir="ltr" defaultValue={editing?.min_quantity ?? 0} className="input num rtl:text-right" /></Field>
            <Field label={a.inventory.cost}><input name="cost" inputMode="decimal" dir="ltr" defaultValue={editing?.cost ?? ""} className="input num rtl:text-right" /></Field>
            <Field label={a.common.supplier}><input name="supplier" defaultValue={editing?.supplier ?? ""} className="input" /></Field>
            <Field label={a.common.notes} className="sm:col-span-2 lg:col-span-4"><input name="notes" defaultValue={editing?.notes ?? ""} className="input" /></Field>
            <div className="sm:col-span-2 lg:col-span-4"><SubmitButton>{a.common.save}</SubmitButton></div>
          </form>
          {editing && (
            <form action={deleteInventory} className="mt-3 text-end">
              <Hidden values={{ locale, id: editing.id }} />
              <ConfirmButton message={a.common.confirmDelete}>{a.common.delete}</ConfirmButton>
            </form>
          )}
        </Panel>
      )}

      <Panel pad={false}>
        {rows.length === 0 ? <Empty text={a.inventory.empty} /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>{a.common.name}</th><th>{a.common.category}</th><th>{a.common.quantity}</th><th>{a.inventory.adjust}</th><th>{a.inventory.cost}</th><th>{a.common.supplier}</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const low = r.min_quantity > 0 && r.quantity <= r.min_quantity;
                  return (
                    <tr key={r.id}>
                      <td className="font-medium">{r.name}{r.notes && <div className="text-sm font-normal text-muted">{r.notes}</div>}</td>
                      <td className="text-muted">{r.category ? a.inventory.categories[r.category as keyof typeof a.inventory.categories] : ""}</td>
                      <td className="whitespace-nowrap">
                        <span className={`num font-semibold ${low ? "text-bad" : ""}`}>{num(r.quantity)}</span> <span className="text-muted">{r.unit}</span>
                        {low && <span className="ms-2"><Badge tone="red">{a.inventory.low}</Badge></span>}
                      </td>
                      <td>
                        <div className="flex gap-1">
                          {[-1, 1].map((d) => (
                            <form key={d} action={adjustInventory}>
                              <Hidden values={{ locale, id: r.id, delta: d }} />
                              <SubmitButton className="grid h-8 w-8 place-items-center rounded-md border border-line hover:bg-stone">{d < 0 ? <Minus size={14} /> : <Plus size={14} />}</SubmitButton>
                            </form>
                          ))}
                        </div>
                      </td>
                      <td>{r.cost ? <Money v={r.cost} cur={cur} locale={locale} className="text-muted" /> : ""}</td>
                      <td className="text-muted">{r.supplier}</td>
                      <td className="text-end"><Link href={`${base}/inventory?edit=${r.id}`} className="btn btn-ghost btn-sm">{a.common.edit}</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
