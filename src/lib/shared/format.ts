const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

const clockFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

/** Local wall-clock ISO string from the forecast ("2026-10-11T07:02") -> "07:02". */
export function formatLocalTime(localIso: string | null | undefined): string {
  return localIso ? localIso.substring(11, 16) : '--:--';
}

/** Absolute instant (ISO with offset or Z) -> "HH:MM" in the browser's timezone. */
export function formatClock(iso: string): string {
  return clockFormat.format(new Date(iso));
}

/** "YYYY-MM-DD[THH:MM]" -> weekday name; parsed as a calendar date so the browser timezone does not shift it. */
export function getNameDayFromDate(date: string): string {
  const [y, m, d] = date.substring(0, 10).split('-').map(Number);
  return DAY_NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** Seconds -> driving duration, e.g. 9660 -> "2 h 41 min", 2280 -> "38 min". */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.round(Math.max(0, totalSeconds) / 60);
  if (minutes < 1) return '<1 min';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function formatDistanceKm(meters: number): string {
  return `${Math.round(meters / 1000)} km`;
}

/** Rounded degrees without unit letter, e.g. "7°", "-2°"; "--" when unknown. */
export function formatTemperature(value: number | null | undefined): string {
  return value == null ? '--' : `${Math.round(value)}°`;
}
