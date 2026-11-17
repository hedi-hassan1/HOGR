import { runDebtAlerts, runMonthlyReport, runReminders } from "@/lib/notify";
import { runBackup } from "@/lib/extras";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Daily job (Vercel Cron, 09:00 Kurdistan time): reminders, debt alerts, monthly report, backup. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const reminders = await runReminders().catch(() => ({ sent: 0 }));
  const debts = await runDebtAlerts().catch(() => ({ sent: 0 }));
  const report = await runMonthlyReport().catch(() => false);
  await runBackup().catch(() => {});
  return Response.json({ ok: true, reminders: reminders.sent, debts: debts.sent, report });
}
