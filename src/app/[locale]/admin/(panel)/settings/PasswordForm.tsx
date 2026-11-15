"use client";

import { useActionState } from "react";
import { changePassword } from "../../actions";

export function PasswordForm({ locale, L, save }: { locale: string; L: { currentPassword: string; newPassword: string; passwordChanged: string; passwordWrong: string }; save: string }) {
  const [state, action, pending] = useActionState(changePassword, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />
      <label><span className="label">{L.currentPassword}</span><input name="current" type="password" required autoComplete="current-password" dir="ltr" className="input" /></label>
      <label><span className="label">{L.newPassword}</span><input name="next" type="password" required minLength={6} autoComplete="new-password" dir="ltr" className="input" /></label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className="btn btn-primary disabled:opacity-60">{save}</button>
        {state?.ok && <span className="text-sm text-ok">{L.passwordChanged}</span>}
        {state?.error === "wrong" && <span className="text-sm text-bad">{L.passwordWrong}</span>}
      </div>
    </form>
  );
}
