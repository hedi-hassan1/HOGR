"use client";

import { useActionState } from "react";
import { Logo } from "@/components/Logo";
import { LangSwitch } from "@/components/site/Header";
import { login } from "../actions";

export function LoginForm({ locale, t }: { locale: string; t: { title: string; username: string; password: string; submit: string; error: string } }) {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="w-full max-w-sm">
      <Logo height={40} />
      <h1 className="mt-10 text-3xl font-bold">{t.title}</h1>
      <input type="hidden" name="locale" value={locale} />
      <label className="mt-8 block">
        <span className="label">{t.username}</span>
        <input name="username" required autoComplete="username" dir="ltr" className="input py-3 rtl:text-right" autoFocus />
      </label>
      <label className="mt-4 block">
        <span className="label">{t.password}</span>
        <input name="password" type="password" required autoComplete="current-password" dir="ltr" className="input py-3 rtl:text-right" />
      </label>
      {state?.error && <p className="mt-4 text-sm text-bad" role="alert">{t.error}</p>}
      <button disabled={pending} className="btn btn-primary mt-6 w-full py-3 text-base disabled:opacity-60">{t.submit}</button>
      <LangSwitch locale={locale} className="mt-10" />
    </form>
  );
}
