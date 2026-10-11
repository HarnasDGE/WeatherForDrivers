import type { CurrentWeather, LatLon, WeatherMapLayer } from '@/lib/shared/types';
import { API_BASE, requireSecret } from '../config';
import { fetchJson, fetchUpstream } from '../http';

/** OpenWeatherMap: current weather, reverse geocoding and map tiles (requires OPENWEATHER_API_KEY). */

const SERVICE = 'OpenWeatherMap';

interface OwmCurrentResponse {
  coord: { lat: number; lon: number };
  weather: Array<{ id: number; main: string; description: string; icon: string }>;
  main: { temp: number; feels_like: number; temp_min: number; temp_max: number; pressure: number; humidity: number };
  visibility?: number;
  wind: { speed: number; deg: number; gust?: number };
  clouds: { all: number };
  dt: number;
  sys: { country?: string; sunrise?: number; sunset?: number };
  timezone: number;
  name: string;
}

/**
 * Current weather (legacy `fetchDataForPlace`/`fetchDataFromCoords`).
 * Uses units=metric (legacy omitted it and got Kelvin). `name` overrides the
 * station name returned by OWM, like the legacy code did.
 */
export async function getCurrentWeather({ lat, lon }: LatLon, name?: string): Promise<CurrentWeather> {
  const url = new URL('/data/2.5/weather', API_BASE.openWeather);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('units', 'metric');
  url.searchParams.set('appid', requireSecret('OPENWEATHER_API_KEY'));

  const r = await fetchJson<OwmCurrentResponse>(url, { service: SERVICE, retries: 1 });
  const condition = r.weather[0];
  return {
    lat: r.coord.lat,
    lon: r.coord.lon,
    name: name ?? r.name,
    countryCode: r.sys.country ?? null,
    dt: r.dt,
    timezoneOffset: r.timezone,
    sunrise: r.sys.sunrise ?? null,
    sunset: r.sys.sunset ?? null,
    temperature: r.main.temp,
    feelsLike: r.main.feels_like,
    tempMin: r.main.temp_min,
    tempMax: r.main.temp_max,
    pressure: r.main.pressure,
    humidity: r.main.humidity,
    visibility: r.visibility ?? null,
    windSpeed: r.wind.speed,
    windDeg: r.wind.deg,
    windGust: r.wind.gust ?? null,
    clouds: r.clouds.all,
    conditionId: condition?.id ?? 0,
    condition: condition?.main ?? '',
    description: condition?.description ?? '',
    icon: condition?.icon ?? '',
  };
}

/** Reverse geocoding (legacy used it for route control-point names). Returns null when nothing found. */
export async function reverseGeocode({ lat, lon }: LatLon): Promise<string | null> {
  const url = new URL('/geo/1.0/reverse', API_BASE.openWeather);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('limit', '1');
  url.searchParams.set('appid', requireSecret('OPENWEATHER_API_KEY'));

  const res = await fetchJson<Array<{ name?: string }>>(url, {
    service: SERVICE,
    retries: 2,
    cacheTtlMs: 24 * 3600_000,
  });
  return res[0]?.name ?? null;
}

/** Weather map tile (PNG) - proxied so the API key never reaches the browser (legacy Map.js leaked it). */
export async function getWeatherMapTile(layer: WeatherMapLayer, z: number, x: number, y: number): Promise<Response> {
  const url = new URL(`/map/${layer}/${z}/${x}/${y}.png`, API_BASE.openWeatherTiles);
  url.searchParams.set('appid', requireSecret('OPENWEATHER_API_KEY'));
  return fetchUpstream(url, { service: SERVICE, retries: 1 });
}
