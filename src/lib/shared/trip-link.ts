import { ROUTE_TYPES } from './types';
import type { Place, RouteType } from './types';

/** A trip that can be shared as a link: two places, an optional planned departure and route type. */
export interface SharedTrip {
  from: Place;
  to: Place;
  /** ISO departure, null = leave now. */
  departure: string | null;
  routeType: RouteType | null;
}

const place = (name: string, lat: number, lon: number): Place => ({
  name,
  lat,
  lon,
  countryCode: null,
  country: null,
  admin1: null,
});

/** Query string for a trip (without the leading "?"). Coordinates are rounded to ~1 m. */
export function buildTripQuery(trip: SharedTrip): string {
  const params = new URLSearchParams({
    from: trip.from.name,
    fromLat: trip.from.lat.toFixed(5),
    fromLon: trip.from.lon.toFixed(5),
    to: trip.to.name,
    toLat: trip.to.lat.toFixed(5),
    toLon: trip.to.lon.toFixed(5),
  });
  if (trip.departure) params.set('leave', trip.departure);
  if (trip.routeType) params.set('type', trip.routeType);
  return params.toString();
}

/** Absolute link to the app that opens the trip. */
export const buildTripLink = (origin: string, trip: SharedTrip) => `${origin}/?${buildTripQuery(trip)}`;

const readNumber = (params: URLSearchParams, key: string, min: number, max: number): number | null => {
  const raw = params.get(key);
  if (raw === null || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
};

const readName = (params: URLSearchParams, key: string): string | null => {
  const value = params.get(key)?.trim();
  return value && value.length <= 120 ? value : null;
};

/** Parses a trip from a query string; returns null unless both places are valid. Bad optional params are ignored. */
export function parseTripQuery(search: string): SharedTrip | null {
  const params = new URLSearchParams(search);
  const fromName = readName(params, 'from');
  const toName = readName(params, 'to');
  const fromLat = readNumber(params, 'fromLat', -90, 90);
  const fromLon = readNumber(params, 'fromLon', -180, 180);
  const toLat = readNumber(params, 'toLat', -90, 90);
  const toLon = readNumber(params, 'toLon', -180, 180);
  if (!fromName || !toName || fromLat === null || fromLon === null || toLat === null || toLon === null) return null;

  const leave = params.get('leave');
  const departure = leave && !Number.isNaN(new Date(leave).getTime()) ? new Date(leave).toISOString() : null;
  const type = params.get('type');
  const routeType = ROUTE_TYPES.find((t) => t === type) ?? null;

  return { from: place(fromName, fromLat, fromLon), to: place(toName, toLat, toLon), departure, routeType };
}

/** Query parameter names used by trip links (to strip them after opening). */
export const TRIP_LINK_PARAMS = ['from', 'fromLat', 'fromLon', 'to', 'toLat', 'toLon', 'leave', 'type'] as const;
