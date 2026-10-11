import { PLACE_ON_THE_ROAD, type LatLon, type RouteWeather, type RouteWeatherPoint } from '@/lib/shared/types';
import { ROUTE_WEATHER_CONCURRENCY, requireSecret } from '../config';
import { HttpError } from '../errors';
import { mapWithConcurrency } from '../http';
import { roundToFifteenMinutes, toUtcDateString, toUtcMinuteString } from '../time';
import { getQuarterHourWeather } from './openmeteo';
import { reverseGeocode } from './openweather';
import { getTravelSummary } from './tomtom';

/**
 * Weather along routes - port of legacy `fetchWeatherInformation`
 * (_legacy/src/actions/roadActions.js). For each route:
 *  1. pick control points from the route geometry,
 *  2. ask TomTom for distance / travel time / arrival time from the route start,
 *  3. round the arrival to 15 min and look it up in Open-Meteo `minutely_15`,
 *  4. reverse-geocode the point name (OpenWeatherMap).
 *
 * Differences from legacy (same results, fewer/safer requests):
 *  - the `delay(index * 1000)` staggering is replaced by a bounded worker pool
 *    (ROUTE_WEATHER_CONCURRENCY) + retry with backoff on 429/5xx;
 *  - identical points (shared start/destination of alternatives) are fetched once;
 *  - the route start itself needs no TomTom call (distance 0, arrival = now);
 *  - Open-Meteo is queried once for all points (multi-location request);
 *  - times are matched as UTC instants, independent of the server timezone.
 */

/**
 * Legacy control-point selection: every `interval`-th point plus the last one,
 * where interval = floor(length / controlPoints + 1).
 */
export function selectControlPoints<T>(points: readonly T[], controlPoints: number): T[] {
  const interval = Math.floor(points.length / controlPoints + 1);
  return points.filter((_, index) => index % interval === 0 || index === points.length - 1);
}

/** Index of the rounded arrival in Open-Meteo's minutely_15 time axis (legacy findIndex). */
export function findQuarterHourIndex(times: readonly string[], arrival: Date): number {
  return times.indexOf(toUtcMinuteString(roundToFifteenMinutes(arrival)));
}

const pointKey = (p: LatLon) => `${p.lat},${p.lon}`;

interface PointTravel {
  point: LatLon;
  lengthInMeters: number;
  travelTimeInSeconds: number;
  arrival: Date;
  name: string;
}

export async function getWeatherAlongRoutes(
  routes: ReadonlyArray<{ points: readonly LatLon[] }>,
  controlPoints: number,
): Promise<RouteWeather[]> {
  // Fail fast with a readable config error before doing any work.
  requireSecret('TOMTOM_API_KEY');
  requireSecret('OPENWEATHER_API_KEY');

  const now = new Date();
  const perRoute = routes.map((route) => ({
    start: route.points[0] as LatLon,
    selected: selectControlPoints(route.points, controlPoints),
  }));

  // Unique (start, point) pairs across all routes.
  const tasks = new Map<string, { start: LatLon; point: LatLon }>();
  for (const { start, selected } of perRoute) {
    for (const point of selected) tasks.set(`${pointKey(start)}>${pointKey(point)}`, { start, point });
  }
  const taskList = [...tasks.entries()];

  const travels = await mapWithConcurrency(taskList, ROUTE_WEATHER_CONCURRENCY, async ([, { start, point }]) => {
    const isStart = pointKey(start) === pointKey(point);
    const [summary, name] = await Promise.all([
      isStart ? null : getTravelSummary(start, point),
      reverseGeocodeSafe(point),
    ]);
    if (!isStart && !summary) {
      throw new HttpError(502, 'UPSTREAM_ERROR', `TomTom found no route to control point ${pointKey(point)}.`);
    }
    return {
      point,
      lengthInMeters: summary?.lengthInMeters ?? 0,
      travelTimeInSeconds: summary?.travelTimeInSeconds ?? 0,
      arrival: summary ? new Date(summary.arrivalTime) : now,
      name: name ?? PLACE_ON_THE_ROAD,
    } satisfies PointTravel;
  });
  const travelByKey = new Map(taskList.map(([key], i) => [key, travels[i] as PointTravel]));

  // One Open-Meteo request for all unique points, covering all arrival dates.
  const uniquePoints = [...new Map(travels.map((t) => [pointKey(t.point), t.point])).values()];
  const roundedArrivals = travels.map((t) => roundToFifteenMinutes(t.arrival));
  const dates = roundedArrivals.map(toUtcDateString).sort();
  const weatherSeries = await getQuarterHourWeather(uniquePoints, dates[0] ?? toUtcDateString(now), dates.at(-1) ?? toUtcDateString(now));
  const seriesByPoint = new Map(uniquePoints.map((p, i) => [pointKey(p), weatherSeries[i]]));

  return perRoute.map(({ start, selected }, routeIndex) => ({
    routeIndex,
    points: selected.map((point): RouteWeatherPoint => {
      const travel = travelByKey.get(`${pointKey(start)}>${pointKey(point)}`) as PointTravel;
      const series = seriesByPoint.get(pointKey(point));
      const rounded = roundToFifteenMinutes(travel.arrival);
      const index = series ? findQuarterHourIndex(series.time, travel.arrival) : -1;
      const temperature = index === -1 ? null : (series?.temperature2m[index] ?? null);
      const isDay = index === -1 ? null : (series?.isDay[index] ?? null);
      return {
        lat: point.lat,
        lon: point.lon,
        name: travel.name,
        lengthInMeters: travel.lengthInMeters,
        travelTimeInSeconds: travel.travelTimeInSeconds,
        time: rounded.toISOString(),
        temperature: temperature === null ? null : Math.round(temperature * 10) / 10,
        weatherCode: index === -1 ? null : (series?.weatherCode[index] ?? null),
        isDay: isDay === null ? null : isDay === 1,
      };
    }),
  }));
}

/** Name lookup is cosmetic: upstream failures fall back to the legacy placeholder name. */
async function reverseGeocodeSafe(point: LatLon): Promise<string | null> {
  try {
    return await reverseGeocode(point);
  } catch (error) {
    if (error instanceof HttpError && error.code === 'CONFIG_MISSING_KEY') throw error;
    return null;
  }
}
