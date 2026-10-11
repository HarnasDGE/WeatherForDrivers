import { cumulativeMeters } from './geo';
import type { LatLon, RouteProgress } from './types';

/** Driving seconds at `offsetMeters`, linearly interpolated between timeline samples (clamped to the ends). */
export function secondsAtOffset(timeline: readonly RouteProgress[], offsetMeters: number): number {
  if (timeline.length === 0) return 0;
  if (offsetMeters <= timeline[0].offsetMeters) return timeline[0].seconds;
  for (let i = 1; i < timeline.length; i++) {
    const b = timeline[i];
    if (offsetMeters <= b.offsetMeters) {
      const a = timeline[i - 1];
      const span = b.offsetMeters - a.offsetMeters;
      return span <= 0 ? b.seconds : a.seconds + ((offsetMeters - a.offsetMeters) / span) * (b.seconds - a.seconds);
    }
  }
  return timeline[timeline.length - 1].seconds;
}

/**
 * Distance along the route for every geometry point, scaled so the last one equals `totalMeters`
 * (the road length from routing), which keeps offsets consistent with the timeline.
 */
export function pointOffsets(points: readonly LatLon[], totalMeters?: number): number[] {
  const raw = cumulativeMeters(points);
  const length = raw[raw.length - 1] ?? 0;
  if (!totalMeters || length === 0) return raw;
  const scale = totalMeters / length;
  return raw.map((m) => m * scale);
}

/** Valid timeline: at least two samples, offsets and seconds never decreasing. */
export function isUsableTimeline(timeline: readonly RouteProgress[] | undefined): timeline is RouteProgress[] {
  if (!timeline || timeline.length < 2) return false;
  return timeline.every(
    (p, i) => i === 0 || (p.offsetMeters >= timeline[i - 1].offsetMeters && p.seconds >= timeline[i - 1].seconds),
  );
}
