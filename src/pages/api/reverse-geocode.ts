import { handle, jsonData, methodNotAllowed, requiredLatLon } from '@/lib/server/api';
import { reversePlace } from '@/lib/server/services/geocoding';

/** GET /api/reverse-geocode?lat&lon -> { data: Place } ("Your location" when the spot has no name) */
export const GET = handle(async ({ url }) => {
  const { lat, lon } = requiredLatLon(url.searchParams);
  return jsonData(await reversePlace(lat, lon), { cacheSeconds: 86_400 });
});

export const ALL = methodNotAllowed(['GET']);
