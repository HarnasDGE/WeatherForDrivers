import type { LatLon } from './types';
import { toDeg, toRad } from './geo';

/**
 * Sun position (NOAA solar-position approximation, good to well under a degree).
 * Used for day / night along routes and for sun glare.
 */
export interface SunPosition {
  /** Degrees above the horizon (negative = below). */
  elevation: number;
  /** Compass degrees, 0 = north, 90 = east. */
  azimuth: number;
}

export function sunPosition({ lat, lon }: LatLon, at: Date): SunPosition {
  const julianDay = at.getTime() / 86_400_000 + 2440587.5;
  const t = (julianDay - 2451545) / 36525;

  const meanLong = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const meanAnomaly = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const eccentricity = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const center =
    Math.sin(toRad(meanAnomaly)) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(toRad(2 * meanAnomaly)) * (0.019993 - 0.000101 * t) +
    Math.sin(toRad(3 * meanAnomaly)) * 0.000289;
  const apparentLong = meanLong + center - 0.00569 - 0.00478 * Math.sin(toRad(125.04 - 1934.136 * t));
  const obliquity =
    23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60 + 0.00256 * Math.cos(toRad(125.04 - 1934.136 * t));
  const declination = Math.asin(Math.sin(toRad(obliquity)) * Math.sin(toRad(apparentLong)));

  const y = Math.tan(toRad(obliquity / 2)) ** 2;
  const equationOfTime =
    4 *
    toDeg(
      y * Math.sin(2 * toRad(meanLong)) -
        2 * eccentricity * Math.sin(toRad(meanAnomaly)) +
        4 * eccentricity * y * Math.sin(toRad(meanAnomaly)) * Math.cos(2 * toRad(meanLong)) -
        0.5 * y * y * Math.sin(4 * toRad(meanLong)) -
        1.25 * eccentricity * eccentricity * Math.sin(2 * toRad(meanAnomaly)),
    );

  const minutes = at.getUTCHours() * 60 + at.getUTCMinutes() + at.getUTCSeconds() / 60;
  const trueSolarTime = (((minutes + equationOfTime + 4 * lon) % 1440) + 1440) % 1440;
  const hourAngle = trueSolarTime / 4 < 0 ? trueSolarTime / 4 + 180 : trueSolarTime / 4 - 180;

  const latRad = toRad(lat);
  const cosZenith =
    Math.sin(latRad) * Math.sin(declination) + Math.cos(latRad) * Math.cos(declination) * Math.cos(toRad(hourAngle));
  const zenith = Math.acos(Math.min(1, Math.max(-1, cosZenith)));
  const azimuth =
    (toDeg(
      Math.atan2(
        Math.sin(toRad(hourAngle)),
        Math.cos(toRad(hourAngle)) * Math.sin(latRad) - Math.tan(declination) * Math.cos(latRad),
      ),
    ) +
      180) %
    360;

  return { elevation: 90 - toDeg(zenith), azimuth };
}

/** Sun above the horizon, including refraction. */
export const isDaylight = (point: LatLon, at: Date) => sunPosition(point, at).elevation > -0.833;
