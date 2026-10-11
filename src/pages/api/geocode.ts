import { handle, methodNotAllowed, jsonData, optionalInt, requiredString } from '@/lib/server/api';
import { searchPlaces } from '@/lib/server/services/openmeteo';

/** GET /api/geocode?q[&limit=5] -> { data: Place[] } (empty array when nothing matches) */
export const GET = handle(async ({ url }) => {
  const query = requiredString(url.searchParams, 'q', 100);
  if (query.length < 2) {
    return jsonData([]);
  }
  const limit = optionalInt(url.searchParams, 'limit', 1, 10, 5);
  return jsonData(await searchPlaces(query, limit), { cacheSeconds: 86_400 });
});

export const ALL = methodNotAllowed(['GET']);
