import { formatClock, formatDistanceKm } from '@/lib/shared/format';
import { assessRoad, worstOf } from '@/lib/shared/road-conditions';
import type { RoadCondition, RoadLevel } from '@/lib/shared/road-conditions';
import { PLACE_ON_THE_ROAD, type Route, type RouteWeather, type RouteWeatherPoint } from '@/lib/shared/types';

const RANK: Record<RoadLevel, number> = { unknown: 0, good: 1, caution: 2, danger: 3 };

/** Checkpoint label: trip ends get the searched names, unnamed points their distance. */
export function checkpointName(point: RouteWeatherPoint, index: number, count: number, from: string, to: string) {
  if (index === 0) return from;
  if (index === count - 1) return to;
  return point.name && point.name !== PLACE_ON_THE_ROAD
    ? point.name
    : `Road at ${formatDistanceKm(point.lengthInMeters)}`;
}

/** One sentence answering "is the drive OK, and where does it get bad?". */
export function tripVerdict(points: RouteWeatherPoint[]): { condition: RoadCondition; text: string } | null {
  if (points.length === 0) return null;
  const conditions = points.map((p) => assessRoad(p));
  const worst = worstOf(conditions);
  if (worst.level === 'unknown') return { condition: worst, text: 'No forecast for this trip yet.' };
  if (worst.level === 'good') return { condition: worst, text: 'Dry roads all the way.' };
  const index = conditions.findIndex((c) => c.level === worst.level);
  const point = points[index];
  const text =
    index === 0
      ? `${worst.label} as you set off.`
      : `${worst.label} around ${formatClock(point.time)}, ${formatDistanceKm(point.lengthInMeters)} in.`;
  return { condition: worst, text };
}

export interface RouteOption {
  route: Route;
  /** null while the weather is loading. */
  condition: RoadCondition | null;
  quickest: boolean;
  calmest: boolean;
}

/** Routes with their worst condition and "quickest" / "calmest weather" tags (only when there is a choice). */
export function routeOptions(routes: Route[], weather: RouteWeather[]): RouteOption[] {
  const hasWeather = weather.length === routes.length && routes.length > 0;
  const scores = routes.map((_, i) =>
    hasWeather ? weather[i].points.reduce((sum, p) => sum + RANK[assessRoad(p).level], 0) : 0,
  );
  const minTime = Math.min(...routes.map((r) => r.summary.travelTimeInSeconds));
  const minScore = Math.min(...scores);
  const calmestCount = scores.filter((s) => s === minScore).length;
  return routes.map((route, i) => ({
    route,
    condition: hasWeather ? worstOf(weather[i].points.map((p) => assessRoad(p))) : null,
    quickest: routes.length > 1 && route.summary.travelTimeInSeconds === minTime,
    calmest: routes.length > 1 && hasWeather && calmestCount === 1 && scores[i] === minScore,
  }));
}

/* ----------------------------- daylight ----------------------------- */

export type Light = 'day' | 'night';

/** Unknown day/night counts as day (the road drawing stays neutral). */
export const lightAt = (point: RouteWeatherPoint): Light => (point.isDay === false ? 'night' : 'day');

/** A change of light between two checkpoints: it happens somewhere between their arrival times. */
export interface LightChange {
  /** Index of the checkpoint after the change. */
  index: number;
  kind: 'sunset' | 'sunrise';
  from: string;
  to: string;
}

export function lightChanges(points: RouteWeatherPoint[]): LightChange[] {
  const changes: LightChange[] = [];
  for (let i = 1; i < points.length; i++) {
    const before = lightAt(points[i - 1]);
    const after = lightAt(points[i]);
    if (before !== after) {
      changes.push({
        index: i,
        kind: after === 'night' ? 'sunset' : 'sunrise',
        from: points[i - 1].time,
        to: points[i].time,
      });
    }
  }
  return changes;
}

/** Driving time in daylight vs in the dark (a stretch with a change is split in half). */
export function lightShares(points: RouteWeatherPoint[]): Record<Light, number> {
  const shares: Record<Light, number> = { day: 0, night: 0 };
  for (let i = 1; i < points.length; i++) {
    const seconds = Math.max(0, points[i].travelTimeInSeconds - points[i - 1].travelTimeInSeconds);
    const before = lightAt(points[i - 1]);
    const after = lightAt(points[i]);
    shares[before] += before === after ? seconds : seconds / 2;
    if (before !== after) shares[after] += seconds / 2;
  }
  return shares;
}

/** One sentence on daylight, e.g. "It gets dark between 17:00 and 17:45, 380 km in." */
export function lightSummary(points: RouteWeatherPoint[]): string {
  if (points.length === 0) return '';
  const changes = lightChanges(points);
  if (changes.length === 0) return lightAt(points[0]) === 'day' ? 'All in daylight.' : 'All of it in the dark.';
  const first = changes[0];
  const what = first.kind === 'sunset' ? 'It gets dark' : 'It gets light';
  const where =
    first.index === 1 ? 'soon after you set off' : `after ${formatDistanceKm(points[first.index - 1].lengthInMeters)}`;
  const more =
    changes.length > 1 ? ` Light changes ${changes.length - 1} more time${changes.length > 2 ? 's' : ''}.` : '';
  return `${what} between ${formatClock(first.from)} and ${formatClock(first.to)}, ${where}.${more}`;
}
