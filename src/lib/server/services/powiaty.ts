import type { LatLon } from '@/lib/shared/types';
import packed from '../data/powiaty.json';

/**
 * Point -> Polish county (powiat) lookup on simplified PRG boundaries shipped with the server
 * (src/lib/server/data/powiaty.json, see the README there). No network; decoded once on first use.
 */

export interface County {
  /** 4-digit TERYT code, e.g. "2212". */
  teryt: string;
  /** Official name, e.g. "powiat kartuski", "powiat Gdańsk". */
  name: string;
}

type Ring = Float64Array; // [lon0, lat0, lon1, lat1, ...]
interface Area extends County {
  bbox: [number, number, number, number];
  polygons: Ring[][];
}

interface PackedData {
  scale: number;
  areas: Array<[string, string, number[], number[][][]]>;
}

let areas: Area[] | null = null;

function decode(): Area[] {
  const { scale, areas: raw } = packed as unknown as PackedData;
  return raw.map(([teryt, name, bbox, polygons]) => ({
    teryt,
    name,
    bbox: [bbox[0] / scale, bbox[1] / scale, bbox[2] / scale, bbox[3] / scale],
    polygons: polygons.map((rings) =>
      rings.map((deltas) => {
        const ring = new Float64Array(deltas.length);
        let lon = 0;
        let lat = 0;
        for (let i = 0; i < deltas.length; i += 2) {
          lon += deltas[i];
          lat += deltas[i + 1];
          ring[i] = lon / scale;
          ring[i + 1] = lat / scale;
        }
        return ring;
      }),
    ),
  }));
}

function getAreas(): Area[] {
  areas ??= decode();
  return areas;
}

/** Even-odd ray casting; the ring is implicitly closed. */
function inRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  const n = ring.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[2 * i];
    const yi = ring[2 * i + 1];
    const xj = ring[2 * j];
    const yj = ring[2 * j + 1];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function contains(area: Area, lon: number, lat: number): boolean {
  const [minLon, minLat, maxLon, maxLat] = area.bbox;
  if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) return false;
  return area.polygons.some(
    ([outer, ...holes]) => outer !== undefined && inRing(lon, lat, outer) && !holes.some((h) => inRing(lon, lat, h)),
  );
}

/** County containing the point, or null outside Poland (or in a sliver lost to simplification). */
export function countyAt({ lat, lon }: LatLon): County | null {
  const area = getAreas().find((a) => contains(a, lon, lat));
  return area ? { teryt: area.teryt, name: area.name } : null;
}
