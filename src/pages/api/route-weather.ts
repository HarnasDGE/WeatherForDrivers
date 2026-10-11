import type { LatLon, RouteWeatherRequest } from '@/lib/shared/types';
import { handle, isValidLatLon, methodNotAllowed, jsonData, parseNumberInRange } from '@/lib/server/api';
import { badRequest } from '@/lib/server/errors';
import { getWeatherAlongRoutes } from '@/lib/server/services/route-weather';

const MAX_ROUTES = 3;
const MAX_POINTS_PER_ROUTE = 50_000;
const CONTROL_POINTS_MIN = 3;
const CONTROL_POINTS_MAX = 20;

/**
 * POST /api/route-weather
 * body: RouteWeatherRequest { routes: { points: LatLon[] }[], controlPoints }
 * -> { data: RouteWeather[] } (one entry per route, request order)
 */
export const POST = handle(async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw badRequest('Request body must be valid JSON.');
  }
  const { routes, controlPoints } = parseBody(body);
  return jsonData(await getWeatherAlongRoutes(routes, controlPoints));
});

export const ALL = methodNotAllowed(['POST']);

function parseBody(body: unknown): RouteWeatherRequest {
  if (typeof body !== 'object' || body === null) throw badRequest('Request body must be a JSON object.');
  const { routes, controlPoints } = body as Record<string, unknown>;

  if (!Array.isArray(routes) || routes.length === 0 || routes.length > MAX_ROUTES) {
    throw badRequest(`"routes" must be an array of 1..${MAX_ROUTES} routes.`);
  }
  const parsedRoutes = routes.map((route, i) => {
    const points = (route as { points?: unknown } | null)?.points;
    if (!Array.isArray(points) || points.length < 2 || points.length > MAX_POINTS_PER_ROUTE) {
      throw badRequest(`"routes[${i}].points" must be an array of 2..${MAX_POINTS_PER_ROUTE} points.`);
    }
    if (!points.every(isValidLatLon)) {
      throw badRequest(`"routes[${i}].points" must contain only { lat, lon } numbers in valid ranges.`);
    }
    return { points: (points as LatLon[]).map(({ lat, lon }) => ({ lat, lon })) };
  });

  return {
    routes: parsedRoutes,
    controlPoints: parseNumberInRange(controlPoints, 'controlPoints', CONTROL_POINTS_MIN, CONTROL_POINTS_MAX, {
      integer: true,
    }),
  };
}
