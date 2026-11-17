import { db, getSettings } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { Badge, Field, Hidden, PageHeader, Panel, Select } from "@/components/admin/ui";
import { ConfirmButton, SubmitButton } from "@/components/admin/client";
import { backupNow } from "../../actions";
import { listBackups } from "@/lib/extras";
import { IS_CLOUD } from "@/lib/db";
import { addUser, deleteUser, removePushDevice, saveNotifySettings, saveSettings, sendRemindersNow, testPush } from "../../actions";
import { PushSetup } from "@/components/admin/Pwa";
import { getVapid, listSubscriptions } from "@/lib/push";
import { dateFmt } from "@/lib/format";
import { BellRing } from "lucide-react";
import { PasswordForm } from "./PasswordForm";

export default async function SettingsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ saved?: string; notify?: string; backup?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = await requireUser(locale);
  const a = getDict(locale).admin;
  const s = (await getSettings());
  const users = await db().prepare("SELECT id, name, username, role FROM users ORDER BY id").all() as { id: number; name: string; username: string; role: "admin" | "staff" }[];
  const isAdmin = user.role === "admin";
  const fu = a.followup;
  const devices = (await listSubscriptions());
  const backups = listBackups();
  const vapidKey = (await getVapid()).publicKey;
  const n = sp.notify || "";
  const notifyMsg: { ok: boolean; text: string } | null =
    n === "saved" ? { ok: true, text: a.common.saved }
    : n === "token" ? { ok: false, text: fu.tokenBad }
    : n === "nochat" ? { ok: false, text: fu.noChat }
    : n === "network" ? { ok: false, text: fu.network }
    : n === "testok" ? { ok: true, text: fu.testOk }
    : n === "testfail" ? { ok: false, text: fu.pushFail }
    : n === "none" ? { ok: true, text: fu.checkedNone }
    : n.startsWith("sent-") ? { ok: true, text: fu.checkedSent.replace("{n}", n.slice(5)) }
    : null;

  return (
    <>
      <PageHeader title={a.settings.title} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={a.settings.company} className="lg:row-span-2" action={sp.saved && <Badge tone="green">{a.common.saved}</Badge>}>
          {!isAdmin && <p className="mb-4 text-sm text-muted">{a.settings.onlyAdmin}</p>}
          <form action={saveSettings} className="grid gap-4 sm:grid-cols-2">
            <fieldset disabled={!isAdmin} className="contents">
              <Hidden values={{ locale }} />
              <Field label={a.settings.companyName} className="sm:col-span-2"><input name="company_name" defaultValue={s.company_name} className="input" /></Field>
              <Field label={`${a.common.phone} 1`}><input name="phone1" dir="ltr" defaultValue={s.phone1} className="input rtl:text-right" /></Field>
              <Field label={`${a.common.phone} 2`}><input name="phone2" dir="ltr" defaultValue={s.phone2} className="input rtl:text-right" /></Field>
              <Field label={a.settings.whatsapp}><input name="whatsapp" dir="ltr" defaultValue={s.whatsapp} className="input rtl:text-right" /></Field>
              <Field label={a.settings.email}><input name="email" type="email" dir="ltr" defaultValue={s.email} className="input rtl:text-right" /></Field>
              <Field label={`${a.common.address} (کوردی)`}><input name="address_ckb" dir="rtl" defaultValue={s.address_ckb} className="input" /></Field>
              <Field label={`${a.common.address} (عربي)`}><input name="address_ar" dir="rtl" defaultValue={s.address_ar} className="input" /></Field>
              <Field label={`${a.common.address} (English)`} className="sm:col-span-2"><input name="address" dir="ltr" defaultValue={s.address} className="input" /></Field>
              <Field label={a.settings.facebook}><input name="facebook" dir="ltr" defaultValue={s.facebook} className="input" /></Field>
              <Field label={a.settings.instagram}><input name="instagram" dir="ltr" defaultValue={s.instagram} className="input" /></Field>
              <Field label={a.settings.currency}><Select name="currency" defaultValue={s.currency} options={[["IQD", "IQD (د.ع)"], ["USD", "USD ($)"]]} /></Field>
              <Field label={a.siteUrl} className="sm:col-span-2">
                <input name="site_url" dir="ltr" defaultValue={s.site_url} placeholder="https://hogrco.com" className="input" />
                <span className="mt-1 block text-xs text-muted">{a.siteUrlHint}</span>
              </Field>
              {!IS_CLOUD && <Field label={a.backup.dir} className="sm:col-span-2">
                <input name="backup_dir" dir="ltr" defaultValue={s.backup_dir} placeholder="E:\HOGR-backups" className="input" />
                <span className="mt-1 block text-xs text-muted">{a.backup.dirHint}</span>
              </Field>}
              <div className="sm:col-span-2"><SubmitButton>{a.common.save}</SubmitButton></div>
            </fieldset>
          </form>
        </Panel>

        <Panel title={a.settings.changePassword}>
          <PasswordForm locale={locale} L={a.settings} save={a.common.save} />
        </Panel>

        <section id="backup" className="scroll-mt-20 rounded-xl border border-line bg-white">
          <h2 className="border-b border-line px-5 py-3.5 font-semibold">{a.backup.title}</h2>
          <div className="p-5">
            <p className="text-muted">{IS_CLOUD ? a.backup.cloud : a.backup.text}</p>
            <p className="mt-2 text-sm">{a.backup.last}: <b>{s.backup_last ? dateFmt(s.backup_last, locale) : "—"}</b></p>
            {sp.backup && <p role="status" className="mt-2"><Badge tone={sp.backup === "ok" ? "green" : "amber"}>{sp.backup === "ok" ? a.backup.done : a.backup.failed}</Badge></p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {isAdmin && !IS_CLOUD && <form action={backupNow}><Hidden values={{ locale }} /><SubmitButton className="btn btn-primary btn-sm">{a.backup.now}</SubmitButton></form>}
              <a href="/api/backup" className="btn btn-ghost btn-sm">{a.settings.download}</a>
            </div>
            {!IS_CLOUD && <h3 className="mb-2 mt-5 text-sm font-semibold">{a.backup.list}</h3>}
            {IS_CLOUD ? null : backups.length === 0 ? <p className="text-sm text-muted">{a.backup.none}</p> : (
              <ul className="max-h-48 divide-y divide-[#eceae6] overflow-y-auto rounded-lg border border-line text-sm">
                {backups.map((b) => (
                  <li key={b.file} className="flex items-center justify-between gap-3 px-3 py-1.5">
                    <span className="num" dir="ltr">{b.file}</span>
                    <span className="flex items-center gap-3"><span className="num text-xs text-muted" dir="ltr">{Math.round(b.size / 1024)} KB</span>{isAdmin && <a href={`/api/backup?file=${b.file}`} className="text-xs underline">{a.settings.download}</a>}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section id="notify" className="scroll-mt-20 rounded-xl border border-line bg-white lg:col-span-2">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5">
            <BellRing size={18} className="text-brass" />
            <h2 className="font-semibold">{fu.notifyTitle}</h2>
            <Badge tone={devices.length ? "green" : "gray"}>{devices.length ? `${devices.length} ✓` : fu.pushNone}</Badge>
          </div>
          <div className="grid gap-6 p-5 lg:grid-cols-2">
            <div>
              <p className="mb-4 text-muted">{fu.pushIntro}</p>
              <ol className="mb-5 space-y-3">
                {[fu.pushStep1, fu.pushStep2, fu.pushStep3].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-graphite text-sm text-white">{i + 1}</span>
                    <span className="pt-0.5 text-[15px]">{step}</span>
                  </li>
                ))}
              </ol>
              <PushSetup vapidKey={vapidKey} L={fu} />
              {notifyMsg && (
                <p role="status" className={`mt-4 rounded-lg px-4 py-3 text-sm ${notifyMsg.ok ? "bg-[#dff0e6] text-[#23633f]" : "bg-[#f6e1df] text-[#9a332c]"}`}>{notifyMsg.text}</p>
              )}
              <h3 className="mb-2 mt-6 text-sm font-semibold">{fu.pushDevices}</h3>
              {devices.length === 0 ? (
                <p className="text-sm text-muted">{fu.pushNone}</p>
              ) : (
                <ul className="divide-y divide-[#eceae6] rounded-lg border border-line">
                  {devices.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span>{d.label} <span className="text-muted">· {dateFmt(d.created_at.slice(0, 10), locale)}</span></span>
                      <form action={removePushDevice}><Hidden values={{ locale, id: d.id }} /><ConfirmButton message={a.common.confirmDelete} className="text-xs text-muted underline hover:text-bad">{fu.pushRemove}</ConfirmButton></form>
                    </li>
                  ))}
                </ul>
              )}
              {devices.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={testPush}><Hidden values={{ locale }} /><SubmitButton className="btn btn-ghost btn-sm">{fu.pushTest}</SubmitButton></form>
                  {isAdmin && <form action={sendRemindersNow}><Hidden values={{ locale }} /><SubmitButton className="btn btn-ghost btn-sm">{fu.checkNow}</SubmitButton></form>}
                </div>
              )}
            </div>
            <div className="space-y-4">
              {!isAdmin && <p className="text-sm text-muted">{a.settings.onlyAdmin}</p>}
              <form action={saveNotifySettings} className="grid gap-3 sm:grid-cols-2">
                <fieldset disabled={!isAdmin} className="contents">
                  <Hidden values={{ locale }} />
                  <h3 className="text-sm font-semibold sm:col-span-2">{a.nav.measurements}</h3>
                  <Field label={fu.redDays}><input name="followup_red_days" type="number" min={1} max={60} defaultValue={s.followup_red_days || 3} className="input num" dir="ltr" /></Field>
                  <Field label={fu.notifyDays}><input name="followup_notify_days" type="number" min={1} max={60} defaultValue={s.followup_notify_days || 5} className="input num" dir="ltr" /></Field>
                  <h3 className="mt-2 text-sm font-semibold sm:col-span-2">{fu.debtSettings}</h3>
                  <Field label={a.debts.days}><input name="debt_days" type="number" min={1} max={60} defaultValue={s.debt_days || 7} className="input num" dir="ltr" /></Field>
                  <Field label={a.debts.remindIn}><Select name="debt_locale" defaultValue={s.debt_locale || "ckb"} options={[["ckb", "کوردی"], ["ar", "العربية"], ["en", "English"]]} /></Field>
                  <h3 className="mt-2 text-sm font-semibold sm:col-span-2">{fu.reportSettings}</h3>
                  <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" name="report_monthly" defaultChecked={s.report_monthly !== "0"} className="mt-0.5 h-4 w-4 accent-graphite" /> {a.reports.auto}</label>
                  <Field label={fu.lang}><Select name="notify_locale" defaultValue={s.notify_locale || "ckb"} options={[["ckb", "کوردی"], ["ar", "العربية"], ["en", "English"]]} /></Field>
                  <div className="flex items-end"><SubmitButton>{a.common.save}</SubmitButton></div>
                </fieldset>
              </form>
              <p className="text-xs text-muted">{fu.note}</p>
            </div>
          </div>
        </section>

        <Panel title={a.settings.logo} className="lg:col-span-2">
          <p className="mb-4 text-muted">{a.settings.logoText}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { f: "hogr-logo.svg", bg: "bg-white" },
              { f: "hogr-logo-white.svg", bg: "bg-graphite" },
              { f: "hogr-mark.svg", bg: "bg-white" },
              { f: "hogr-mark-white.svg", bg: "bg-graphite" },
              { f: "hogr-app-icon.svg", bg: "bg-white" },
            ].map(({ f, bg }) => (
              <a key={f} href={`/brand/${f}`} download className="group overflow-hidden rounded-lg border border-line">
                <span className={`flex h-24 items-center justify-center p-4 ${bg}`}><img src={`/brand/${f}`} alt="" className="max-h-12 max-w-full" /></span>
                <span className="block border-t border-line bg-white px-3 py-2 text-xs text-muted group-hover:text-graphite" dir="ltr">{f}</span>
              </a>
            ))}
          </div>
        </Panel>

        <Panel title={a.settings.users} className="lg:col-span-2" pad={false}>
          <table className="table">
            <thead><tr><th>{a.common.name}</th><th>{a.login.username}</th><th>{a.settings.role}</th><th /></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.name}</td>
                  <td className="num" dir="ltr" style={{ textAlign: "start" }}>{u.username}</td>
                  <td><Badge tone={u.role === "admin" ? "dark" : "gray"}>{a.settings.roles[u.role]}</Badge></td>
                  <td className="text-end">
                    {isAdmin && u.id !== user.id && (
                      <form action={deleteUser}>
                        <Hidden values={{ locale, id: u.id }} />
                        <ConfirmButton message={a.common.confirmDelete}>{a.common.delete}</ConfirmButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isAdmin && (
            <form action={addUser} className="grid gap-3 border-t border-line p-5 sm:grid-cols-2 lg:grid-cols-5">
              <Hidden values={{ locale }} />
              <Field label={a.common.name}><input name="name" required className="input" /></Field>
              <Field label={a.login.username}><input name="username" required dir="ltr" autoComplete="off" className="input rtl:text-right" /></Field>
              <Field label={a.settings.password}><input name="password" required minLength={6} type="password" autoComplete="new-password" dir="ltr" className="input" /></Field>
              <Field label={a.settings.role}><Select name="role" defaultValue="staff" options={[["staff", a.settings.roles.staff], ["admin", a.settings.roles.admin]]} /></Field>
              <div className="flex items-end"><SubmitButton>+ {a.settings.newUser}</SubmitButton></div>
            </form>
          )}
        </Panel>
      </div>
    </>
  );
}
