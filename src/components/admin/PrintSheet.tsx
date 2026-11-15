import { Logo } from "@/components/Logo";
import { PrintButton } from "./client";

/** A4-ish sheet with the company letterhead. */
export function PrintSheet({ s, title, meta, printLabel, children }: { s: Record<string, string>; title: string; meta: [string, string][]; printLabel: string; children: React.ReactNode }) {
  return (
    <>
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] justify-end px-4">
        <PrintButton label={printLabel} />
      </div>
      <article className="mx-auto min-h-[297mm] max-w-[210mm] bg-white p-[14mm] text-[13px] shadow-sm print:min-h-0 print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-graphite pb-5">
          <div>
            <Logo height={40} />
            <div className="mt-3 space-y-0.5 text-[12px] text-muted">
              <p>{s.address}</p>
              <p dir="ltr" className="rtl:text-right">{[s.phone1, s.phone2].filter(Boolean).join("  ·  ")}</p>
              {s.email && <p dir="ltr" className="rtl:text-right">{s.email}</p>}
            </div>
          </div>
          <div className="text-end">
            <h1 className="text-2xl font-bold">{title}</h1>
            <dl className="mt-2 space-y-0.5">
              {meta.map(([k, v]) => (
                <div key={k} className="flex justify-end gap-3">
                  <dt className="text-muted">{k}</dt>
                  <dd className="num font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </header>
        {children}
      </article>
    </>
  );
}
