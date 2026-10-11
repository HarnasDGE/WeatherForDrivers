import type { RouteWarning, RouteWarningsPoint } from '@/lib/shared/types';
import { countyAt } from '../services/powiaty';

/**
 * Demo warning for mock mode, used only when IMGW has no real warning for the route, so the
 * "Official warnings" block is visible in the demo (routes through Poland only). Deterministic: it covers
 * the points between 35% and 60% of the route length and is valid from 2 h before until 3 h after the driver is there.
 */
export function mockRouteWarning(points: readonly RouteWarningsPoint[]): RouteWarning | null {
  // IMGW covers Poland only, so a route that never enters it gets no sample either.
  if (!points.some((p) => countyAt(p) !== null)) return null;
  const total = points[points.length - 1].lengthInMeters;
  let fromIndex = points.findIndex((p) => p.lengthInMeters >= total * 0.35);
  let toIndex = points.findLastIndex((p) => p.lengthInMeters <= total * 0.6);
  if (fromIndex === -1 || toIndex < fromIndex) {
    fromIndex = Math.floor((points.length - 1) / 2);
    toIndex = fromIndex;
  }

  const hour = 3600 * 1000;
  const enter = new Date(points[fromIndex].time).getTime();
  const exit = new Date(points[toIndex].time).getTime();
  const validFrom = new Date(Math.floor(enter / hour) * hour - 2 * hour);
  const validTo = new Date(Math.ceil(exit / hour) * hour + 3 * hour);
  const areas = [...new Set(points.slice(fromIndex, toIndex + 1).flatMap((p) => countyAt(p)?.name ?? []))];

  return {
    id: 'sample-strong-wind',
    level: 1,
    event: 'Silny wiatr',
    eventLabel: 'Strong wind',
    probability: 80,
    validFrom: validFrom.toISOString(),
    validTo: validTo.toISOString(),
    published: null,
    office: null,
    areas,
    stretches: [
      {
        fromIndex,
        toIndex,
        fromMeters: points[fromIndex].lengthInMeters,
        toMeters: points[toIndex].lengthInMeters,
      },
    ],
    description:
      'Sample warning for the demo, not issued by IMGW-PIB. Gusts up to 70 km/h from the west, ' +
      'take care on bridges and open stretches.',
    sample: true,
  };
}
