import { isUsableTimeline, pointOffsets, secondsAtOffset } from './route-timeline';
import type { Route, RouteWarning, RouteWarningsPoint, RouteWeatherPoint } from './types';

/** Max points sent to /api/route-warnings (the server accepts up to 400). */
const MAX_POINTS = 300;
/** Samples at least this far apart, so short county crossings between checkpoints are not missed. */
const MIN_SPACING_METERS = 4000;
/** A sample this close to a checkpoint adds nothing. */
const DUPLICATE_METERS = 500;

/**
 * Points to check for official warnings: the weather checkpoints plus samples along the geometry,
 * timed from the route's driving timeline (no extra requests), in driving order.
 */
export function warningPoints(route: Route, checkpoints: readonly RouteWeatherPoint[]): RouteWarningsPoint[] {
  const result: RouteWarningsPoint[] = checkpoints.map(({ lat, lon, time, lengthInMeters }) => ({
    lat,
    lon,
    time,
    lengthInMeters,
  }));
  const { lengthInMeters: total, travelTimeInSeconds, departureTime } = route.summary;
  const start = checkpoints[0] ? new Date(checkpoints[0].time).getTime() : new Date(departureTime).getTime();
  if (route.points.length < 2 || total <= 0) return result;

  const secondsAt = (meters: number) =>
    isUsableTimeline(route.timeline) ? secondsAtOffset(route.timeline, meters) : (meters / total) * travelTimeInSeconds;
  const spacing = Math.max(MIN_SPACING_METERS, total / Math.max(1, MAX_POINTS - result.length));
  const offsets = pointOffsets(route.points, total);
  let next = spacing;
  route.points.forEach((point, i) => {
    const meters = offsets[i];
    if (meters < next) return;
    next = meters + spacing;
    if (checkpoints.some((c) => Math.abs(c.lengthInMeters - meters) < DUPLICATE_METERS)) return;
    result.push({
      lat: point.lat,
      lon: point.lon,
      time: new Date(start + secondsAt(meters) * 1000).toISOString(),
      lengthInMeters: Math.round(meters),
    });
  });
  return result.sort((a, b) => a.lengthInMeters - b.lengthInMeters).slice(0, MAX_POINTS);
}

/** Warnings whose affected stretch includes this distance along the route. */
export function warningsAt(warnings: readonly RouteWarning[], lengthInMeters: number): RouteWarning[] {
  return warnings.filter((w) =>
    w.stretches.some((s) => lengthInMeters >= s.fromMeters && lengthInMeters <= s.toMeters),
  );
}

/** English label when known, otherwise the original Polish phenomenon. */
export const warningName = (warning: RouteWarning) => warning.eventLabel ?? warning.event;
