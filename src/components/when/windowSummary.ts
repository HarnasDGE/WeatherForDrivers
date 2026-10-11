import { assessRoad, worstOf } from '@/lib/shared/road-conditions';
import type { RoadCondition, RoadLevel } from '@/lib/shared/road-conditions';
import type { DepartureWindow, RouteWeatherPoint } from '@/lib/shared/types';
import { lightShares } from '@/components/drive/tripSummary';

const PENALTY: Record<RoadLevel, number> = { good: 0, unknown: 1, caution: 3, danger: 8 };

export interface WindowSummary {
  window: DepartureWindow;
  /** The window's weather as route checkpoints, so the Drive helpers (verdict, daylight) apply as-is. */
  points: RouteWeatherPoint[];
  worst: RoadCondition;
  /** 0..1 of the driving time in the dark. */
  darkShare: number;
  arrival: string;
  /** Lower is better. */
  score: number;
}

/** Scores every departure: bad road conditions weigh most, then driving in the dark, then waiting long. */
export function summarizeWindows(windows: DepartureWindow[], checkpoints: RouteWeatherPoint[]): WindowSummary[] {
  const now = Date.now();
  return windows.map((window) => {
    const points = window.points.map((p, i): RouteWeatherPoint => ({
      ...checkpoints[i],
      time: p.time,
      temperature: p.temperature,
      weatherCode: p.weatherCode,
      isDay: p.isDay,
    }));
    const conditions = points.map((p) => assessRoad(p));
    const shares = lightShares(points);
    const total = shares.day + shares.night;
    const darkShare = total > 0 ? shares.night / total : 0;
    const hazard = conditions.reduce((sum, c) => sum + PENALTY[c.level], 0) / Math.max(1, conditions.length);
    const hoursAway = Math.max(0, (new Date(window.departure).getTime() - now) / 3_600_000);
    const lastOffset = checkpoints[checkpoints.length - 1]?.travelTimeInSeconds ?? 0;
    return {
      window,
      points,
      worst: worstOf(conditions),
      darkShare,
      arrival: new Date(new Date(window.departure).getTime() + lastOffset * 1000).toISOString(),
      score: hazard * 10 + darkShare * 6 + hoursAway * 0.15,
    };
  });
}

export const bestIndex = (summaries: WindowSummary[]) =>
  summaries.reduce((best, s, i) => (s.score < summaries[best].score ? i : best), 0);
