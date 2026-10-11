import type { DailyForecast } from '@/lib/shared/types';

interface DetailsWeatherProps {
  daily: DailyForecast;
  day: number;
  lat: number;
  lon: number;
}

const round1 = (v: number) => Math.round(v * 10) / 10;

export default function DetailsWeather({ daily, day, lat, lon }: DetailsWeatherProps) {
  const uvMax = daily.uvIndexMax[day];
  const uvClear = daily.uvIndexClearSkyMax[day];
  const rainProbability = daily.precipitationProbabilityMax[day];
  const windSpeed = daily.windSpeedMax[day];
  const windDirection = daily.windDirectionDominant[day];

  return (
    <div className="condition">
      <div className="flex-and-left">
        <span className="material-symbols-outlined">share_location</span>
        <span className="place-lat">LAT: {lat}</span>
        <span className="place-lon">LON: {lon}</span>
      </div>
      {uvMax != null && uvClear != null && (
        <div className="flex-and-left">
          <span className="hpa">UV</span>
          <p className="param">
            {round1(uvMax)}/{round1(uvClear)}
          </p>
        </div>
      )}
      {rainProbability != null && (
        <div className="flex-and-left">
          <span className="material-symbols-outlined">rainy</span>
          <p className="param">{rainProbability} %</p>
        </div>
      )}
      {windSpeed != null && (
        <div className="flex-and-left">
          <span className="material-symbols-outlined">wind_power</span>
          <p className="param">
            {round1(windSpeed)} km/h{' '}
            <span
              className="material-symbols-outlined"
              style={{ transform: `rotate(${windDirection ?? 0}deg) scale(0.7)` }}
            >
              north
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
