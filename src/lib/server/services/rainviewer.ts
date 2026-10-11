import type { RadarFrame } from '@/lib/shared/types';
import { API_BASE } from '../config';
import { fetchJson } from '../http';
import { HttpError } from '../errors';

/** RainViewer public weather-maps API (keyless; free for personal / small-scale use, credit required). */

interface WeatherMapsResponse {
  host: string;
  radar?: { past?: Array<{ time: number; path: string }> };
}

/** The tiles exist up to this zoom (RainViewer docs); the map scales them up beyond it. */
const RADAR_MAX_ZOOM = 7;
/** Colour scheme 2 (universal blue), smoothed, no separate snow colours. */
const TILE_OPTIONS = '256/{z}/{x}/{y}/2/1_0.png';
const CACHE_MS = 5 * 60_000;

let cached: { frame: RadarFrame; fetchedAt: number } | null = null;

/** Latest radar frame; cached in memory for 5 minutes (the frame list changes every ~10 minutes). */
export async function getLatestRadarFrame(): Promise<RadarFrame> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_MS) return cached.frame;

  const maps = await fetchJson<WeatherMapsResponse>(new URL('/public/weather-maps.json', API_BASE.rainViewer), {
    service: 'RainViewer',
    retries: 1,
  });
  const latest = maps.radar?.past?.at(-1);
  if (!maps.host || !latest) throw new HttpError(502, 'UPSTREAM_ERROR', 'RainViewer has no radar frames right now.');

  const frame: RadarFrame = {
    tileUrl: `${maps.host}${latest.path}/${TILE_OPTIONS}`,
    time: new Date(latest.time * 1000).toISOString(),
    maxZoom: RADAR_MAX_ZOOM,
    attribution: '<a href="https://www.rainviewer.com/" target="_blank" rel="noopener">Weather data by RainViewer</a>',
  };
  cached = { frame, fetchedAt: Date.now() };
  return frame;
}
