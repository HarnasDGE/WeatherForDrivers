const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

const pad2 = (n: number) => n.toString().padStart(2, '0');

/** Unix seconds + location UTC offset (seconds) -> "HH:MM" local time at the location. */
export function convertUnixTimeToReadable(unixSeconds: number, timezoneOffsetSeconds: number): string {
  const date = new Date((unixSeconds + timezoneOffsetSeconds) * 1000);
  return `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;
}

/** Local wall-clock ISO string from the forecast ("2026-10-11T07:02") -> "07:02". */
export function formatLocalTime(localIso: string | null | undefined): string {
  return localIso ? localIso.substring(11, 16) : '--:--';
}

/** "YYYY-MM-DD[THH:MM]" -> weekday name; parsed as a calendar date so the browser timezone does not shift it. */
export function getNameDayFromDate(date: string): string {
  const [y, m, d] = date.substring(0, 10).split('-').map(Number);
  return DAY_NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** Clock time (browser local, "HH:MM") of arriving `secondsFromStart` from now. */
export function calculateTimeAtRoute(secondsFromStart: number): string {
  const d = new Date(Date.now() + secondsFromStart * 1000);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Seconds -> compact duration, e.g. 4980 -> "1 h 23 m" (legacy `timeFromSecond`, same simplified units). */
export function formatDuration(totalSeconds: number): string {
  const units = [
    ['y', 365 * 86400],
    ['mo', 30 * 86400],
    ['w', 7 * 86400],
    ['d', 86400],
    ['h', 3600],
    ['m', 60],
    ['s', 1],
  ] as const;
  let rest = Math.max(0, Math.round(totalSeconds));
  const parts: string[] = [];
  for (const [label, size] of units) {
    const value = Math.floor(rest / size);
    rest -= value * size;
    if (value > 0) parts.push(`${value} ${label}`);
  }
  return parts.join(' ') || '0 s';
}

export function formatDistanceKm(meters: number): string {
  return `${Math.round(meters / 1000)} km`;
}

export function formatTemperature(value: number | null | undefined): string {
  return value == null ? '--' : `${Math.round(value * 10) / 10}°C`;
}
