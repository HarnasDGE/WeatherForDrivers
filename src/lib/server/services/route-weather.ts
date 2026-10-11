import {
  PLACE_ON_THE_ROAD,
  type LatLon,
  type RouteProgress,
  type RouteWeather,
  type RouteWeatherPoint,
} from '@/lib/shared/types';
import { isUsableTimeline, pointOffsets, secondsAtOffset } from '@/lib/shared/route-timeline';
import { ROUTE_WEATHER_CONCURRENCY, requireSecret } from '../config';
import { HttpError } from '../errors';
import { mapWithConcurrency } from '../http';
import { roundToFifteenMinutes, toUtcDateString, toUtcMinuteString } from '../time';
import { getQuarterHourWeather, type QuarterHourWeather } from './openmeteo';
import { reverseGeocode } from './openweather';
import { getTravelSummary } from './tomtom';

/**
 * Weather along routes - port of legacy `fetchWeatherInformation`
 * (_legacy/src/actions/roadActions.js). For each route:
 *  1. pick control points from the route geometry,
 *  2. time each point: from the route's own timeline (TomTom guidance, no extra calls),
 *     or - for routes sent without one - one TomTom summary request per point,
 *  3. round the arrival to 15 min and look it up in Open-Meteo `minutely_15`,
 *  4. reverse-geocode the point name (OpenWeatherMap).
 *
 * Differences from legacy (same results, far fewer requests):
 *  - with a timeline, a whole route check costs one TomTom request (the route itself);
 *  - the fallback uses a bounded worker pool (ROUTE_WEATHER_CONCURRENCY) + retry with backoff;
 *  - identical points (shared start/destination of alternatives) are looked up once;
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

interface Checkpoint {
  point: LatLon;
  lengthInMeters: number;
  travelTimeInSeconds: number;
}

type RouteInput = { points: readonly LatLon[]; timeline?: RouteProgress[] };

/** Checkpoints timed from the route's timeline (no network). */
function timedFromTimeline(points: readonly LatLon[], timeline: RouteProgress[], controlPoints: number): Checkpoint[] {
  const offsets = pointOffsets(points, timeline[timeline.length - 1].offsetMeters);
  const indexed = points.map((point, index) => ({ point, index }));
  return selectControlPoints(indexed, controlPoints).map(({ point, index }) => ({
    point,
    lengthInMeters: Math.round(offsets[index]),
    travelTimeInSeconds: Math.round(secondsAtOffset(timeline, offsets[index])),
  }));
}

/** Fallback for routes without a timeline: one TomTom summary request per checkpoint. */
async function timedByTomTom(points: readonly LatLon[], controlPoints: number, departure: Date): Promise<Checkpoint[]> {
  requireSecret('TOMTOM_API_KEY');
  const start = points[0];
  const selected = selectControlPoints(points, controlPoints);
  return mapWithConcurrency(selected, ROUTE_WEATHER_CONCURRENCY, async (point) => {
    if (pointKey(point) === pointKey(start)) return { point, lengthInMeters: 0, travelTimeInSeconds: 0 };
    const summary = await getTravelSummary(start, point, departure);
    if (!summary)
      throw new HttpError(502, 'UPSTREAM_ERROR', `TomTom found no route to control point ${pointKey(point)}.`);
    return { point, lengthInMeters: summary.lengthInMeters, travelTimeInSeconds: summary.travelTimeInSeconds };
  });
}

/** Weather columns of one series at the arrival, or nulls when the forecast does not cover it. */
function weatherAt(series: QuarterHourWeather | undefined, arrival: Date) {
  const index = series ? findQuarterHourIndex(series.time, arrival) : -1;
  const value = (column: (number | null)[] | undefined) => (index === -1 ? null : (column?.[index] ?? null));
  const temperature = value(series?.temperature2m);
  const isDay = value(series?.isDay);
  return {
    temperature: temperature === null ? null : Math.round(temperature * 10) / 10,
    weatherCode: value(series?.weatherCode),
    isDay: isDay === null ? null : isDay === 1,
    windSpeed: value(series?.windSpeed10m),
    windGusts: value(series?.windGusts10m),
    windDirection: value(series?.windDirection10m),
  };
}

export async function getWeatherAlongRoutes(
  routes: ReadonlyArray<RouteInput>,
  controlPoints: number,
  departure = new Date(),
): Promise<RouteWeather[]> {
  // Fail fast with a readable config error before doing any work.
  requireSecret('OPENWEATHER_API_KEY');

  const perRoute = await Promise.all(
    routes.map((route) =>
      isUsableTimeline(route.timeline)
        ? timedFromTimeline(route.points, route.timeline, controlPoints)
        : timedByTomTom(route.points, controlPoints, departure),
    ),
  );

  // Names and weather once per unique point.
  const uniquePoints = [...new Map(perRoute.flat().map((c) => [pointKey(c.point), c.point])).values()];
  const arrivals = perRoute
    .flat()
    .map((c) => roundToFifteenMinutes(new Date(departure.getTime() + c.travelTimeInSeconds * 1000)));
  const dates = arrivals.map(toUtcDateString).sort();
  const [names, weatherSeries] = await Promise.all([
    mapWithConcurrency(uniquePoints, ROUTE_WEATHER_CONCURRENCY, reverseGeocodeSafe),
    getQuarterHourWeather(
      uniquePoints,
      dates[0] ?? toUtcDateString(departure),
      dates.at(-1) ?? toUtcDateString(departure),
    ),
  ]);
  const nameByPoint = new Map(uniquePoints.map((p, i) => [pointKey(p), names[i]]));
  const seriesByPoint = new Map(uniquePoints.map((p, i) => [pointKey(p), weatherSeries[i]]));

  return perRoute.map((checkpoints, routeIndex) => ({
    routeIndex,
    points: checkpoints.map(({ point, lengthInMeters, travelTimeInSeconds }): RouteWeatherPoint => {
      const arrival = roundToFifteenMinutes(new Date(departure.getTime() + travelTimeInSeconds * 1000));
      return {
        lat: point.lat,
        lon: point.lon,
        name: nameByPoint.get(pointKey(point)) ?? PLACE_ON_THE_ROAD,
        lengthInMeters,
        travelTimeInSeconds,
        time: arrival.toISOString(),
        ...weatherAt(seriesByPoint.get(pointKey(point)), arrival),
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
