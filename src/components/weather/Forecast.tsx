import { getIconLink } from '@/lib/shared/weather-icons';
import { getNameDayFromDate } from '@/lib/shared/format';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectDay, selectForecast, selectSelectedDay } from '@/store/slices/weatherSlice';

const round1 = (v: number | null | undefined) => (v == null ? '--' : Math.round(v * 10) / 10);

/** Daily tiles; clicking one selects the day shown in MainInfo and the graph. */
export default function Forecast() {
  const dispatch = useAppDispatch();
  const forecast = useAppSelector(selectForecast);
  const selectedDay = useAppSelector(selectSelectedDay);
  if (!forecast) return null;
  const { daily } = forecast;

  return (
    <div className="forecast">
      <ul>
        {daily.time.map((time, index) => (
          <li
            key={time}
            className={index === selectedDay ? 'selected' : undefined}
            onClick={() => dispatch(selectDay(index))}
          >
            <h3>{getNameDayFromDate(time)}</h3>
            <img src={getIconLink(daily.weatherCode[index], true)} alt="Weather icon" />
            <p>
              <span className="max-temperature">{round1(daily.temperatureMax[index])}°C</span>
            </p>
            <p>
              <span className="min-temperature">{round1(daily.temperatureMin[index])}</span>
            </p>
            <p className="rain">
              <span className="material-symbols-outlined">rainy</span>
              {round1(daily.precipitationSum[index])} mm
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
