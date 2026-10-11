/**
 * Types shared between the server (src/lib/server, src/pages/api) and the
 * React frontend. This file must stay free of runtime/server-only imports.
 * The HTTP contract is documented in docs/API.md.
 */

/* ------------------------------------------------------------------ */
/* Generic API envelope                                                */
/* ------------------------------------------------------------------ */

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'CONFIG_MISSING_KEY'
  | 'UPSTREAM_ERROR'
  | 'UPSTREAM_TIMEOUT'
  | 'INTERNAL_ERROR';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
}

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/* ------------------------------------------------------------------ */
/* Places                                                              */
/* ------------------------------------------------------------------ */

export interface LatLon {
  lat: number;
  lon: number;
}

/** A geocoded place (GET /api/geocode, also `from`/`to` of GET /api/route). */
export interface Place extends LatLon {
  name: string;
  /** ISO 3166-1 alpha-2, upper case (e.g. "PL"); null when unknown. */
  countryCode: string | null;
  country: string | null;
  /** First-level administrative area (voivodeship/state); null when unknown. */
  admin1: string | null;
}

/** GET /api/place-image */
export interface PlaceImage {
  url: string;
  alt: string | null;
  authorName: string;
  /** Unsplash profile URL of the author (attribution is required by Unsplash). */
  authorUrl: string;
}

/* ------------------------------------------------------------------ */
/* Current weather (OpenWeatherMap, metric units)                      */
/* ------------------------------------------------------------------ */

/** GET /api/weather */
export interface CurrentWeather extends LatLon {
  name: string;
  countryCode: string | null;
  /** Unix seconds (UTC) of the observation. */
  dt: number;
  /** Shift in seconds from UTC of the location. */
  timezoneOffset: number;
  /** Unix seconds (UTC). */
  sunrise: number | null;
  /** Unix seconds (UTC). */
  sunset: number | null;
  /** °C */
  temperature: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  /** hPa */
  pressure: number;
  /** % */
  humidity: number;
  /** metres; null when not reported */
  visibility: number | null;
  /** m/s */
  windSpeed: number;
  /** degrees */
  windDeg: number;
  /** m/s; null when not reported */
  windGust: number | null;
  /** cloudiness % */
  clouds: number;
  /** OpenWeatherMap condition id, e.g. 800 */
  conditionId: number;
  /** e.g. "Clouds" */
  condition: string;
  /** e.g. "broken clouds" */
  description: string;
  /** OpenWeatherMap icon code, e.g. "04d" */
  icon: string;
}

/* ------------------------------------------------------------------ */
/* Forecast (Open-Meteo, 5 days)                                       */
/* ------------------------------------------------------------------ */

/**
 * Hourly arrays are index-aligned with `time`.
 * Times are local wall-clock ISO strings of the location, without offset,
 * e.g. "2026-10-11T14:00" (see Forecast.timezone / utcOffsetSeconds).
 * Numeric values may be null when Open-Meteo has no data for that slot.
 */
export interface HourlyForecast {
  time: string[];
  /** °C */
  temperature2m: (number | null)[];
  /** % */
  precipitationProbability: (number | null)[];
  /** mm */
  precipitation: (number | null)[];
  /** mm */
  rain: (number | null)[];
  /** mm */
  showers: (number | null)[];
  /** cm */
  snowfall: (number | null)[];
  /** WMO weather code */
  weatherCode: (number | null)[];
  /** % */
  cloudCover: (number | null)[];
  /** km/h */
  windGusts10m: (number | null)[];
  /** metres */
  visibility: (number | null)[];
  /** 1 = daylight, 0 = night */
  isDay: (number | null)[];
}

/** Daily arrays are index-aligned with `time` ("YYYY-MM-DD", local date). */
export interface DailyForecast {
  time: string[];
  weatherCode: (number | null)[];
  /** °C */
  temperatureMax: (number | null)[];
  temperatureMin: (number | null)[];
  /** local wall-clock ISO, e.g. "2026-10-11T07:02" */
  sunrise: (string | null)[];
  sunset: (string | null)[];
  /** seconds */
  daylightDuration: (number | null)[];
  /** seconds */
  sunshineDuration: (number | null)[];
  uvIndexMax: (number | null)[];
  uvIndexClearSkyMax: (number | null)[];
  /** mm */
  precipitationSum: (number | null)[];
  rainSum: (number | null)[];
  showersSum: (number | null)[];
  /** cm */
  snowfallSum: (number | null)[];
  /** hours */
  precipitationHours: (number | null)[];
  /** % */
  precipitationProbabilityMax: (number | null)[];
  /** km/h */
  windSpeedMax: (number | null)[];
  /** km/h */
  windGustsMax: (number | null)[];
  /** degrees */
  windDirectionDominant: (number | null)[];
}

/** GET /api/forecast */
export interface Forecast extends LatLon {
  /** IANA zone, e.g. "Europe/Warsaw" */
  timezone: string;
  utcOffsetSeconds: number;
  hourly: HourlyForecast;
  daily: DailyForecast;
}

/* ------------------------------------------------------------------ */
/* Routes (TomTom)                                                     */
/* ------------------------------------------------------------------ */

export const ROUTE_TYPES = ['fastest', 'shortest', 'eco', 'thrilling'] as const;
export type RouteType = (typeof ROUTE_TYPES)[number];

export interface RouteSummary {
  lengthInMeters: number;
  travelTimeInSeconds: number;
  trafficDelayInSeconds: number;
  /** ISO 8601 with offset, as returned by TomTom */
  departureTime: string;
  arrivalTime: string;
}

/** One route variant (main route first, then up to 2 alternatives). */
export interface Route {
  summary: RouteSummary;
  /** Full geometry of the route, start to end. */
  points: LatLon[];
}

/** GET /api/route */
export interface RouteData {
  from: Place;
  to: Place;
  routeType: RouteType;
  routes: Route[];
}

/** POST /api/route-weather request body */
export interface RouteWeatherRequest {
  /** Routes to evaluate (max 3), usually `RouteData.routes` (only `points` is needed). */
  routes: Array<Pick<Route, 'points'>>;
  /** Density of control points per route, integer 3..20 (legacy slider range). */
  controlPoints: number;
}

/** `RouteWeatherPoint.name` when the point could not be named. */
export const PLACE_ON_THE_ROAD = 'Place on the road';

/** Weather at one control point along a route. */
export interface RouteWeatherPoint extends LatLon {
  /** Reverse-geocoded name, PLACE_ON_THE_ROAD when unknown. */
  name: string;
  /** Driving distance from the route start, metres. */
  lengthInMeters: number;
  /** Driving time from the route start, seconds. */
  travelTimeInSeconds: number;
  /** Estimated arrival (ISO 8601 UTC), rounded to the nearest 15 minutes. */
  time: string;
  /** °C rounded to 0.1; null when no forecast for that time. */
  temperature: number | null;
  /** WMO weather code; null when no forecast for that time. */
  weatherCode: number | null;
  /** true = daylight; null when unknown. */
  isDay: boolean | null;
}

/** One element per requested route, in request order. */
export interface RouteWeather {
  routeIndex: number;
  points: RouteWeatherPoint[];
}

/* ------------------------------------------------------------------ */
/* Map tiles (OpenWeatherMap layers proxied by /api/tiles/...)         */
/* ------------------------------------------------------------------ */

export const WEATHER_MAP_LAYERS = [
  'clouds_new',
  'precipitation_new',
  'pressure_new',
  'wind_new',
  'temp_new',
] as const;
export type WeatherMapLayer = (typeof WEATHER_MAP_LAYERS)[number];
