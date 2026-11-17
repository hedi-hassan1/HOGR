/** On a normal server: start the 15-minute reminder loop. On Vercel the daily cron (/api/cron) does this instead. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.VERCEL) {
    const { startReminderLoop } = await import("./lib/notify");
    startReminderLoop();
  }
}
