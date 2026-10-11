import type { RouteWarningsPoint } from '@/lib/shared/types';
import { handle, isValidLatLon, jsonData, methodNotAllowed } from '@/lib/server/api';
import { isMockMode } from '@/lib/server/config';
import { badRequest } from '@/lib/server/errors';
import { mockRouteWarning } from '@/lib/server/mock/route-warnings';
import { getRouteWarnings } from '@/lib/server/services/imgw';

const MAX_POINTS = 400;
/** Arrival times must be within a sane window around now (warnings are issued up to a few days ahead). */
const MAX_TIME_DISTANCE_MS = 7 * 24 * 3600 * 1000;

/**
 * POST /api/route-warnings
 * body: RouteWarningsRequest { points: { lat, lon, time, lengthInMeters }[] } (driving order)
 * -> { data: RouteWarning[] } official IMGW-PIB warnings valid while the driver is in the warned county.
 * IMGW is keyless and stays live in every mode; mock mode adds one sample warning when there is none.
 */
export const POST = handle(async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw badRequest('Request body must be valid JSON.');
  }
  const points = parsePoints(body);
  const warnings = await getRouteWarnings(points);
  if (warnings.length === 0 && isMockMode()) {
    const sample = mockRouteWarning(points);
    if (sample) warnings.push(sample);
  }
  return jsonData(warnings);
});

export const ALL = methodNotAllowed(['POST']);

function parsePoints(body: unknown): RouteWarningsPoint[] {
  const points = (body as { points?: unknown } | null)?.points;
  if (!Array.isArray(points) || points.length === 0 || points.length > MAX_POINTS) {
    throw badRequest(`"points" must be an array of 1..${MAX_POINTS} points.`);
  }
  const now = Date.now();
  return points.map((point, i) => {
    const { time, lengthInMeters } = (point ?? {}) as Record<string, unknown>;
    const instant = typeof time === 'string' ? new Date(time).getTime() : NaN;
    if (
      !isValidLatLon(point) ||
      Number.isNaN(instant) ||
      Math.abs(instant - now) > MAX_TIME_DISTANCE_MS ||
      typeof lengthInMeters !== 'number' ||
      !Number.isFinite(lengthInMeters) ||
      lengthInMeters < 0
    ) {
      throw badRequest(
        `"points[${i}]" must be { lat, lon, time (ISO 8601, within 7 days of now), lengthInMeters (>= 0) }.`,
      );
    }
    return { lat: point.lat, lon: point.lon, time: new Date(instant).toISOString(), lengthInMeters };
  });
}
