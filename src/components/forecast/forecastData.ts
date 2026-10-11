import type { Forecast } from '@/lib/shared/types';

/** Index of the current hour in the forecast (times are the location's wall clock); 0 when the forecast is older. */
export function currentHourIndex(forecast: Forecast, now = Date.now()): number {
  const local = new Date(now + forecast.utcOffsetSeconds * 1000).toISOString().substring(0, 13);
  const index = forecast.hourly.time.findIndex((t) => t.startsWith(local));
  return index === -1 ? 0 : index;
}

export interface HourSlot {
  time: string;
  temperature: number | null;
  weatherCode: number | null;
  isDay: boolean | null;
  precipitationProbability: number | null;
  windGusts: number | null;
  visibility: number | null;
}

export function hourSlot(forecast: Forecast, index: number): HourSlot {
  const h = forecast.hourly;
  const isDay = h.isDay[index];
  return {
    time: h.time[index],
    temperature: h.temperature2m[index],
    weatherCode: h.weatherCode[index],
    isDay: isDay == null ? null : isDay === 1,
    precipitationProbability: h.precipitationProbability[index],
    windGusts: h.windGusts10m[index],
    visibility: h.visibility[index],
  };
}

/** The next `count` hours starting with the current one. */
export function nextHours(forecast: Forecast, count: number): HourSlot[] {
  const start = currentHourIndex(forecast);
  const end = Math.min(forecast.hourly.time.length, start + count);
  return Array.from({ length: end - start }, (_, i) => hourSlot(forecast, start + i));
}
