/** What the sky is doing, for the animated backdrop (derived from the WMO code of the current hour). */
export type SkyKind = 'clear' | 'clouds' | 'fog' | 'rain' | 'snow' | 'storm';

export interface Sky {
  kind: SkyKind;
  /** 0..1 - how dense the rain / snow / cloud is. */
  intensity: number;
  night: boolean;
  /** Slant of falling rain / snow, -1..1 (from gusts). */
  wind: number;
}

const KINDS: Array<[codes: number[], kind: SkyKind, intensity: number]> = [
  [[0], 'clear', 0],
  [[1], 'clear', 0.25],
  [[2], 'clouds', 0.45],
  [[3], 'clouds', 0.85],
  [[45, 48], 'fog', 0.8],
  [[51, 56], 'rain', 0.25],
  [[53, 57], 'rain', 0.35],
  [[55], 'rain', 0.45],
  [[61, 66, 80], 'rain', 0.5],
  [[63, 81], 'rain', 0.7],
  [[65, 67, 82], 'rain', 1],
  [[71, 77, 85], 'snow', 0.4],
  [[73], 'snow', 0.65],
  [[75, 86], 'snow', 1],
  [[95], 'storm', 0.8],
  [[96, 99], 'storm', 1],
];

export function skyFor(weatherCode: number | null, isDay: boolean | null, windGusts: number | null): Sky {
  const match = KINDS.find(([codes]) => weatherCode != null && codes.includes(weatherCode));
  const wind = Math.max(-1, Math.min(1, ((windGusts ?? 0) - 10) / 60));
  return {
    kind: match?.[1] ?? 'clouds',
    intensity: match?.[2] ?? 0.4,
    night: isDay === false,
    wind,
  };
}
