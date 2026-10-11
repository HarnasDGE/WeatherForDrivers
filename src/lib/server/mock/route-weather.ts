import { PLACE_ON_THE_ROAD, type LatLon, type RouteProgress, type RouteWeather } from '@/lib/shared/types';
import { isUsableTimeline, pointOffsets, secondsAtOffset } from '@/lib/shared/route-timeline';
import { roundToFifteenMinutes } from '../time';
import { selectControlPoints } from '../services/route-weather';
import { ROAD_FACTOR, sampleWeather } from './weather-field';

/** Demo replacement for getWeatherAlongRoutes: same control-point selection and timing, fake weather. */

const AVERAGE_SPEED_MS = (86 * 1000) / 3600;

/** Without a timeline, assume a steady average speed over the road length. */
const fallbackTimeline = (points: readonly LatLon[]): RouteProgress[] => {
  const length = (pointOffsets(points).at(-1) ?? 0) * ROAD_FACTOR;
  return [
    { offsetMeters: 0, seconds: 0 },
    { offsetMeters: length, seconds: length / AVERAGE_SPEED_MS },
  ];
};

export function mockWeatherAlongRoutes(
  routes: ReadonlyArray<{ points: readonly LatLon[]; timeline?: RouteProgress[] }>,
  controlPoints: number,
  departure = new Date(),
): RouteWeather[] {
  return routes.map((route, routeIndex) => {
    const timeline = isUsableTimeline(route.timeline) ? route.timeline : fallbackTimeline(route.points);
    const offsets = pointOffsets(route.points, timeline[timeline.length - 1].offsetMeters);
    const indexed = route.points.map((point, index) => ({ point, index }));
    return {
      routeIndex,
      points: selectControlPoints(indexed, controlPoints).map(({ point, index }) => {
        const travelTimeInSeconds = Math.round(secondsAtOffset(timeline, offsets[index]));
        const arrival = roundToFifteenMinutes(new Date(departure.getTime() + travelTimeInSeconds * 1000));
        const sample = sampleWeather(point, arrival);
        return {
          lat: point.lat,
          lon: point.lon,
          name: PLACE_ON_THE_ROAD,
          lengthInMeters: Math.round(offsets[index]),
          travelTimeInSeconds,
          time: arrival.toISOString(),
          temperature: sample.temperature,
          weatherCode: sample.weatherCode,
          isDay: sample.isDay,
          windSpeed: sample.windSpeed,
          windGusts: sample.windGusts,
          windDirection: sample.windDirection,
          dewPoint: sample.dewPoint,
          surfaceTemperature: sample.surfaceTemperature,
        };
      }),
    };
  });
}
