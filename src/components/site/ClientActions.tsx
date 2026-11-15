"use client";

import { useActionState, useState, useTransition } from "react";
import { CheckCircle2, Star } from "lucide-react";
import { acceptQuote, submitReview } from "@/app/[locale]/admin/actions";

export function AcceptButton({ token, label, done }: { token: string; label: string; done: string }) {
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  if (ok)
    return (
      <p role="status" className="flex items-start gap-3 rounded-xl bg-[#dff0e6] p-5 text-lg text-[#23633f]">
        <CheckCircle2 className="mt-0.5 shrink-0" /> {done}
      </p>
    );
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { const r = await acceptQuote(token); if (r.ok) setOk(true); })}
      className="btn btn-primary w-full py-4 text-lg disabled:opacity-60 sm:w-auto sm:px-10"
    >
      <CheckCircle2 size={20} /> {label}
    </button>
  );
}

type RL = { rating: string; text: string; name: string; submit: string; thanks: string; already: string; need: string };

export function ReviewForm({ token, locale, defaultName, L }: { token: string; locale: string; defaultName: string; L: RL }) {
  const [state, action, pending] = useActionState(submitReview, null);
  const [rating, setRating] = useState(0);
  if (state?.ok) return <p role="status" className="flex items-start gap-3 rounded-xl bg-[#dff0e6] p-5 text-lg text-[#23633f]"><CheckCircle2 className="mt-0.5 shrink-0" /> {L.thanks}</p>;
  if (state?.error === "already") return <p className="rounded-xl bg-stone p-5 text-lg">{L.already}</p>;
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="rating" value={rating || ""} />
      <fieldset>
        <legend className="label">{L.rating}</legend>
        <div className="flex gap-1" dir="ltr">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} / 5`} aria-pressed={rating === n} className="p-1">
              <Star size={40} className={n <= rating ? "fill-brass text-brass" : "text-line"} />
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block"><span className="label">{L.text}</span><textarea name="text" rows={4} className="input" /></label>
      <label className="block"><span className="label">{L.name}</span><input name="name" defaultValue={defaultName} className="input" /></label>
      {state?.error === "rating" && <p className="text-sm text-bad" role="alert">{L.need}</p>}
      <button disabled={pending} className="btn btn-primary w-full py-3.5 text-base disabled:opacity-60 sm:w-auto sm:px-10">{L.submit}</button>
    </form>
  );
}
