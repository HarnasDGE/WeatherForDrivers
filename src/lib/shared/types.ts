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

/** Driving time from the start at a distance along the route (from TomTom guidance points). */
export interface RouteProgress {
  /** Metres along the route from its start. */
  offsetMeters: number;
  /** Seconds of driving from the start to that offset. */
  seconds: number;
}

/** One route variant (main route first, then up to 2 alternatives). */
export interface Route {
  summary: RouteSummary;
  /** Full geometry of the route, start to end. */
  points: LatLon[];
  /**
   * Increasing samples of driving time along the route (first {0, 0}, last = summary length/time).
   * Lets the server time each checkpoint without one routing call per point.
   */
  timeline: RouteProgress[];
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
  /** Routes to evaluate (max 3), usually `RouteData.routes` (`points`, plus `timeline` when known). */
  routes: Array<Pick<Route, 'points'> & Partial<Pick<Route, 'timeline'>>>;
  /** Density of control points per route, integer 3..20 (legacy slider range). */
  controlPoints: number;
  /** ISO 8601 departure, now..+3 days; omitted = leave now. */
  departureTime?: string;
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
  /** km/h at 10 m; null when unknown. */
  windSpeed: number | null;
  /** km/h at 10 m; null when unknown. */
  windGusts: number | null;
  /** Direction the wind blows FROM, compass degrees; null when unknown. */
  windDirection: number | null;
}

/* ------------------------------------------------------------------ */
/* Departure windows (POST /api/departure-windows)                     */
/* ------------------------------------------------------------------ */

export interface DepartureWindowsRequest {
  /** Checkpoints of the route with their driving time from the start (2..25). */
  checkpoints: Array<LatLon & { offsetSeconds: number }>;
  /** First departure, ISO 8601 (now..+3 days). */
  start: string;
  /** Number of departures to evaluate, 1..36. */
  count: number;
  /** Minutes between departures, 15..180. */
  stepMinutes: number;
}

/** Weather at one checkpoint for one departure. */
export interface WindowPoint {
  /** Arrival at the checkpoint (ISO UTC, rounded to 15 min). */
  time: string;
  temperature: number | null;
  weatherCode: number | null;
  isDay: boolean | null;
}

export interface DepartureWindow {
  /** ISO 8601 departure. */
  departure: string;
  /** Index-aligned with the request's checkpoints. */
  points: WindowPoint[];
}

/** One element per requested route, in request order. */
export interface RouteWeather {
  routeIndex: number;
  points: RouteWeatherPoint[];
}

/* ------------------------------------------------------------------ */
/* Official warnings (IMGW-PIB, POST /api/route-warnings)              */
/* ------------------------------------------------------------------ */

/** A point along the route with the time the driver gets there. */
export interface RouteWarningsPoint extends LatLon {
  /** Arrival, ISO 8601. */
  time: string;
  /** Driving distance from the route start, metres. */
  lengthInMeters: number;
}

export interface RouteWarningsRequest {
  /** Checkpoints and/or samples along the route, in driving order (1..400). */
  points: RouteWarningsPoint[];
}

/** IMGW warning level ("stopień"): 1 yellow, 2 orange, 3 red. */
export type WarningLevel = 1 | 2 | 3;

/** One continuous run of request points that are inside the warning area while it is valid. */
export interface WarningStretch {
  /** Indexes into the request's `points` (inclusive). */
  fromIndex: number;
  toIndex: number;
  fromMeters: number;
  toMeters: number;
}

export interface RouteWarning {
  /** IMGW warning id (unique per response). */
  id: string;
  level: WarningLevel;
  /** Phenomenon as issued, in Polish, e.g. "Silny deszcz z burzami". */
  event: string;
  /** Short English label for common phenomena, e.g. "Heavy rain with thunderstorms"; null when unknown. */
  eventLabel: string | null;
  /** Probability in %, null when not given. */
  probability: number | null;
  /** Validity window, ISO 8601 UTC. */
  validFrom: string;
  validTo: string;
  /** Publication time, ISO 8601 UTC; null when not given. */
  published: string | null;
  /** Issuing office, e.g. "Centralne Biuro Prognoz Meteorologicznych w Warszawie". */
  office: string | null;
  /** Counties on the route covered by this warning while the driver is there (official names). */
  areas: string[];
  /** Affected stretches of the route, in driving order (at least one). */
  stretches: WarningStretch[];
  /** Warning text (Polish), plus the forecaster's comment when there is one. */
  description: string;
  /** true for the demo warning added in mock mode; never set on real IMGW data. */
  sample: boolean;
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
