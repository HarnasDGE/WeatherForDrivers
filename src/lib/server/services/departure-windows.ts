import type { DepartureWindow, DepartureWindowsRequest } from '@/lib/shared/types';
import { roundToFifteenMinutes, toUtcDateString } from '../time';
import { getQuarterHourWeather } from './openmeteo';
import { findQuarterHourIndex } from './route-weather';

/** Departures `count` x `stepMinutes` apart, starting at `start`. */
export function departureTimes({ start, count, stepMinutes }: Omit<DepartureWindowsRequest, 'checkpoints'>): Date[] {
  const first = new Date(start).getTime();
  return Array.from({ length: count }, (_, i) => new Date(first + i * stepMinutes * 60_000));
}

/**
 * Weather at every checkpoint for many departures, assuming the same driving times for each
 * (traffic differences between hours are ignored). One Open-Meteo request covers all of it.
 */
export async function getDepartureWindows(request: DepartureWindowsRequest): Promise<DepartureWindow[]> {
  const departures = departureTimes(request);
  const lastOffset = Math.max(...request.checkpoints.map((c) => c.offsetSeconds));
  const lastArrival = new Date(departures[departures.length - 1].getTime() + lastOffset * 1000);
  const series = await getQuarterHourWeather(
    request.checkpoints,
    toUtcDateString(departures[0]),
    toUtcDateString(roundToFifteenMinutes(lastArrival)),
  );

  return departures.map((departure) => ({
    departure: departure.toISOString(),
    points: request.checkpoints.map((checkpoint, i) => {
      const arrival = new Date(departure.getTime() + checkpoint.offsetSeconds * 1000);
      const s = series[i];
      const index = s ? findQuarterHourIndex(s.time, arrival) : -1;
      const isDay = index === -1 ? null : s.isDay[index];
      return {
        time: roundToFifteenMinutes(arrival).toISOString(),
        temperature: index === -1 ? null : s.temperature2m[index],
        weatherCode: index === -1 ? null : s.weatherCode[index],
        isDay: isDay == null ? null : isDay === 1,
        dewPoint: index === -1 ? null : s.dewPoint2m[index],
        surfaceTemperature: index === -1 ? null : s.surfaceTemperature[index],
      };
    }),
  }));
}
