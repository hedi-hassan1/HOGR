/** Runs once when the server starts: begins the reminder check (every 15 minutes). */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startReminderLoop } = await import("./lib/notify");
    startReminderLoop();
  }
}
