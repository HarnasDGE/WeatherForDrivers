import { HttpError } from './errors';

/**
 * Server-only configuration. Secrets come from `import.meta.env` (.env file or
 * process environment) and are never exposed to the client (no PUBLIC_ prefix).
 */

export type SecretName = 'OPENWEATHER_API_KEY' | 'UNSPLASH_ACCESS_KEY' | 'TOMTOM_API_KEY';

const SECRET_PROVIDERS: Record<SecretName, string> = {
  OPENWEATHER_API_KEY: 'OpenWeatherMap',
  UNSPLASH_ACCESS_KEY: 'Unsplash',
  TOMTOM_API_KEY: 'TomTom',
};

/*
 * Static `import.meta.env.X` accesses (not `import.meta.env[name]`) so Vite/Astro
 * can resolve them; `process.env` covers values provided at runtime to the
 * standalone Node server (e.g. `OPENWEATHER_API_KEY=... node dist/server/entry.mjs`).
 */
const ENV_READERS: Record<SecretName, () => string | undefined> = {
  OPENWEATHER_API_KEY: () => import.meta.env.OPENWEATHER_API_KEY || process.env.OPENWEATHER_API_KEY,
  UNSPLASH_ACCESS_KEY: () => import.meta.env.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_ACCESS_KEY,
  TOMTOM_API_KEY: () => import.meta.env.TOMTOM_API_KEY || process.env.TOMTOM_API_KEY,
};

function readEnv(name: SecretName): string | undefined {
  const value = ENV_READERS[name]();
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Returns the secret or throws a 500 `CONFIG_MISSING_KEY` error with a readable message. */
export function requireSecret(name: SecretName): string {
  const value = readEnv(name);
  if (!value) {
    throw new HttpError(
      500,
      'CONFIG_MISSING_KEY',
      `Server is not configured: missing ${name} (${SECRET_PROVIDERS[name]} API key). ` +
        'Set it in .env (see .env.example) and restart the server.',
    );
  }
  return value;
}

/**
 * Demo data instead of the keyed upstream APIs (TomTom, OpenWeatherMap).
 * MOCK_API=true forces it, MOCK_API=false disables it; otherwise it is on while
 * either key is missing. Open-Meteo (geocoding, forecast) needs no key and stays live.
 */
export function isMockMode(): boolean {
  const flag = (import.meta.env.MOCK_API || process.env.MOCK_API)?.trim().toLowerCase();
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return !readEnv('TOMTOM_API_KEY') || !readEnv('OPENWEATHER_API_KEY');
}

/** Default global TomTom route requests per UTC day: the free tier's 20,000 / month spread over 30 days. */
const DEFAULT_TOMTOM_DAILY_BUDGET = 600;

/** TOMTOM_DAILY_BUDGET (positive integer) or the default. */
export function tomTomDailyBudget(): number {
  const raw = (import.meta.env.TOMTOM_DAILY_BUDGET || process.env.TOMTOM_DAILY_BUDGET)?.trim();
  const value = raw ? Number(raw) : NaN;
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_TOMTOM_DAILY_BUDGET;
}

export const API_BASE = {
  openWeather: 'https://api.openweathermap.org',
  openWeatherTiles: 'https://tile.openweathermap.org',
  openMeteo: 'https://api.open-meteo.com',
  openMeteoGeocoding: 'https://geocoding-api.open-meteo.com',
  unsplash: 'https://api.unsplash.com',
  tomTom: 'https://api.tomtom.com',
} as const;

/** Default timeout for upstream requests, ms. */
export const UPSTREAM_TIMEOUT_MS = 10_000;

/** Max simultaneous upstream requests for one /api/route-weather call (TomTom free tier ≈ 5 QPS). */
export const ROUTE_WEATHER_CONCURRENCY = 4;
