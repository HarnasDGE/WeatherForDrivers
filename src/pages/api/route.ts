import { ROUTE_TYPES, type Place, type RouteData, type RouteType } from '@/lib/shared/types';
import { handle, jsonData, methodNotAllowed, parseNumberInRange, requiredString } from '@/lib/server/api';
import { isMockMode, requireSecret } from '@/lib/server/config';
import { badRequest, notFound } from '@/lib/server/errors';
import { mockRoutes } from '@/lib/server/mock/routes';
import { searchPlaces } from '@/lib/server/services/openmeteo';
import { calculateRoutes } from '@/lib/server/services/tomtom';

/**
 * GET /api/route?from&to[&routeType=fastest][&fromLat&fromLon][&toLat&toLon] -> { data: RouteData }
 * Geocodes both names (first match) unless coordinates are given, then asks TomTom
 * for the route + 2 alternatives (demo routes in mock mode).
 */
export const GET = handle(async ({ url }) => {
  const params = url.searchParams;
  const routeType = (params.get('routeType')?.trim() || 'fastest') as RouteType;
  if (!ROUTE_TYPES.includes(routeType)) {
    throw badRequest(`"routeType" must be one of: ${ROUTE_TYPES.join(', ')}.`);
  }

  const mock = isMockMode();
  if (!mock) requireSecret('TOMTOM_API_KEY'); // fail fast before geocoding

  const [from, to] = await Promise.all([resolvePlace(params, 'from'), resolvePlace(params, 'to')]);
  const routes = mock ? mockRoutes(from, to, routeType) : await calculateRoutes(from, to, routeType);
  if (routes.length === 0) throw notFound(`No route found from "${from.name}" to "${to.name}".`);

  const data: RouteData = { from, to, routeType, routes };
  return jsonData(data);
});

export const ALL = methodNotAllowed(['GET']);

/** `${key}Lat`/`${key}Lon` when given (place picked from suggestions), otherwise the first geocoding match. */
async function resolvePlace(params: URLSearchParams, key: 'from' | 'to'): Promise<Place> {
  const name = requiredString(params, key, 100);
  const lat = params.get(`${key}Lat`);
  const lon = params.get(`${key}Lon`);
  if (lat !== null || lon !== null) {
    return {
      name,
      lat: parseNumberInRange(lat, `${key}Lat`, -90, 90),
      lon: parseNumberInRange(lon, `${key}Lon`, -180, 180),
      countryCode: null,
      country: null,
      admin1: null,
    };
  }
  const [place] = await searchPlaces(name, 1);
  if (!place) throw notFound(key === 'from' ? `Start place "${name}" not found.` : `Destination "${name}" not found.`);
  return place;
}
