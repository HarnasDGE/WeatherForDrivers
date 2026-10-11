import type { LatLon } from '@/lib/shared/types';

/**
 * Deterministic, spatially smooth fake weather, so demo routes show a believable story
 * (clear stretches, a band of rain, a foggy valley...) and nearby points agree with each other.
 */

export interface FieldSample {
  /** WMO weather code. */
  weatherCode: number;
  /** °C */
  temperature: number;
  /** km/h */
  windSpeed: number;
  /** % */
  humidity: number;
  isDay: boolean;
}

/** 0..1, smooth over ~100 km, slowly drifting with time. */
function wetness({ lat, lon }: LatLon, hours: number): number {
  const drift = hours * 0.05;
  const value =
    0.5 +
    0.28 * Math.sin(lat * 1.9 + lon * 0.7 + drift) +
    0.17 * Math.sin(lon * 2.6 - lat * 0.8 - drift * 1.3) +
    0.05 * Math.sin(lat * 7.3 + lon * 5.1);
  return Math.min(1, Math.max(0, value));
}

/** Rough local solar hour from UTC time and longitude. */
const localHour = (date: Date, lon: number) => (((date.getUTCHours() + date.getUTCMinutes() / 60 + lon / 15) % 24) + 24) % 24;

export function sampleWeather(point: LatLon, at: Date): FieldSample {
  const hour = localHour(at, point.lon);
  const hours = at.getTime() / 3_600_000;
  const daily = 4 * Math.sin(((hour - 9) / 24) * 2 * Math.PI);
  const temperature = Math.round((13 - (point.lat - 50) * 0.7 + daily + 2 * Math.sin(point.lon * 1.3)) * 10) / 10;
  const wet = wetness(point, hours);
  const cold = temperature <= 1.5;

  let weatherCode: number;
  if (wet < 0.32) weatherCode = 0;
  else if (wet < 0.44) weatherCode = 2;
  else if (wet < 0.54) weatherCode = 3;
  else if (wet < 0.62) weatherCode = cold ? 56 : 53;
  else if (wet < 0.7) weatherCode = 45;
  else if (wet < 0.82) weatherCode = cold ? 73 : 63;
  else if (wet < 0.92) weatherCode = cold ? 75 : 65;
  else weatherCode = cold ? 86 : 95;

  return {
    weatherCode,
    temperature,
    windSpeed: Math.round(8 + wet * 30),
    humidity: Math.round(45 + wet * 50),
    isDay: hour >= 7 && hour < 19,
  };
}
