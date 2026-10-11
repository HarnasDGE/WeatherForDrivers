import { angleDiff, bearing } from './geo';
import { pointOffsets } from './route-timeline';
import type { RoadLevel } from './road-conditions';
import { sunPosition } from './sun';
import type { LatLon, RouteProgress, RouteWeatherPoint } from './types';

/**
 * Sun glare and crosswind along a route: where the low sun shines straight through the windscreen,
 * and where gusts hit the side of the car. Pure functions, computed on the client.
 */

export type ExposureKind = 'glare' | 'wind';

export interface ExposureStretch {
  kind: ExposureKind;
  level: Extract<RoadLevel, 'caution' | 'danger'>;
  fromMeters: number;
  toMeters: number;
  fromTime: string;
  toTime: string;
  /** Glare: lowest sun elevation on the stretch (deg). Wind: strongest crosswind gust (km/h). */
  peak: number;
  /** Wind: side the gusts come from. */
  side?: 'left' | 'right';
}

export interface Exposure {
  stretches: ExposureStretch[];
  /** Trip length, metres (for drawing the ribbon). */
  totalMeters: number;
  departure: string;
  arrival: string;
}

/** Sample spacing along the route. */
const STEP_METERS = 2_000;
/** Heading is measured over this distance, so small kinks do not count. */
const HEADING_SPAN_METERS = 600;

/** Low sun ahead: below this elevation and within this angle of the heading. */
const GLARE_MAX_ELEVATION = 22;
const GLARE_MAX_ANGLE = 30;
const GLARE_STRONG_ELEVATION = 10;
const GLARE_STRONG_ANGLE = 15;
/** Glare needs a mostly clear sky (WMO 0-2). */
const CLEAR_SKY_MAX_CODE = 2;

/** Crosswind gust thresholds, km/h (vans, trailers and roof boxes feel the lower one already). */
const WIND_CAUTION = 35;
const WIND_DANGER = 55;

interface Flag {
  level: 'caution' | 'danger';
  value: number;
  side?: 'left' | 'right';
}

interface Sample {
  offset: number;
  time: Date;
  glare: Flag | null;
  wind: Flag | null;
}

/** The checkpoint whose stretch contains this offset (weather is held from one checkpoint to the next). */
function checkpointAt(checkpoints: RouteWeatherPoint[], offset: number): RouteWeatherPoint {
  let current = checkpoints[0];
  for (const cp of checkpoints) {
    if (cp.lengthInMeters <= offset) current = cp;
    else break;
  }
  return current;
}

function interpolatedSeconds(timeline: RouteProgress[], offset: number): number {
  for (let i = 1; i < timeline.length; i++) {
    const a = timeline[i - 1];
    const b = timeline[i];
    if (offset <= b.offsetMeters) {
      const span = b.offsetMeters - a.offsetMeters;
      return span <= 0 ? b.seconds : a.seconds + ((offset - a.offsetMeters) / span) * (b.seconds - a.seconds);
    }
  }
  return timeline[timeline.length - 1]?.seconds ?? 0;
}

function glareAt(point: LatLon, heading: number, time: Date, weatherCode: number | null) {
  if (weatherCode == null || weatherCode > CLEAR_SKY_MAX_CODE) return null;
  const sun = sunPosition(point, time);
  if (sun.elevation <= 0 || sun.elevation > GLARE_MAX_ELEVATION) return null;
  const angle = Math.abs(angleDiff(sun.azimuth, heading));
  if (angle > GLARE_MAX_ANGLE) return null;
  const strong = sun.elevation <= GLARE_STRONG_ELEVATION && angle <= GLARE_STRONG_ANGLE;
  return { level: strong ? ('danger' as const) : ('caution' as const), value: sun.elevation };
}

function windAt(heading: number, cp: RouteWeatherPoint) {
  const gust = cp.windGusts ?? (cp.windSpeed != null ? cp.windSpeed * 1.4 : null);
  if (gust == null || cp.windDirection == null) return null;
  // Positive relative angle = wind coming from the right of the direction of travel.
  const relative = angleDiff(cp.windDirection, heading);
  const cross = Math.abs(gust * Math.sin((relative * Math.PI) / 180));
  if (cross < WIND_CAUTION) return null;
  return {
    level: cross >= WIND_DANGER ? ('danger' as const) : ('caution' as const),
    value: Math.round(cross),
    side: relative >= 0 ? ('right' as const) : ('left' as const),
  };
}

/** Merges consecutive flagged samples of one kind into stretches. */
function stretchesOf(kind: ExposureKind, samples: Sample[]): ExposureStretch[] {
  const result: ExposureStretch[] = [];
  let open: ExposureStretch | null = null;
  for (const sample of samples) {
    const flag = sample[kind];
    if (flag) {
      if (!open) {
        open = {
          kind,
          level: flag.level,
          fromMeters: sample.offset,
          toMeters: sample.offset,
          fromTime: sample.time.toISOString(),
          toTime: sample.time.toISOString(),
          peak: flag.value,
          side: flag.side,
        };
        result.push(open);
      }
      open.toMeters = sample.offset;
      open.toTime = sample.time.toISOString();
      if (flag.level === 'danger') open.level = 'danger';
      open.peak = kind === 'glare' ? Math.min(open.peak, flag.value) : Math.max(open.peak, flag.value);
    } else {
      open = null;
    }
  }
  // A single sample still covers about one step of road.
  for (const s of result) s.toMeters = Math.max(s.toMeters, s.fromMeters + STEP_METERS);
  return result;
}

/**
 * Walks the route every ~2 km: heading from the geometry, time from the timeline (or the checkpoints),
 * sun position from astronomy, wind from the nearest checkpoint behind.
 */
export function computeExposure(
  points: readonly LatLon[],
  checkpoints: RouteWeatherPoint[],
  departure: string,
  timeline?: RouteProgress[],
): Exposure | null {
  if (points.length < 2 || checkpoints.length < 2) return null;
  const totalMeters = checkpoints[checkpoints.length - 1].lengthInMeters;
  const offsets = pointOffsets(points, totalMeters);
  // The checkpoints themselves are a usable timeline when the route has none.
  const progress =
    timeline && timeline.length >= 2
      ? timeline
      : checkpoints.map((cp) => ({ offsetMeters: cp.lengthInMeters, seconds: cp.travelTimeInSeconds }));
  const start = new Date(departure).getTime();

  const samples: Sample[] = [];
  let next = 0;
  let ahead = 0;
  for (let i = 0; i < points.length; i++) {
    if (offsets[i] < next && i !== points.length - 1) continue;
    next = offsets[i] + STEP_METERS;
    while (ahead < points.length - 1 && offsets[ahead] < offsets[i] + HEADING_SPAN_METERS) ahead++;
    if (ahead === i) break;
    const heading = bearing(points[i], points[ahead]);
    const time = new Date(start + interpolatedSeconds(progress, offsets[i]) * 1000);
    const cp = checkpointAt(checkpoints, offsets[i]);
    samples.push({
      offset: offsets[i],
      time,
      glare: glareAt(points[i], heading, time, cp.weatherCode),
      wind: windAt(heading, cp),
    });
  }

  const arrival = new Date(start + checkpoints[checkpoints.length - 1].travelTimeInSeconds * 1000).toISOString();
  return {
    stretches: [...stretchesOf('glare', samples), ...stretchesOf('wind', samples)].sort(
      (a, b) => a.fromMeters - b.fromMeters,
    ),
    totalMeters,
    departure,
    arrival,
  };
}
