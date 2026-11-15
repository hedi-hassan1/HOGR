import { db, getSettings } from "./db";

/**
 * A measurement is "waiting" when it has at least one measured item, wasn't closed by hand,
 * and no order exists for it — neither made from the sheet nor any order for the same client
 * created on or after the measurement day.
 */
export type Waiting = { id: number; client_id: number; name: string; phone: string | null; title: string | null; date: string; days: number; items: number; notified_at: string | null };

export function followupDays() {
  const s = getSettings();
  const red = Math.max(1, parseInt(s.followup_red_days || "3", 10) || 3);
  const notify = Math.max(1, parseInt(s.followup_notify_days || "5", 10) || 5);
  return { red, notify };
}

export function getWaiting(): Waiting[] {
  return db()
    .prepare(
      `SELECT * FROM (
         SELECT m.id, m.client_id, c.name, c.phone, m.title, m.notified_at,
                COALESCE(m.date, date(m.created_at)) AS date,
                CAST(julianday(date('now','localtime')) - julianday(COALESCE(m.date, date(m.created_at))) AS INTEGER) AS days,
                (SELECT COUNT(*) FROM measurement_items i WHERE i.measurement_id = m.id) AS items
         FROM measurements m JOIN clients c ON c.id = m.client_id
         WHERE m.closed = 0
           AND NOT EXISTS (
             SELECT 1 FROM orders o
             WHERE o.measurement_id = m.id
                OR (o.client_id = m.client_id AND date(o.created_at, 'localtime') >= COALESCE(m.date, date(m.created_at)))
           )
       ) WHERE items > 0
       ORDER BY days DESC, id`,
    )
    .all() as Waiting[];
}

/** Only the ones that should show red (waiting at least the "red" number of days). */
export function getOverdue() {
  const { red } = followupDays();
  return getWaiting().filter((w) => w.days >= red);
}

/** Status of one sheet, for its page banner. */
export function waitingInfo(measurementId: number) {
  return getWaiting().find((w) => w.id === measurementId) ?? null;
}
