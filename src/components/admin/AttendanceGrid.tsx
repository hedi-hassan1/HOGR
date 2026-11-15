"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAttendance } from "@/app/[locale]/admin/actions";

const NEXT: Record<string, string | null> = { "": "present", present: "half", half: "absent", absent: null };
const STYLE: Record<string, string> = {
  present: "bg-ok text-white",
  half: "bg-[#c9a25c] text-white",
  absent: "bg-[#f6e1df] text-bad",
  "": "bg-[#f3f3f1] text-muted hover:bg-stone",
};
const MARK: Record<string, string> = { present: "✓", half: "½", absent: "✕", "": "" };

export function AttendanceGrid({ workers, days, initial, fridays, today, labels }: {
  workers: { id: number; name: string }[];
  days: string[];
  initial: Record<number, Record<string, string>>;
  fridays: string[];
  today: string;
  labels: { present: string; half: string; absent: string };
}) {
  const [data, setData] = useState(initial);
  const [, start] = useTransition();
  const router = useRouter();

  const toggle = (wid: number, day: string) => {
    const cur = data[wid]?.[day] || "";
    const next = NEXT[cur];
    setData((d) => ({ ...d, [wid]: { ...(d[wid] || {}), [day]: next || "" } }));
    start(async () => {
      await setAttendance(wid, day, next);
      router.refresh(); // updates days/earned in the summary
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky start-0 z-10 bg-white p-1.5" />
            {days.map((d) => (
              <th key={d} className={`w-8 p-0.5 text-center font-medium ${d === today ? "text-brass" : fridays.includes(d) ? "text-muted/50" : "text-muted"}`}>
                {Number(d.slice(8))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {workers.map((w) => (
            <tr key={w.id}>
              <th className="sticky start-0 z-10 whitespace-nowrap bg-white py-1 pe-3 text-start text-sm font-medium">{w.name}</th>
              {days.map((d) => {
                const st = data[w.id]?.[d] || "";
                return (
                  <td key={d} className="p-0.5">
                    <button
                      type="button"
                      onClick={() => toggle(w.id, d)}
                      title={`${d}${st ? " · " + labels[st as keyof typeof labels] : ""}`}
                      className={`grid h-8 w-8 place-items-center rounded-md text-sm font-bold ${STYLE[st]} ${fridays.includes(d) && !st ? "opacity-50" : ""} ${d === today ? "ring-2 ring-brass" : ""}`}
                    >
                      {MARK[st]}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="grid h-5 w-5 place-items-center rounded bg-ok text-white">✓</span>{labels.present}</span>
        <span className="flex items-center gap-1.5"><span className="grid h-5 w-5 place-items-center rounded bg-[#c9a25c] text-white">½</span>{labels.half}</span>
        <span className="flex items-center gap-1.5"><span className="grid h-5 w-5 place-items-center rounded bg-[#f6e1df] text-bad">✕</span>{labels.absent}</span>
      </div>
    </div>
  );
}
