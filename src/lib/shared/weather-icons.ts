/** WMO weather code -> Material Symbols icon name + description. */
interface WeatherCodeInfo {
  day: string;
  night: string;
  description: string;
}

const same = (icon: string, description: string): WeatherCodeInfo => ({ day: icon, night: icon, description });

const WEATHER_CODES: Record<number, WeatherCodeInfo> = {
  0: { day: 'clear_day', night: 'clear_night', description: 'Clear sky' },
  1: { day: 'partly_cloudy_day', night: 'partly_cloudy_night', description: 'Mainly clear' },
  2: { day: 'partly_cloudy_day', night: 'partly_cloudy_night', description: 'Partly cloudy' },
  3: same('cloud', 'Overcast'),
  45: same('foggy', 'Fog'),
  48: same('foggy', 'Freezing fog'),
  51: same('rainy_light', 'Light drizzle'),
  53: same('rainy_light', 'Drizzle'),
  55: same('rainy_light', 'Dense drizzle'),
  56: same('rainy_snow', 'Freezing drizzle'),
  57: same('rainy_snow', 'Dense freezing drizzle'),
  61: same('rainy', 'Light rain'),
  63: same('rainy', 'Rain'),
  65: same('rainy_heavy', 'Heavy rain'),
  66: same('rainy_snow', 'Freezing rain'),
  67: same('rainy_snow', 'Heavy freezing rain'),
  71: same('weather_snowy', 'Light snow'),
  73: same('weather_snowy', 'Snow'),
  75: same('snowing_heavy', 'Heavy snow'),
  77: same('weather_snowy', 'Snow grains'),
  80: same('rainy', 'Rain showers'),
  81: same('rainy', 'Heavy showers'),
  82: same('rainy_heavy', 'Violent showers'),
  85: same('weather_snowy', 'Snow showers'),
  86: same('snowing_heavy', 'Heavy snow showers'),
  95: same('thunderstorm', 'Thunderstorm'),
  96: same('thunderstorm', 'Thunderstorm with hail'),
  99: same('thunderstorm', 'Thunderstorm with heavy hail'),
};

const UNKNOWN = same('question_mark', 'No data');

const lookup = (code: number | null | undefined) => (code == null ? undefined : WEATHER_CODES[code]) ?? UNKNOWN;

/** Icon name for a WMO code; night variants when `isDay` is false. */
export function getWeatherSymbol(weatherCode: number | null | undefined, isDay: boolean | null | undefined = true): string {
  const info = lookup(weatherCode);
  return isDay === false ? info.night : info.day;
}

export function getWeatherDescription(weatherCode: number | null | undefined): string {
  return lookup(weatherCode).description;
}
