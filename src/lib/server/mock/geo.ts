import type { LatLon } from '@/lib/shared/types';

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversineMeters(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Distance from the first point to every point of a polyline, metres (same length as `points`). */
export function cumulativeMeters(points: readonly LatLon[]): number[] {
  const result = [0];
  for (let i = 1; i < points.length; i++) {
    result.push(result[i - 1] + haversineMeters(points[i - 1], points[i]));
  }
  return result;
}

/** Roads are longer than straight lines; used to turn geometry length into a believable road length. */
export const ROAD_FACTOR = 1.18;
