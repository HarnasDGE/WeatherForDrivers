import type { LatLon, Place, Route, RouteType } from '@/lib/shared/types';
import { ROAD_FACTOR, cumulativeMeters } from './geo';

/** Demo replacement for TomTom routing: a main route and two alternatives bent around the straight line. */

const POINTS_PER_ROUTE = 180;

const VARIANTS = [
  { bend: 0.06, wiggle: 0.012, speedKmh: 92, delayShare: 0.05 },
  { bend: -0.13, wiggle: 0.02, speedKmh: 88, delayShare: 0.01 },
  { bend: 0.2, wiggle: 0.03, speedKmh: 78, delayShare: 0 },
] as const;

const TYPE_SPEED: Record<RouteType, number> = { fastest: 1, shortest: 0.88, eco: 0.85, thrilling: 0.72 };

function bentLine(from: LatLon, to: LatLon, bend: number, wiggle: number): LatLon[] {
  const dLat = to.lat - from.lat;
  const dLon = to.lon - from.lon;
  // Perpendicular offset, scaled by the trip length so short and long trips look alike.
  return Array.from({ length: POINTS_PER_ROUTE }, (_, i) => {
    const t = i / (POINTS_PER_ROUTE - 1);
    const offset = bend * Math.sin(Math.PI * t) + wiggle * Math.sin(Math.PI * t * 9) * Math.sin(Math.PI * t);
    return {
      lat: from.lat + dLat * t - dLon * offset,
      lon: from.lon + dLon * t + dLat * offset,
    };
  });
}

export function mockRoutes(from: Place, to: Place, routeType: RouteType, now = new Date()): Route[] {
  if (from.lat === to.lat && from.lon === to.lon) return [];
  return VARIANTS.map((variant) => {
    const points = bentLine(from, to, variant.bend, variant.wiggle);
    const lengthInMeters = Math.round((cumulativeMeters(points).at(-1) ?? 0) * ROAD_FACTOR);
    const speedMs = (variant.speedKmh * TYPE_SPEED[routeType] * 1000) / 3600;
    const driving = lengthInMeters / speedMs;
    const trafficDelayInSeconds = Math.round(driving * variant.delayShare);
    const travelTimeInSeconds = Math.round(driving + trafficDelayInSeconds);
    return {
      summary: {
        lengthInMeters,
        travelTimeInSeconds,
        trafficDelayInSeconds,
        departureTime: now.toISOString(),
        arrivalTime: new Date(now.getTime() + travelTimeInSeconds * 1000).toISOString(),
      },
      points,
    };
  });
}
