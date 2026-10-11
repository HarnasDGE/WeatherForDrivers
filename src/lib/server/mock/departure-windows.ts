import type { DepartureWindow, DepartureWindowsRequest } from '@/lib/shared/types';
import { roundToFifteenMinutes } from '../time';
import { departureTimes } from '../services/departure-windows';
import { sampleWeather } from './weather-field';

/** Demo replacement for getDepartureWindows (same weather field as the demo route weather). */
export function mockDepartureWindows(request: DepartureWindowsRequest): DepartureWindow[] {
  return departureTimes(request).map((departure) => ({
    departure: departure.toISOString(),
    points: request.checkpoints.map((checkpoint) => {
      const arrival = roundToFifteenMinutes(new Date(departure.getTime() + checkpoint.offsetSeconds * 1000));
      const sample = sampleWeather(checkpoint, arrival);
      return {
        time: arrival.toISOString(),
        temperature: sample.temperature,
        weatherCode: sample.weatherCode,
        isDay: sample.isDay,
        dewPoint: sample.dewPoint,
        surfaceTemperature: sample.surfaceTemperature,
      };
    }),
  }));
}
