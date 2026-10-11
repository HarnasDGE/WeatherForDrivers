import type { Place } from '@/lib/shared/types';
import { API_BASE } from '../config';
import { fetchJson } from '../http';

/**
 * Photon by Komoot (OpenStreetMap data, no API key). Typo- and prefix-tolerant, returns local
 * (e.g. Polish) names. Shared public instance: be gentle and identify the app.
 */

const SERVICE = 'Photon';
const USER_AGENT = 'WeatherForDrivers/1.0 (+https://github.com/HarnasDGE/WeatherForDrivers)';

/** Search is biased (not restricted) towards Poland, so foreign towns still show up. */
const BIAS = { lat: 52.0, lon: 19.4, zoom: 6, scale: 0.4 };

/** Towns/cities/villages and city districts: places a driver would enter, no streets or POIs. */
const LAYERS = ['city', 'district'] as const;
const PLACE_KINDS = new Set([
  'city',
  'town',
  'village',
  'municipality',
  'suburb',
  'borough',
  'city_district',
  'quarter',
]);

/** Search radius (km) for reverse geocoding, so a spot between villages still resolves to one. */
const REVERSE_RADIUS_KM = 30;

interface PhotonResponse {
  features?: Array<{
    geometry?: { coordinates?: [number, number] };
    properties?: {
      name?: string;
      osm_value?: string;
      state?: string;
      country?: string;
      countrycode?: string;
    };
  }>;
}

function toPlace(feature: NonNullable<PhotonResponse['features']>[number]): Place | null {
  const [lon, lat] = feature.geometry?.coordinates ?? [];
  const p = feature.properties;
  if (!p?.name || typeof lat !== 'number' || typeof lon !== 'number') return null;
  if (p.osm_value && !PLACE_KINDS.has(p.osm_value)) return null; // hamlets, farms, squares...
  return {
    name: p.name,
    lat,
    lon,
    countryCode: p.countrycode ? p.countrycode.toUpperCase() : null,
    country: p.country ?? null,
    admin1: p.state ?? null,
  };
}

/** Drops near-identical results (same name within ~5 km), keeping the first (best ranked). */
function dedupe(places: Place[]): Place[] {
  const seen = new Set<string>();
  return places.filter((p) => {
    const key = `${p.name.toLowerCase()}|${Math.round(p.lat * 20)}|${Math.round(p.lon * 20)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function photonUrl(path: string): URL {
  const url = new URL(path, API_BASE.photon);
  url.searchParams.set('lang', 'default'); // local names
  for (const layer of LAYERS) url.searchParams.append('layer', layer);
  return url;
}

const request = (url: URL) =>
  fetchJson<PhotonResponse>(url, {
    service: SERVICE,
    retries: 1,
    init: { headers: { 'User-Agent': USER_AGENT } },
    // Place names do not change: a day of caching also keeps us within Photon's fair use.
    cacheTtlMs: 24 * 3600_000,
  });

export async function searchPlaces(query: string, limit: number): Promise<Place[]> {
  const url = photonUrl('/api/');
  url.searchParams.set('q', query);
  // Ask for more than needed: filtering and deduplication drop some.
  url.searchParams.set('limit', String(Math.min(limit * 3, 30)));
  url.searchParams.set('lat', String(BIAS.lat));
  url.searchParams.set('lon', String(BIAS.lon));
  url.searchParams.set('zoom', String(BIAS.zoom));
  url.searchParams.set('location_bias_scale', String(BIAS.scale));

  const res = await request(url);
  const places = (res.features ?? []).map(toPlace).filter((p): p is Place => p !== null);
  return dedupe(places).slice(0, limit);
}

/** Nearest town/district to the coordinates, or null when Photon knows none. */
export async function reversePlace(lat: number, lon: number): Promise<Place | null> {
  const url = photonUrl('/reverse');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('radius', String(REVERSE_RADIUS_KM));
  url.searchParams.set('limit', '3');

  const res = await request(url);
  for (const feature of res.features ?? []) {
    const place = toPlace(feature);
    if (place) return place;
  }
  return null;
}
