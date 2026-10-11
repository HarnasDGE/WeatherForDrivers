import type {
  ApiResponse,
  DepartureWindow,
  DepartureWindowsRequest,
  Forecast,
  LatLon,
  Place,
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

export function fetchForecast({ lat, lon }: LatLon): Promise<Forecast> {
  return request(`/api/forecast?${qs({ lat, lon })}`);
}

export function fetchPlaces(query: string, limit?: number): Promise<Place[]> {
  return request(`/api/geocode?${qs({ q: query, limit })}`);
}

/** Names a spot ("Your location" when it has none); never fails because of the name. */
export function fetchReversePlace({ lat, lon }: LatLon): Promise<Place> {
  return request(`/api/reverse-geocode?${qs({ lat, lon })}`);
}

/** A typed place name (geocoded on the server) or a place picked from suggestions (coordinates are sent along). */
export type PlaceInput = string | Place;

export const placeName = (place: PlaceInput) => (typeof place === 'string' ? place : place.name);

const placeParams = (key: 'from' | 'to', place: PlaceInput) =>
  typeof place === 'string'
    ? { [key]: place }
    : { [key]: place.name, [`${key}Lat`]: place.lat, [`${key}Lon`]: place.lon };

/** `departAt`: ISO departure, omitted = leave now. */
export function fetchRoute(from: PlaceInput, to: PlaceInput, routeType?: RouteType, departAt?: string): Promise<RouteData> {
  return request(`/api/route?${qs({ ...placeParams('from', from), ...placeParams('to', to), routeType, departAt })}`);
}

export function fetchRouteWeather(body: RouteWeatherRequest): Promise<RouteWeather[]> {
  return request('/api/route-weather', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function fetchDepartureWindows(body: DepartureWindowsRequest): Promise<DepartureWindow[]> {
  return request('/api/departure-windows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
