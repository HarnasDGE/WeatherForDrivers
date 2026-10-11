/** External services used by the server (no keys here - they stay in the server env). Shown in the footer. */
export interface UsedApi {
  name: string;
  desc: string;
  url: string;
}

export const USED_API: readonly UsedApi[] = [
  { name: 'Open-Meteo', desc: 'Information about weather and geocoding', url: 'https://open-meteo.com/' },
  { name: 'OpenWeatherMap', desc: 'Information about weather and geocoding', url: 'https://openweathermap.org/' },
  { name: 'Tom-Tom', desc: 'Information about routes and times', url: 'https://developer.tomtom.com/' },
  { name: 'Unsplash', desc: 'Images, images and images', url: 'https://unsplash.com/' },
];
