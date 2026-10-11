import type { Place } from '@/lib/shared/types';
import { searchPlaces as searchOpenMeteo } from './openmeteo';
import * as photon from './photon';

/**
 * Single geocoding entry point: Photon first (typo tolerant, local names), Open-Meteo
 * (language=pl) when Photon fails, times out or finds nothing.
 */

export async function searchPlaces(query: string, limit: number): Promise<Place[]> {
  try {
    const places = await photon.searchPlaces(query, limit);
    if (places.length > 0) return places;
  } catch {
    // already logged by fetchJson; fall through to the fallback
  }
  return searchOpenMeteo(query, limit, 'pl');
}

export const FALLBACK_LOCATION_NAME = 'Your location';

/** Name for coordinates; never throws - an unnamed spot is still a usable "Your location". */
export async function reversePlace(lat: number, lon: number): Promise<Place> {
  try {
    const place = await photon.reversePlace(lat, lon);
    // Keep the user's exact coordinates, only borrow the names.
    if (place) return { ...place, lat, lon };
  } catch {
    // fall through
  }
  return { name: FALLBACK_LOCATION_NAME, lat, lon, countryCode: null, country: null, admin1: null };
}
