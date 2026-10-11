/**
 * Time helpers for route weather (ported from _legacy/src/components/methods/timeMethods.js).
 * All computations are done on UTC instants, so results do not depend on the
 * server's local timezone (the legacy code relied on the browser's timezone).
 */

const QUARTER_MS = 15 * 60 * 1000;

/**
 * Rounds to the NEAREST quarter hour (legacy `roundUpToFifteenMinutes` used
 * Math.round despite its name, e.g. 14:07 -> 14:00, 14:08 -> 14:15, 14:53 -> 15:00).
 * Seconds/milliseconds are dropped first, like the legacy `substring(0, 16)`.
 */
export function roundToFifteenMinutes(date: Date): Date {
  const minutePrecision = Math.floor(date.getTime() / 60_000) * 60_000;
  return new Date(Math.round(minutePrecision / QUARTER_MS) * QUARTER_MS);
}

/** "YYYY-MM-DDTHH:MM" in UTC - the format Open-Meteo returns with timezone=GMT. */
export function toUtcMinuteString(date: Date): string {
  return date.toISOString().substring(0, 16);
}

/** "YYYY-MM-DD" in UTC. */
export function toUtcDateString(date: Date): string {
  return date.toISOString().substring(0, 10);
}
