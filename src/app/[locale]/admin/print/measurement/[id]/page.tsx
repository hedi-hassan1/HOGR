import { notFound } from "next/navigation";
import { db, getSettings } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { dateFmt, num } from "@/lib/format";
import { PrintSheet } from "@/components/admin/PrintSheet";
import { ItemSketch } from "@/components/admin/ItemSketch";

export default async function PrintMeasurement({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const t = getDict(locale);
  const a = t.admin;
  const s = getSettings(locale);
  const m = db().prepare("SELECT m.*, c.name cname, c.phone cphone FROM measurements m JOIN clients c ON c.id = m.client_id WHERE m.id = ?").get(Number(id)) as
    | { id: number; cname: string; cphone: string | null; title: string | null; address: string | null; taken_by: string | null; date: string | null; notes: string | null }
    | undefined;
  if (!m) notFound();
  const items = db().prepare("SELECT * FROM measurement_items WHERE measurement_id = ? ORDER BY sort, id").all(m.id) as { product_type: string; room: string | null; width: number | null; height: number | null; depth: number | null; qty: number; material: string | null; color: string | null; notes: string | null; photo: string | null }[];

  return (
    <PrintSheet
      s={s}
      title={a.measurements.sheet}
      printLabel={a.common.print}
      meta={[["#", String(m.id)], [a.common.date, dateFmt(m.date, locale)], [a.measurements.takenBy, m.taken_by || ""]]}
    >
      <section className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <p className="text-[11px] text-muted">{a.common.client}</p>
          <p className="text-base font-semibold">{m.cname}</p>
          {m.cphone && <p dir="ltr" className="num rtl:text-right">{m.cphone}</p>}
        </div>
        <div>
          <p className="text-[11px] text-muted">{a.common.address}</p>
          <p>{m.address}</p>
          {m.title && <p className="font-medium">{m.title}</p>}
        </div>
      </section>

      <table className="mt-6 w-full border-collapse">
        <thead>
          <tr className="border-b border-graphite text-[11px] text-muted">
            <th className="py-2 text-start font-medium">#</th>
            <th className="py-2 text-start font-medium">{a.common.type}</th>
            <th className="py-2 text-start font-medium">{a.measurements.room}</th>
            <th className="py-2 text-center font-medium">{a.measurements.width}</th>
            <th className="py-2 text-center font-medium">{a.measurements.height}</th>
            <th className="py-2 text-center font-medium">{a.measurements.depth}</th>
            <th className="py-2 text-center font-medium">{a.measurements.qty}</th>
            <th className="py-2 text-start font-medium">{a.measurements.material} / {a.measurements.color}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, n) => (
            <tr key={n} className="border-b border-[#e3e3df] align-top">
              <td className="num py-2.5 text-muted">{n + 1}</td>
              <td className="py-2.5 font-medium">{t.products[i.product_type as keyof typeof t.products]}</td>
              <td className="py-2.5">{i.room}{i.notes && <span className="block text-[11px] text-muted">{i.notes}</span>}</td>
              <td className="num py-2.5 text-center text-[14px] font-semibold">{num(i.width)}</td>
              <td className="num py-2.5 text-center text-[14px] font-semibold">{num(i.height)}</td>
              <td className="num py-2.5 text-center">{num(i.depth)}</td>
              <td className="num py-2.5 text-center">{i.qty}</td>
              <td className="py-2.5">{[i.material, i.color].filter(Boolean).join(" / ")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {items.length > 0 && (
        <section className="mt-8">
          <p className="mb-2 text-[11px] text-muted">{a.measure.sketch}</p>
          <div className="grid grid-cols-3 gap-3">
            {items.map((i, n) => (
              <figure key={n} className="break-inside-avoid rounded border border-[#e3e3df] p-2">
                <figcaption className="flex justify-between text-[11px]"><span className="num font-semibold">{n + 1}</span><span className="text-muted">{t.products[i.product_type as keyof typeof t.products]}{i.room ? ` · ${i.room}` : ""}</span></figcaption>
                <div className="flex items-center justify-center gap-2">
                  <ItemSketch type={i.product_type} width={i.width} height={i.height} depth={i.depth} size={i.photo ? 110 : 150} />
                  {i.photo && <img src={i.photo} alt="" className="h-24 w-20 rounded object-cover" />}
                </div>
              </figure>
            ))}
          </div>
        </section>
      )}

      {m.notes && <p className="mt-6 whitespace-pre-line rounded bg-[#f5f5f3] p-3">{m.notes}</p>}

      <footer className="mt-14 grid grid-cols-2 gap-10 text-[12px] text-muted">
        <div className="border-t border-graphite pt-2 text-center">{a.measurements.takenBy}</div>
        <div className="border-t border-graphite pt-2 text-center">{a.measurements.signature}</div>
      </footer>
    </PrintSheet>
  );
}
