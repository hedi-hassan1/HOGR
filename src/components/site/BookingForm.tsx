"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitLead, type LeadState } from "@/app/[locale]/(site)/actions";

type Labels = {
  name: string; phone: string; service: string; date: string; address: string; message: string;
  submit: string; sending: string; success: string; error: string;
};

export function BookingForm({ locale, labels, products, dark = false, defaultService, defaultMessage }: { locale: string; labels: Labels; products: [string, string][]; dark?: boolean; defaultService?: string; defaultMessage?: string }) {
  const [state, action, pending] = useActionState<LeadState, FormData>(submitLead, null);

  if (state?.ok) {
    return (
      <div className={`flex items-start gap-3 rounded-xl p-6 ${dark ? "bg-white/10 text-white" : "bg-stone"}`} role="status">
        <CheckCircle2 className="mt-0.5 shrink-0 text-brass" />
        <p className="text-lg">{labels.success}</p>
      </div>
    );
  }

  const field = dark ? "input !border-white/15 !bg-white/5 !text-white placeholder:text-white/40" : "input";
  const label = dark ? "label !text-white/60" : "label";

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div>
        <label className={label} htmlFor="bf-name">{labels.name}</label>
        <input id="bf-name" name="name" required className={field} autoComplete="name" />
      </div>
      <div>
        <label className={label} htmlFor="bf-phone">{labels.phone}</label>
        <input id="bf-phone" name="phone" required type="tel" inputMode="tel" dir="ltr" className={`${field} rtl:text-right`} placeholder="07XX XXX XXXX" autoComplete="tel" />
      </div>
      <div>
        <label className={label} htmlFor="bf-service">{labels.service}</label>
        <select id="bf-service" name="service" className={field} defaultValue={defaultService}>
          {products.map(([k, v]) => (
            <option key={k} value={k} className="text-graphite">{v}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={label} htmlFor="bf-date">{labels.date}</label>
        <input id="bf-date" name="date" type="date" className={field} />
      </div>
      <div className="sm:col-span-2">
        <label className={label} htmlFor="bf-address">{labels.address}</label>
        <input id="bf-address" name="address" className={field} />
      </div>
      <div className="sm:col-span-2">
        <label className={label} htmlFor="bf-msg">{labels.message}</label>
        <textarea id="bf-msg" name="message" rows={3} className={field} defaultValue={defaultMessage} />
      </div>
      {state?.error && <p className="text-sm text-bad sm:col-span-2" role="alert">{labels.error}</p>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className={`btn w-full py-3 text-base sm:w-auto ${dark ? "bg-brass text-white hover:bg-[#8d6b36]" : "btn-primary"}`}>
          {pending ? labels.sending : labels.submit}
        </button>
      </div>
    </form>
  );
}
