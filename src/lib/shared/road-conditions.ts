/** Weather -> what it means for driving. Used for route checkpoints and the place forecast. */

export type RoadLevel = 'good' | 'caution' | 'danger' | 'unknown';

export interface RoadCondition {
  level: RoadLevel;
  /** Short driver-facing label, e.g. "Wet road". */
  label: string;
}

export interface RoadInput {
  /** WMO weather code. */
  weatherCode: number | null | undefined;
  /** °C */
  temperature: number | null | undefined;
  /** km/h */
  windGusts?: number | null;
  /** metres */
  visibility?: number | null;
  /** °C, dew point at 2 m */
  dewPoint?: number | null;
  /** °C, road-surface temperature proxy */
  surfaceTemperature?: number | null;
}

const RANK: Record<RoadLevel, number> = { unknown: 0, good: 1, caution: 2, danger: 3 };

const FREEZING_AT = 1; // °C - wet surfaces can freeze around zero

const DRIZZLE = [51, 53, 55];
const FREEZING_PRECIPITATION = [56, 57, 66, 67];
const RAIN = [61, 63, 80, 81];
const HEAVY_RAIN = [65, 82];
const LIGHT_SNOW = [71, 77, 85];
const HEAVY_SNOW = [73, 75, 86];
const STORM = [95, 96, 99];
const FOG = [45, 48];

function fromWeatherCode(code: number, temperature: number | null | undefined): RoadCondition {
  const freezing = temperature != null && temperature <= FREEZING_AT;
  if (FREEZING_PRECIPITATION.includes(code)) return { level: 'danger', label: 'Freezing rain' };
  if (STORM.includes(code)) return { level: 'danger', label: 'Thunderstorm' };
  if (HEAVY_SNOW.includes(code)) return { level: 'danger', label: 'Snow on the road' };
  if (LIGHT_SNOW.includes(code)) return { level: 'caution', label: 'Light snow' };
  if (HEAVY_RAIN.includes(code)) return { level: 'danger', label: 'Heavy rain, aquaplaning risk' };
  if (RAIN.includes(code) || DRIZZLE.includes(code)) {
    return freezing ? { level: 'danger', label: 'Ice risk' } : { level: 'caution', label: 'Wet road' };
  }
  if (FOG.includes(code)) return { level: 'caution', label: 'Fog, low visibility' };
  if (freezing) return { level: 'caution', label: 'Frost possible' };
  return { level: 'good', label: 'Dry road' };
}

/**
 * Surface-based ice rules (only when a surface temperature is known). The road is usually colder than the
 * air on clear nights, so air temperature alone misses frost:
 *  - surface <= 0 with anything wet in the air (precipitation, drizzle, fog: codes >= 45) -> ice forms or sticks;
 *  - surface <= 0 and air within 1 degree of the dew point, no precipitation -> hoar frost / freezing condensation;
 *  - surface <= 1 and spread <= 2 -> the surface is about to reach frost point, patchy slippery spots.
 */
function fromSurface(
  code: number,
  temperature: number | null | undefined,
  dewPoint: number | null | undefined,
  surface: number | null | undefined,
): RoadCondition | null {
  if (surface == null) return null;
  if (surface <= 0 && code >= 45) return { level: 'danger', label: 'Ice risk' };
  const spread = temperature != null && dewPoint != null ? temperature - dewPoint : null;
  if (spread == null) return null;
  if (surface <= 0 && spread <= 1) return { level: 'caution', label: 'Frost on the road' };
  if (surface <= 1 && spread <= 2) return { level: 'caution', label: 'Slippery patches possible' };
  return null;
}

const worse = (a: RoadCondition, b: RoadCondition) => (RANK[b.level] > RANK[a.level] ? b : a);

export function assessRoad({
  weatherCode,
  temperature,
  windGusts,
  visibility,
  dewPoint,
  surfaceTemperature,
}: RoadInput): RoadCondition {
  if (weatherCode == null) return { level: 'unknown', label: 'No forecast' };
  let result = fromWeatherCode(weatherCode, temperature);
  const surface = fromSurface(weatherCode, temperature, dewPoint, surfaceTemperature);
  // The generic "Frost possible" is replaced by the more specific surface finding; danger is never downgraded.
  if (surface && (result.label === 'Frost possible' || RANK[surface.level] > RANK[result.level])) result = surface;
  if (windGusts != null && windGusts >= 80) result = worse(result, { level: 'danger', label: 'Storm-force gusts' });
  else if (windGusts != null && windGusts >= 55) result = worse(result, { level: 'caution', label: 'Strong gusts' });
  if (visibility != null && visibility < 200) result = worse(result, { level: 'danger', label: 'Very low visibility' });
  else if (visibility != null && visibility < 1000)
    result = worse(result, { level: 'caution', label: 'Low visibility' });
  return result;
}

/** The worst condition of a list (first one wins on ties); "unknown" for an empty list. */
export function worstOf(conditions: readonly RoadCondition[]): RoadCondition {
  return conditions.reduce<RoadCondition>(worse, { level: 'unknown', label: 'No forecast' });
}
