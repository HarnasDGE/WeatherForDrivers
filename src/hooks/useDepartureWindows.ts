import { useEffect, useState } from 'react';
import { fetchDepartureWindows } from '@/lib/client/api';
import type { DepartureWindow, RouteWeatherPoint } from '@/lib/shared/types';

/** Departures checked: now, then every hour for a day. */
const HOURS_AHEAD = 24;

type State =
  | { status: 'idle' | 'loading'; windows: DepartureWindow[]; error: null }
  | { status: 'succeeded'; windows: DepartureWindow[]; error: null }
  | { status: 'failed'; windows: DepartureWindow[]; error: string };

// Survives tab switches; keyed by route checkpoints and the hour it was asked in.
const cache = new Map<string, DepartureWindow[]>();

const nextFullHour = (now = new Date()) => {
  const date = new Date(now);
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return date;
};

/** Weather at the route's checkpoints for "now" and each of the next 24 full hours. */
export function useDepartureWindows(checkpoints: RouteWeatherPoint[]) {
  const [state, setState] = useState<State>({ status: 'idle', windows: [], error: null });
  const key =
    checkpoints.map((c) => `${c.lat.toFixed(3)},${c.lon.toFixed(3)},${c.travelTimeInSeconds}`).join('|') +
    `@${nextFullHour().toISOString()}`;

  useEffect(() => {
    if (checkpoints.length < 2) return;
    const cached = cache.get(key);
    if (cached) {
      setState({ status: 'succeeded', windows: cached, error: null });
      return;
    }
    let cancelled = false;
    setState({ status: 'loading', windows: [], error: null });
    const body = (start: Date, count: number) => ({
      checkpoints: checkpoints.map((c) => ({ lat: c.lat, lon: c.lon, offsetSeconds: c.travelTimeInSeconds })),
      start: start.toISOString(),
      count,
      stepMinutes: 60,
    });
    Promise.all([fetchDepartureWindows(body(new Date(), 1)), fetchDepartureWindows(body(nextFullHour(), HOURS_AHEAD))])
      .then(([now, later]) => {
        const windows = [...now, ...later];
        cache.set(key, windows);
        if (!cancelled) setState({ status: 'succeeded', windows, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'failed',
            windows: [],
            error: error instanceof Error ? error.message : 'Could not check other departure times.',
          });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
