import type { LatLon, Route, RouteType } from '@/lib/shared/types';
import { API_BASE, requireSecret } from '../config';
import { fetchJson } from '../http';

/** TomTom Routing API (requires TOMTOM_API_KEY). */

const SERVICE = 'TomTom';

interface TomTomSummary {
  lengthInMeters: number;
  travelTimeInSeconds: number;
  trafficDelayInSeconds?: number;
  departureTime: string;
  arrivalTime: string;
}

interface TomTomRouteResponse {
  routes?: Array<{
    summary: TomTomSummary;
    legs: Array<{ points: Array<{ latitude: number; longitude: number }> }>;
  }>;
}

interface CalculateRouteOptions {
  routeType?: RouteType;
  maxAlternatives?: number;
  /** Return geometry (default true). */
  withPoints?: boolean;
  /** Departure for traffic and arrival times (default: now). */
  departAt?: Date;
}

const toLocation = (p: LatLon) => `${p.lat},${p.lon}`;

async function calculateRouteRaw(from: LatLon, to: LatLon, options: CalculateRouteOptions) {
  const url = new URL(
    `/routing/1/calculateRoute/${toLocation(from)}:${toLocation(to)}/json`,
    API_BASE.tomTom,
  );
  url.searchParams.set('key', requireSecret('TOMTOM_API_KEY'));
  if (options.routeType) url.searchParams.set('routeType', options.routeType);
  if (options.maxAlternatives) url.searchParams.set('maxAlternatives', String(options.maxAlternatives));
  if (options.withPoints === false) url.searchParams.set('routeRepresentation', 'summaryOnly');
  if (options.departAt && options.departAt.getTime() > Date.now()) {
    url.searchParams.set('departAt', options.departAt.toISOString());
  }

  const res = await fetchJson<TomTomRouteResponse>(url, { service: SERVICE, retries: 2 });
  if (!res.routes?.length) return [];
  return res.routes;
}

/** Main route + up to 2 alternatives (legacy `fetchRoute`, maxAlternatives=2). */
export async function calculateRoutes(
  from: LatLon,
  to: LatLon,
  routeType: RouteType,
  departAt?: Date,
): Promise<Route[]> {
  const routes = await calculateRouteRaw(from, to, { routeType, maxAlternatives: 2, departAt });
  return routes.map((r) => ({
    summary: {
      lengthInMeters: r.summary.lengthInMeters,
      travelTimeInSeconds: r.summary.travelTimeInSeconds,
      trafficDelayInSeconds: r.summary.trafficDelayInSeconds ?? 0,
      departureTime: r.summary.departureTime,
      arrivalTime: r.summary.arrivalTime,
    },
    points: r.legs.flatMap((leg) => leg.points.map((p) => ({ lat: p.latitude, lon: p.longitude }))),
  }));
}

/**
 * Driving distance/time/arrival from `from` to `to` (legacy per-control-point
 * request in `fetchWeatherInformation`; default routeType like legacy).
 * Only the summary is requested to keep responses small.
 */
export async function getTravelSummary(from: LatLon, to: LatLon, departAt?: Date): Promise<TomTomSummary | null> {
  const routes = await calculateRouteRaw(from, to, { withPoints: false, departAt });
  return routes[0]?.summary ?? null;
}
