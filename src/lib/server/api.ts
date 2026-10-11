import type { APIRoute } from 'astro';
import type { ApiErrorResponse, ApiSuccessResponse, LatLon } from '@/lib/shared/types';
import { HttpError, badRequest } from './errors';

/**
 * Helpers for src/pages/api/* endpoints: JSON envelopes, error mapping and
 * query-param validation. Every endpoint responds with `{ data }` or `{ error }`.
 */

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

export function jsonData<T>(data: T, init?: { status?: number; cacheSeconds?: number }): Response {
  const headers: Record<string, string> = { ...JSON_HEADERS };
  headers['Cache-Control'] = init?.cacheSeconds ? `public, max-age=${init.cacheSeconds}` : 'no-store';
  const body: ApiSuccessResponse<T> = { data };
  return new Response(JSON.stringify(body), { status: init?.status ?? 200, headers });
}

export function jsonError(error: unknown): Response {
  const httpError =
    error instanceof HttpError ? error : new HttpError(500, 'INTERNAL_ERROR', 'Unexpected server error.');
  if (!(error instanceof HttpError)) console.error('[api] unexpected error', error);
  const body: ApiErrorResponse = { error: { code: httpError.code, message: httpError.message } };
  return new Response(JSON.stringify(body), {
    status: httpError.status,
    headers: { ...JSON_HEADERS, 'Cache-Control': 'no-store' },
  });
}

/** Wraps a handler so any thrown error becomes a JSON `{ error }` response. */
export function handle(handler: APIRoute): APIRoute {
  return async (context) => {
    try {
      return await handler(context);
    } catch (error) {
      return jsonError(error);
    }
  };
}

/** Handler for `export const ALL` - JSON 405 for unsupported methods. */
export function methodNotAllowed(allowed: string[]): APIRoute {
  return () => {
    const response = jsonError(new HttpError(405, 'METHOD_NOT_ALLOWED', `Method not allowed. Use ${allowed.join(', ')}.`));
    response.headers.set('Allow', allowed.join(', '));
    return response;
  };
}

/* ---------------------------- validation ---------------------------- */

export function requiredString(params: URLSearchParams, name: string, maxLength = 200): string {
  const value = params.get(name)?.trim();
  if (!value) throw badRequest(`Query parameter "${name}" is required.`);
  if (value.length > maxLength) throw badRequest(`Query parameter "${name}" is too long (max ${maxLength}).`);
  return value;
}

export function optionalString(params: URLSearchParams, name: string, maxLength = 200): string | undefined {
  const value = params.get(name)?.trim();
  if (!value) return undefined;
  if (value.length > maxLength) throw badRequest(`Query parameter "${name}" is too long (max ${maxLength}).`);
  return value;
}

export function parseNumberInRange(
  raw: unknown,
  name: string,
  min: number,
  max: number,
  { integer = false }: { integer?: boolean } = {},
): number {
  const value = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw badRequest(`"${name}" must be ${integer ? 'an integer' : 'a number'} between ${min} and ${max}.`);
  }
  return value;
}

export function optionalInt(params: URLSearchParams, name: string, min: number, max: number, fallback: number): number {
  const raw = params.get(name);
  return raw === null || raw.trim() === '' ? fallback : parseNumberInRange(raw, name, min, max, { integer: true });
}

export function isValidLatLon(value: unknown): value is LatLon {
  if (typeof value !== 'object' || value === null) return false;
  const { lat, lon } = value as Record<string, unknown>;
  return (
    typeof lat === 'number' && typeof lon === 'number' &&
    lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
  );
}

/** Reads required `lat` & `lon` query params. */
export function requiredLatLon(params: URLSearchParams): LatLon {
  if (params.get('lat') === null || params.get('lon') === null) {
    throw badRequest('Query parameters "lat" and "lon" are required.');
  }
  return {
    lat: parseNumberInRange(params.get('lat'), 'lat', -90, 90),
    lon: parseNumberInRange(params.get('lon'), 'lon', -180, 180),
  };
}
