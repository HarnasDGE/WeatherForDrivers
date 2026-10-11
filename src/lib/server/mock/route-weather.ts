import { PLACE_ON_THE_ROAD, type LatLon, type RouteWeather } from '@/lib/shared/types';
import { roundToFifteenMinutes } from '../time';
import { selectControlPoints } from '../services/route-weather';
import { ROAD_FACTOR, cumulativeMeters } from './geo';
import { sampleWeather } from './weather-field';

/** Demo replacement for getWeatherAlongRoutes (same control-point selection, fake travel times and weather). */

const AVERAGE_SPEED_MS = (86 * 1000) / 3600;

export function mockWeatherAlongRoutes(
  routes: ReadonlyArray<{ points: readonly LatLon[] }>,
  controlPoints: number,
  departure = new Date(),
): RouteWeather[] {
  return routes.map((route, routeIndex) => {
    const distances = cumulativeMeters(route.points);
    const indexed = route.points.map((point, index) => ({ point, index }));
    return {
      routeIndex,
      points: selectControlPoints(indexed, controlPoints).map(({ point, index }) => {
        const lengthInMeters = Math.round(distances[index] * ROAD_FACTOR);
        const travelTimeInSeconds = Math.round(lengthInMeters / AVERAGE_SPEED_MS);
        const arrival = roundToFifteenMinutes(new Date(departure.getTime() + travelTimeInSeconds * 1000));
        const sample = sampleWeather(point, arrival);
        return {
          lat: point.lat,
          lon: point.lon,
          name: PLACE_ON_THE_ROAD,
          lengthInMeters,
          travelTimeInSeconds,
          time: arrival.toISOString(),
          temperature: sample.temperature,
          weatherCode: sample.weatherCode,
          isDay: sample.isDay,
        };
      }),
    };
  });
}
