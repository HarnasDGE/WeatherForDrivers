import { formatClock, formatDistanceKm } from '@/lib/shared/format';
import { assessRoad, worstOf } from '@/lib/shared/road-conditions';
import type { RoadCondition, RoadLevel } from '@/lib/shared/road-conditions';
import { PLACE_ON_THE_ROAD, type Route, type RouteWeather, type RouteWeatherPoint } from '@/lib/shared/types';

const RANK: Record<RoadLevel, number> = { unknown: 0, good: 1, caution: 2, danger: 3 };

/** Checkpoint label: trip ends get the searched names, unnamed points their distance. */
export function checkpointName(point: RouteWeatherPoint, index: number, count: number, from: string, to: string) {
  if (index === 0) return from;
  if (index === count - 1) return to;
  return point.name && point.name !== PLACE_ON_THE_ROAD ? point.name : `Road at ${formatDistanceKm(point.lengthInMeters)}`;
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
