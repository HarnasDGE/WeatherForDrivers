/** Time-of-day buckets used to pick the background image (ported from legacy constans.js). */
export const TIME_OF_DAY_RANGES = [
  { from: 6, to: 10, name: 'morning' },
  { from: 11, to: 15, name: 'midday' },
  { from: 16, to: 19, name: 'evening' },
  { from: 20, to: 22, name: 'moonrise' },
  { from: 23, to: 1, name: 'midnight' },
  { from: 2, to: 5, name: 'moonset' },
] as const;

export type TimeOfDay = (typeof TIME_OF_DAY_RANGES)[number]['name'];

/** Legacy tuple format `[from, to, name]`, kept for compatibility with the old constant. */
export const IMAGES_FOR_TIME_OF_DAY = TIME_OF_DAY_RANGES.map(
  (r) => [r.from, r.to, r.name] as const,
);

/** Bucket for a local hour 0..23 (fractions are floored; ranges may wrap past midnight). */
export function getTimeOfDayForHour(hour: number): TimeOfDay {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  const range = TIME_OF_DAY_RANGES.find((r) => (r.from <= r.to ? h >= r.from && h <= r.to : h >= r.from || h <= r.to));
  return range ? range.name : 'midnight';
}

/** Bucket for a Unix timestamp (seconds) at a location with the given UTC offset (seconds). */
export function getTimeOfDay(unixSeconds: number, timezoneOffsetSeconds: number): TimeOfDay {
  const localHour = new Date((unixSeconds + timezoneOffsetSeconds) * 1000).getUTCHours();
  return getTimeOfDayForHour(localHour);
}
