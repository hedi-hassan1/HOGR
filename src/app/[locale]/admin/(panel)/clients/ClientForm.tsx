import { saveClient } from "../../actions";
import { CLIENT_SOURCES, type Dict } from "@/lib/i18n";
import { AREAS } from "@/lib/i18n/areas";
import { Field, Hidden, Select } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";

export type ClientRow = { id: number; name: string; phone: string | null; phone2: string | null; address: string | null; city: string | null; source: string | null; notes: string | null; created_at: string };

export function ClientForm({ locale, a, c, back }: { locale: string; a: Dict["admin"]; c?: ClientRow; back?: string }) {
  return (
    <form action={saveClient} className="grid gap-4 sm:grid-cols-2">
      <Hidden values={{ locale, id: c?.id, back }} />
      <Field label={a.common.name}><input name="name" required defaultValue={c?.name} className="input" /></Field>
      <Field label={a.common.phone}><input name="phone" type="tel" dir="ltr" defaultValue={c?.phone ?? ""} className="input rtl:text-right" /></Field>
      <Field label={a.common.phone2}><input name="phone2" type="tel" dir="ltr" defaultValue={c?.phone2 ?? ""} className="input rtl:text-right" /></Field>
      <Field label={a.common.city}>
        <input name="city" list={`areas-${c?.id ?? "new"}`} defaultValue={c?.city ?? ""} className="input" />
        <datalist id={`areas-${c?.id ?? "new"}`}>{(AREAS[locale] || AREAS.en).map((x) => <option key={x} value={x} />)}</datalist>
      </Field>
      <Field label={a.common.address} className="sm:col-span-2"><input name="address" defaultValue={c?.address ?? ""} className="input" /></Field>
      <Field label={a.common.source}>
        <Select name="source" defaultValue={c?.source} placeholder="—" options={CLIENT_SOURCES.map((s) => [s, a.clients.sources[s]])} />
      </Field>
      <Field label={a.common.notes} className="sm:col-span-2"><textarea name="notes" defaultValue={c?.notes ?? ""} className="input" rows={2} /></Field>
      <div className="sm:col-span-2"><SubmitButton>{a.common.save}</SubmitButton></div>
    </form>
  );
}
