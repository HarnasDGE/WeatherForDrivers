import type { LatLon, Route, RouteProgress, RouteType } from '@/lib/shared/types';
import { API_BASE, requireSecret, tomTomDailyBudget } from '../config';
import { rateLimited } from '../errors';
import { fetchJson } from '../http';
import { DailyBudget } from '../rate-limit';

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
    /** Present with instructionsType; travelTimeInSeconds is cumulative from the start. */
    guidance?: { instructions?: Array<{ routeOffsetInMeters: number; travelTimeInSeconds: number }> };
  }>;
}

interface CalculateRouteOptions {
  routeType?: RouteType;
  maxAlternatives?: number;
  /** Return geometry (default true). */
  withPoints?: boolean;
  /** Departure for traffic and arrival times (default: now). */
  departAt?: Date;
  /** Ask for guidance points, which carry driving time along the route. */
  withTimeline?: boolean;
}

/** Routes change with traffic: cache briefly. */
const ROUTE_CACHE_TTL_MS = 2 * 60_000;

/** Global (per process) daily guard for real TomTom calls; cache hits and mock mode do not consume it. */
let dailyBudget: DailyBudget | undefined;

function consumeDailyBudget(): void {
  dailyBudget ??= new DailyBudget(tomTomDailyBudget());
  const { allowed, retryAfterSeconds } = dailyBudget.take();
  if (!allowed) {
    console.warn('[rate-limit] TomTom daily budget exhausted');
    throw rateLimited('Too many route checks today. Try again tomorrow.', retryAfterSeconds);
  }
}

const toLocation = (p: LatLon) => `${p.lat},${p.lon}`;

async function calculateRouteRaw(from: LatLon, to: LatLon, options: CalculateRouteOptions) {
  const url = new URL(`/routing/1/calculateRoute/${toLocation(from)}:${toLocation(to)}/json`, API_BASE.tomTom);
  url.searchParams.set('key', requireSecret('TOMTOM_API_KEY'));
  if (options.routeType) url.searchParams.set('routeType', options.routeType);
  if (options.maxAlternatives) url.searchParams.set('maxAlternatives', String(options.maxAlternatives));
  if (options.withPoints === false) url.searchParams.set('routeRepresentation', 'summaryOnly');
  if (options.withTimeline) url.searchParams.set('instructionsType', 'coded');
  if (options.departAt && options.departAt.getTime() > Date.now()) {
    url.searchParams.set('departAt', options.departAt.toISOString());
  }

  const res = await fetchJson<TomTomRouteResponse>(url, {
    service: SERVICE,
    retries: 2,
    cacheTtlMs: ROUTE_CACHE_TTL_MS,
    onUpstreamCall: consumeDailyBudget,
  });
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
  const routes = await calculateRouteRaw(from, to, { routeType, maxAlternatives: 2, departAt, withTimeline: true });
  return routes.map((r) => ({
    summary: {
      lengthInMeters: r.summary.lengthInMeters,
      travelTimeInSeconds: r.summary.travelTimeInSeconds,
      trafficDelayInSeconds: r.summary.trafficDelayInSeconds ?? 0,
      departureTime: r.summary.departureTime,
      arrivalTime: r.summary.arrivalTime,
    },
    points: r.legs.flatMap((leg) => leg.points.map((p) => ({ lat: p.latitude, lon: p.longitude }))),
    timeline: toTimeline(r.guidance?.instructions ?? [], r.summary),
  }));
}

/** Guidance points -> increasing {offset, seconds} samples from {0, 0} to the route's end. */
function toTimeline(
  instructions: Array<{ routeOffsetInMeters: number; travelTimeInSeconds: number }>,
  summary: TomTomSummary,
): RouteProgress[] {
  const samples: RouteProgress[] = [{ offsetMeters: 0, seconds: 0 }];
  for (const i of instructions) {
    const last = samples[samples.length - 1];
    if (i.routeOffsetInMeters > last.offsetMeters && i.travelTimeInSeconds >= last.seconds) {
      samples.push({ offsetMeters: i.routeOffsetInMeters, seconds: i.travelTimeInSeconds });
    }
  }
  const last = samples[samples.length - 1];
  if (summary.lengthInMeters > last.offsetMeters) {
    samples.push({
      offsetMeters: summary.lengthInMeters,
      seconds: Math.max(last.seconds, summary.travelTimeInSeconds),
    });
  }
  return samples;
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
