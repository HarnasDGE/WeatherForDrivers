import { handle, methodNotAllowed, jsonData, optionalString, requiredLatLon } from '@/lib/server/api';
import { getCurrentWeather } from '@/lib/server/services/openweather';

/** GET /api/weather?lat&lon[&name] -> { data: CurrentWeather } */
export const GET = handle(async ({ url }) => {
  const coords = requiredLatLon(url.searchParams);
  const name = optionalString(url.searchParams, 'name', 100);
  return jsonData(await getCurrentWeather(coords, name), { cacheSeconds: 300 });
});

export const ALL = methodNotAllowed(['GET']);
