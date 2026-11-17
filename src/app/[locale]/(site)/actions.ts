"use server";

import { db, getSettings } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { sendPush } from "@/lib/push";

export type LeadState = { ok: boolean; error?: boolean } | null;

export async function submitLead(_prev: LeadState | FormData, formArg?: FormData): Promise<LeadState> {
  // Also works when the form is sent before the page script loads (then the form data is the only argument)
  const form = formArg ?? (_prev as FormData);
  const get = (k: string) => String(form.get(k) ?? "").trim().slice(0, 2000);
  // Honeypot: real visitors never fill this hidden field.
  if (get("company")) return { ok: true };
  const name = get("name");
  const phone = get("phone");
  if (!name || phone.replace(/\D/g, "").length < 7) return { ok: false, error: true };
  await db().prepare("INSERT INTO leads(name, phone, service, message, preferred_date, address, locale) VALUES (?,?,?,?,?,?,?)")
    .run(name, phone, get("service") || null, get("message") || null, get("date") || null, get("address") || null, get("locale") || null);
  // Tell the staff right away (phone notification); never block the visitor if it fails
  const l = (await getSettings()).notify_locale || "ckb";
  const t = getDict(l);
  const service = t.products[get("service") as keyof typeof t.products];
  sendPush({
    title: t.admin.followup.newLeadTitle,
    body: t.admin.followup.newLeadBody.replace("{name}", name).replace("{phone}", phone) + (service ? ` · ${service}` : ""),
    url: `/${l}/admin/leads`,
    tag: "lead",
  }).catch(() => {});
  return { ok: true };
}
