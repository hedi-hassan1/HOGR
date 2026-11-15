import { savePayment } from "../../actions";
import { PAY_METHODS, type Dict } from "@/lib/i18n";
import { todayISO } from "@/lib/format";
import { Field, Hidden, Select } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";

/** Record a payment. Pass clientId to lock the client, or a clients list to choose one. */
export function PaymentForm({
  locale, a, clientId, orderId, orders, clients, back, defaultAmount,
}: {
  locale: string; a: Dict["admin"]; clientId?: number; orderId?: number;
  orders?: [number, string][]; clients?: [number, string][]; back?: string; defaultAmount?: number;
}) {
  return (
    <form action={savePayment} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Hidden values={{ locale, client_id: clientId, order_id: orderId, back }} />
      {!orderId && orders && (
        <Field label={a.common.order} className={clients ? "sm:col-span-2" : "sm:col-span-2 lg:col-span-4"}>
          <Select name="order_id" placeholder="—" options={orders} />
        </Field>
      )}
      {!clientId && clients && (
        <Field label={`${a.common.client} (${a.common.optional})`} className="sm:col-span-2">
          <Select name="client_id" placeholder="—" options={clients} />
        </Field>
      )}
      <Field label={a.common.amount}>
        <input name="amount" required inputMode="decimal" dir="ltr" defaultValue={defaultAmount && defaultAmount > 0 ? Math.round(defaultAmount * 100) / 100 : undefined} className="input num rtl:text-right" />
      </Field>
      <Field label={a.common.method}>
        <Select name="method" defaultValue="cash" options={PAY_METHODS.map((m) => [m, a.payments.methods[m]])} />
      </Field>
      <Field label={a.common.date}><input name="date" type="date" defaultValue={todayISO()} className="input" /></Field>
      <Field label={a.common.notes}><input name="note" className="input" /></Field>
      <div className="sm:col-span-2 lg:col-span-4"><SubmitButton>{a.orders.addPayment}</SubmitButton></div>
    </form>
  );
}
