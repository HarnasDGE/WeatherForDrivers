import type { LatLon } from './types';

/** Geometry on the sphere - shared by the server (demo data) and the client (sun glare, crosswind). */

const EARTH_RADIUS_M = 6_371_000;
export const toRad = (deg: number) => (deg * Math.PI) / 180;
export const toDeg = (rad: number) => (rad * 180) / Math.PI;

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

/** Initial compass bearing from a to b, degrees 0..360 (0 = north, 90 = east). */
export function bearing(a: LatLon, b: LatLon): number {
  const y = Math.sin(toRad(b.lon - a.lon)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lon - a.lon));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Smallest signed difference a - b between two bearings, -180..180. */
export function angleDiff(a: number, b: number): number {
  return ((a - b + 540) % 360) - 180;
}
