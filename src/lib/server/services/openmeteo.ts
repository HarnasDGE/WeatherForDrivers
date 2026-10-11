import type { DailyForecast, Forecast, HourlyForecast, LatLon, Place } from '@/lib/shared/types';
import { API_BASE } from '../config';
import { fetchJson } from '../http';

/**
 * Open-Meteo (no API key). Plain REST/JSON instead of the legacy `openmeteo`
 * FlatBuffers client.
 */

const SERVICE = 'Open-Meteo';

/* ------------------------------ forecast ------------------------------ */

// Legacy `fetchDataPlace` variables plus driving-relevant gusts, visibility and day/night.
const HOURLY_VARS = {
  temperature2m: 'temperature_2m',
  precipitationProbability: 'precipitation_probability',
  precipitation: 'precipitation',
  rain: 'rain',
  showers: 'showers',
  snowfall: 'snowfall',
  weatherCode: 'weather_code',
  cloudCover: 'cloud_cover',
  windGusts10m: 'wind_gusts_10m',
  visibility: 'visibility',
  dewPoint: 'dew_point_2m',
  surfaceTemperature: 'soil_temperature_0cm',
  isDay: 'is_day',
} as const satisfies Record<Exclude<keyof HourlyForecast, 'time'>, string>;

const DAILY_VARS = {
  weatherCode: 'weather_code',
  temperatureMax: 'temperature_2m_max',
  temperatureMin: 'temperature_2m_min',
  sunrise: 'sunrise',
  sunset: 'sunset',
  daylightDuration: 'daylight_duration',
  sunshineDuration: 'sunshine_duration',
  uvIndexMax: 'uv_index_max',
  uvIndexClearSkyMax: 'uv_index_clear_sky_max',
  precipitationSum: 'precipitation_sum',
  rainSum: 'rain_sum',
  showersSum: 'showers_sum',
  snowfallSum: 'snowfall_sum',
  precipitationHours: 'precipitation_hours',
  precipitationProbabilityMax: 'precipitation_probability_max',
  windSpeedMax: 'wind_speed_10m_max',
  windGustsMax: 'wind_gusts_10m_max',
  windDirectionDominant: 'wind_direction_10m_dominant',
} as const satisfies Record<Exclude<keyof DailyForecast, 'time'>, string>;

/** Legacy fetched today + 4 days. */
export const FORECAST_DAYS = 5;

type OmSeries = Record<string, unknown[] | undefined> & { time?: string[] };

interface OmForecastResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  utc_offset_seconds: number;
  hourly?: OmSeries;
  daily?: OmSeries;
  minutely_15?: OmSeries;
}

/** Renames Open-Meteo columns to our camelCase keys; missing values become null. */
function pickColumns(series: OmSeries | undefined, vars: Record<string, string>, length: number) {
  const out: Record<string, unknown[]> = {};
  for (const [key, omName] of Object.entries(vars)) {
    const values = series?.[omName];
    out[key] = Array.from({ length }, (_, i) => values?.[i] ?? null);
  }
  return out;
}

export async function getForecast({ lat, lon }: LatLon): Promise<Forecast> {
  const url = new URL('/v1/forecast', API_BASE.openMeteo);
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('hourly', Object.values(HOURLY_VARS).join(','));
  url.searchParams.set('daily', Object.values(DAILY_VARS).join(','));
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', String(FORECAST_DAYS));

  const res = await fetchJson<OmForecastResponse>(url, { service: SERVICE, retries: 1, cacheTtlMs: 10 * 60_000 });
  const hourlyTime = res.hourly?.time ?? [];
  const dailyTime = res.daily?.time ?? [];

  return {
    lat,
    lon,
    timezone: res.timezone,
    utcOffsetSeconds: res.utc_offset_seconds,
    hourly: { time: hourlyTime, ...pickColumns(res.hourly, HOURLY_VARS, hourlyTime.length) } as HourlyForecast,
    daily: { time: dailyTime, ...pickColumns(res.daily, DAILY_VARS, dailyTime.length) } as DailyForecast,
  };
}

