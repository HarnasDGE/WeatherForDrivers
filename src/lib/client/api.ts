import type {
  ApiResponse,
  CurrentWeather,
  Forecast,
  LatLon,
  Place,
  PlaceImage,
  RouteData,
  RouteType,
  RouteWeather,
  RouteWeatherRequest,
} from '@/lib/shared/types';

/** Error carrying the server's `error.message` (safe to show to the user). */
export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code = 'INTERNAL_ERROR', status = 0) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiRequestError('Network error - could not reach the server.', 'NETWORK_ERROR');
  }

  let body: ApiResponse<T> | null = null;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    // non-JSON body, handled below
  }

  if (body && 'error' in body) {
    throw new ApiRequestError(body.error.message, body.error.code, response.status);
  }
  if (!response.ok || !body || !('data' in body)) {
    throw new ApiRequestError(`Unexpected server response (${response.status}).`, 'INTERNAL_ERROR', response.status);
  }
  return body.data;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  return search.toString();
};

export function fetchCurrentWeather({ lat, lon }: LatLon, name?: string): Promise<CurrentWeather> {
  return request(`/api/weather?${qs({ lat, lon, name })}`);
}

export function fetchForecast({ lat, lon }: LatLon): Promise<Forecast> {
  return request(`/api/forecast?${qs({ lat, lon })}`);
}

export function fetchPlaces(query: string, limit?: number): Promise<Place[]> {
  return request(`/api/geocode?${qs({ q: query, limit })}`);
}

export function fetchPlaceImage(query: string): Promise<PlaceImage> {
  return request(`/api/place-image?${qs({ q: query })}`);
}

export function fetchRoute(from: string, to: string, routeType?: RouteType): Promise<RouteData> {
  return request(`/api/route?${qs({ from, to, routeType })}`);
}

export function fetchRouteWeather(body: RouteWeatherRequest): Promise<RouteWeather[]> {
  return request('/api/route-weather', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Tile URL template for Leaflet's `L.tileLayer` (same-origin proxy, no key in the browser). */
export const weatherTileUrl = (layer: string) => `/api/tiles/${layer}/{z}/{x}/{y}.png`;
