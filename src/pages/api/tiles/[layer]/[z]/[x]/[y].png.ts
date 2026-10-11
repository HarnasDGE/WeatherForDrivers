import { WEATHER_MAP_LAYERS, type WeatherMapLayer } from '@/lib/shared/types';
import { handle, methodNotAllowed, parseNumberInRange } from '@/lib/server/api';
import { badRequest } from '@/lib/server/errors';
import { getWeatherMapTile } from '@/lib/server/services/openweather';

/**
 * GET /api/tiles/{layer}/{z}/{x}/{y}.png -> image/png (OpenWeatherMap weather layer)
 * Leaflet URL template: `/api/tiles/${layer}/{z}/{x}/{y}.png`. Errors are JSON `{ error }`.
 */
export const GET = handle(async ({ params }) => {
  const layer = params.layer as WeatherMapLayer;
  if (!WEATHER_MAP_LAYERS.includes(layer)) {
    throw badRequest(`"layer" must be one of: ${WEATHER_MAP_LAYERS.join(', ')}.`);
  }
  const z = parseNumberInRange(params.z, 'z', 0, 20, { integer: true });
  const max = 2 ** z - 1;
  const x = parseNumberInRange(params.x, 'x', 0, max, { integer: true });
  const y = parseNumberInRange(params.y, 'y', 0, max, { integer: true });

  const upstream = await getWeatherMapTile(layer, z, x, y);
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'image/png',
      'Cache-Control': 'public, max-age=600',
    },
  });
});

export const ALL = methodNotAllowed(['GET']);
