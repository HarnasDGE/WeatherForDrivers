import { handle, methodNotAllowed, jsonData, requiredLatLon } from '@/lib/server/api';
import { getForecast } from '@/lib/server/services/openmeteo';

/** GET /api/forecast?lat&lon -> { data: Forecast } (hourly + daily, 5 days) */
export const GET = handle(async ({ url }) => {
  const coords = requiredLatLon(url.searchParams);
  return jsonData(await getForecast(coords), { cacheSeconds: 600 });
});

export const ALL = methodNotAllowed(['GET']);
