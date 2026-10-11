/** WMO weather code -> OpenWeatherMap icon number + description (ported from legacy iconsMethods.js). */
const WEATHER_CODES: Record<number, { icon: string; description: string }> = {
  0: { icon: '01', description: 'Clear sky' },
  1: { icon: '02', description: 'Mainly clear' },
  2: { icon: '02', description: 'Partly cloudy' },
  3: { icon: '02', description: 'Overcast' },
  45: { icon: '50', description: 'Fog' },
  48: { icon: '50', description: 'Depositing rime fog' },
  51: { icon: '09', description: 'Light drizzle' },
  53: { icon: '09', description: 'Moderate drizzle' },
  55: { icon: '09', description: 'Dense drizzle' },
  56: { icon: '13', description: 'Light freezing drizzle' },
  57: { icon: '13', description: 'Dense freezing drizzle' },
  61: { icon: '10', description: 'Slight rain' },
  63: { icon: '10', description: 'Moderate rain' },
  65: { icon: '10', description: 'Heavy rain' },
  66: { icon: '13', description: 'Light freezing rain' },
  67: { icon: '13', description: 'Heavy freezing rain' },
  71: { icon: '13', description: 'Slight snow fall' },
  73: { icon: '13', description: 'Moderate snow fall' },
  75: { icon: '13', description: 'Heavy intensity snow fall' },
  77: { icon: '13', description: 'Snow grains' },
  80: { icon: '10', description: 'Slight rain shower' },
  81: { icon: '10', description: 'Moderate rain shower' },
  82: { icon: '10', description: 'Violent rain shower' },
  85: { icon: '13', description: 'Slight snow shower' },
  86: { icon: '13', description: 'Heavy snow shower' },
  95: { icon: '11', description: 'Thunderstorm' },
  96: { icon: '11', description: 'Slight thunderstorm' },
  99: { icon: '11', description: 'Heavy hail thunderstorm' },
};

const FALLBACK = { icon: '50', description: 'Unknown' };

const iconUrl = (icon: string, isDay: boolean) =>
  `https://openweathermap.org/img/wn/${icon}${isDay ? 'd' : 'n'}@2x.png`;

/** Icon URL for a WMO code. Unknown/missing code gives the (night) fog icon, like the legacy app. */
export function getIconLink(weatherCode: number | null | undefined, isDay: boolean | null | undefined): string {
  const entry = weatherCode == null ? undefined : WEATHER_CODES[weatherCode];
  return iconUrl((entry ?? FALLBACK).icon, entry ? Boolean(isDay) : false);
}

/** Like `getIconLink`, but day/night is derived from the local hour (8..19 = day), as in legacy. */
export function getIconLinkForHour(weatherCode: number | null | undefined, hour: number): string {
  return getIconLink(weatherCode, hour > 7 && hour < 20);
}

export function getWeatherDescription(weatherCode: number | null | undefined): string {
  return (weatherCode == null ? undefined : WEATHER_CODES[weatherCode])?.description ?? FALLBACK.description;
}
