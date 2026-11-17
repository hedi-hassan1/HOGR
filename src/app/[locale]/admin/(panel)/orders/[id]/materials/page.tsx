import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db, orderNo, type OrderItem } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { dateFmt, num } from "@/lib/format";
import { computeMaterials } from "@/lib/extras";
import { Badge, Empty, Hidden, PageHeader, Panel } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { takeMaterials } from "../../../../actions";

export default async function MaterialsPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const t = getDict(locale);
  const a = t.admin;
  const L = a.materials;
  const base = `/${locale}/admin`;
  const o = await db().prepare("SELECT o.id, o.title, o.materials_taken_at, c.name cname FROM orders o JOIN clients c ON c.id = o.client_id WHERE o.id = ?").get(Number(id)) as
    | { id: number; title: string | null; materials_taken_at: string | null; cname: string }
    | undefined;
  if (!o) notFound();
  const items = await db().prepare("SELECT product_type, width, height, qty FROM order_items WHERE order_id = ?").all(o.id) as Pick<OrderItem, "product_type" | "width" | "height" | "qty">[];
  const lines = computeMaterials(items);
  const inventory = await db().prepare("SELECT id, name, category, quantity, unit FROM inventory ORDER BY name").all() as { id: number; name: string; category: string | null; quantity: number; unit: string | null }[];

  return (
    <>
      <Link href={`${base}/orders/${o.id}`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-graphite">
        <ChevronLeft size={16} className="rtl:-scale-x-100" /> {orderNo(o.id)}
      </Link>
      <PageHeader title={L.title} sub={`${o.cname}${o.title ? " · " + o.title : ""}`} />
      <p className="mb-4 rounded-xl border border-[#ecdcbc] bg-[#fbf4e6] px-4 py-3 text-sm">{L.estimate}</p>

      <Panel pad={false}>
        {lines.length === 0 ? <Empty text={L.none} /> : (
          <form action={takeMaterials}>
            <Hidden values={{ locale, id: o.id }} />
            <table className="table">
              <thead><tr><th>{L.material}</th><th>{L.qty}</th><th>{L.stockItem}</th></tr></thead>
              <tbody>
                {lines.map((l) => {
                  const options = inventory.filter((i) => i.category === l.invCategory || (l.invCategory === "aluminium" && i.category === "upvc"));
                  // Hardware is matched by name so handles are never taken from the hinges stock
                  const words: Record<string, RegExp> = { hinges: /hinge|لەولەب|مفصل/i, handles: /handle|دەسک|مقبض|مقابض/i, rails: /rail|ڕێڕەو|سكك|سكة/i };
                  const preset = words[l.key] ? options.find((i) => words[l.key].test(i.name)) : options[0];
                  return (
                    <tr key={l.key}>
                      <td className="font-medium">{L[l.key]}</td>
                      <td className="num whitespace-nowrap text-lg font-bold">{num(l.qty, 1)} <span className="text-sm font-normal text-muted">{L[l.unit]}</span></td>
                      <td>
                        <select name={`inv_${l.key}`} defaultValue={preset?.id ?? ""} disabled={!!o.materials_taken_at} className="input max-w-sm py-2 text-sm">
                          <option value="">—</option>
                          {options.map((i) => (
                            <option key={i.id} value={i.id}>{i.name} ({num(i.quantity)} {i.unit})</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center gap-3 border-t border-line p-4">
              {o.materials_taken_at ? (
                <Badge tone="green">✓ {L.taken.replace("{date}", dateFmt(o.materials_taken_at.slice(0, 10), locale))}</Badge>
              ) : (
                <SubmitButton>{L.take}</SubmitButton>
              )}
            </div>
          </form>
        )}
      </Panel>
    </>
  );
}
