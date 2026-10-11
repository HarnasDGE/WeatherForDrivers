import { ROUTE_TYPES, type RouteData, type RouteType } from '@/lib/shared/types';
import { handle, jsonData, methodNotAllowed, requiredString } from '@/lib/server/api';
import { requireSecret } from '@/lib/server/config';
import { badRequest, notFound } from '@/lib/server/errors';
import { searchPlaces } from '@/lib/server/services/openmeteo';
import { calculateRoutes } from '@/lib/server/services/tomtom';

/**
 * GET /api/route?from&to[&routeType=fastest] -> { data: RouteData }
 * Geocodes both names (first match) and asks TomTom for the route + 2 alternatives.
 */
export const GET = handle(async ({ url }) => {
  const fromQuery = requiredString(url.searchParams, 'from', 100);
  const toQuery = requiredString(url.searchParams, 'to', 100);
  const routeType = (url.searchParams.get('routeType')?.trim() || 'fastest') as RouteType;
  if (!ROUTE_TYPES.includes(routeType)) {
    throw badRequest(`"routeType" must be one of: ${ROUTE_TYPES.join(', ')}.`);
  }

  requireSecret('TOMTOM_API_KEY'); // fail fast before geocoding

  const [[from], [to]] = await Promise.all([searchPlaces(fromQuery, 1), searchPlaces(toQuery, 1)]);
  if (!from) throw notFound(`Start place "${fromQuery}" not found.`);
  if (!to) throw notFound(`Destination "${toQuery}" not found.`);

  const routes = await calculateRoutes(from, to, routeType);
  if (routes.length === 0) throw notFound(`No route found from "${from.name}" to "${to.name}".`);

  const data: RouteData = { from, to, routeType, routes };
  return jsonData(data);
});

export const ALL = methodNotAllowed(['GET']);