/* ------------------------- minutely_15 (route) ------------------------ */

export interface QuarterHourWeather {
  /** UTC "YYYY-MM-DDTHH:MM" */
  time: string[];
  temperature2m: (number | null)[];
  weatherCode: (number | null)[];
  isDay: (number | null)[];
  /** km/h */
  windSpeed10m: (number | null)[];
  /** km/h */
  windGusts10m: (number | null)[];
  /** degrees the wind blows from */
  windDirection10m: (number | null)[];
  /** °C */
  dewPoint2m: (number | null)[];
  /** °C, `soil_temperature_0cm` (surface temperature proxy) */
  surfaceTemperature: (number | null)[];
}

/**
 * 15-minutely temperature / weather code / is_day / wind for many locations in ONE
 * request (Open-Meteo accepts comma-separated coordinate lists). Times are UTC
 * (timezone=GMT) so they can be matched against absolute arrival instants.
 * Result order matches `points`.
 */
export async function getQuarterHourWeather(
  points: readonly LatLon[],
  startDate: string,
  endDate: string,
): Promise<QuarterHourWeather[]> {
  if (points.length === 0) return [];
  const url = new URL('/v1/forecast', API_BASE.openMeteo);
  url.searchParams.set('latitude', points.map((p) => p.lat.toFixed(4)).join(','));
  url.searchParams.set('longitude', points.map((p) => p.lon.toFixed(4)).join(','));
  url.searchParams.set(
    'minutely_15',
    'temperature_2m,weather_code,is_day,wind_speed_10m,wind_gusts_10m,wind_direction_10m,dew_point_2m,soil_temperature_0cm',
  );
  url.searchParams.set('timezone', 'GMT');
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);

  const res = await fetchJson<OmForecastResponse | OmForecastResponse[]>(url, {
    service: SERVICE,
    retries: 1,
    cacheTtlMs: 10 * 60_000,
  });
  const list = Array.isArray(res) ? res : [res];

  return points.map((_, i) => {
    const m = list[i]?.minutely_15;
    const time = m?.time ?? [];
    const col = (name: string) => Array.from({ length: time.length }, (_, j) => (m?.[name]?.[j] ?? null) as number | null);
    return {
      time,
      temperature2m: col('temperature_2m'),
      weatherCode: col('weather_code'),
      isDay: col('is_day'),
      windSpeed10m: col('wind_speed_10m'),
      windGusts10m: col('wind_gusts_10m'),
      windDirection10m: col('wind_direction_10m'),
      dewPoint2m: col('dew_point_2m'),
      surfaceTemperature: col('soil_temperature_0cm'),
    };
  });
}

/* ------------------------------ geocoding ----------------------------- */

interface OmGeocodingResponse {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    country_code?: string;
    country?: string;
    admin1?: string;
  }>;
}

/** Place search by name (Open-Meteo geocoding; `language` picks the names, "pl" also matches Polish spellings). */
export async function searchPlaces(query: string, limit: number, language = 'en'): Promise<Place[]> {
  const url = new URL('/v1/search', API_BASE.openMeteoGeocoding);
  url.searchParams.set('name', query);
  url.searchParams.set('count', String(limit));
  url.searchParams.set('language', language);
  url.searchParams.set('format', 'json');

  const res = await fetchJson<OmGeocodingResponse>(url, {
    service: 'Open-Meteo Geocoding',
    retries: 1,
    cacheTtlMs: 24 * 3600_000,
  });
  return (res.results ?? []).map((r) => ({
    name: r.name,
    lat: r.latitude,
    lon: r.longitude,
    countryCode: r.country_code ? r.country_code.toUpperCase() : null,
    country: r.country ?? null,
    admin1: r.admin1 ?? null,
  }));
}
