"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, className = "btn btn-primary", pendingText }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-60`}>
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

/** A delete button that asks before submitting its parent form. */
export function ConfirmButton({ children, message, className = "btn btn-danger btn-sm" }: { children: React.ReactNode; message: string; className?: string }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-primary">
      {label}
    </button>
  );
}

/** Submits the parent form when the value changes (used for quick status changes). */
export function AutoSelect({ name, options, defaultValue, className = "input py-1.5 text-sm" }: { name: string; options: [string, string][]; defaultValue: string; className?: string }) {
  return (
    <select name={name} defaultValue={defaultValue} className={className} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
      {options.map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}
