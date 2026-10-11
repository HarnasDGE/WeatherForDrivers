import { getIconLinkForHour } from '@/lib/shared/weather-icons';
import { formatTemperature, getNameDayFromDate } from '@/lib/shared/format';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  addFavoritePlace,
  isSamePlace,
  selectContent,
  selectFavoritePlaces,
  selectForecast,
  selectPlace,
  selectSelectedDay,
} from '@/store/slices/weatherSlice';
import { showNotification } from '@/store/slices/notificationsSlice';
import { refreshAll } from '@/store/thunks';
import DetailsWeather from './DetailsWeather';
import Forecast from './Forecast';
import Graph from './Graph';

export default function MainInfo() {
  const dispatch = useAppDispatch();
  const place = useAppSelector(selectPlace);
  const forecast = useAppSelector(selectForecast);
  const day = useAppSelector(selectSelectedDay);
  const content = useAppSelector(selectContent);
  const favorites = useAppSelector(selectFavoritePlaces);

  if (!place || !forecast) return <div id="content" className="loading">Waiting for first data...</div>;

  const { daily } = forecast;
  const date = daily.time[day] ?? daily.time[0];
  const countryCode = place.countryCode?.toLowerCase();

  const onFavorite = () => {
    if (favorites.some((f) => isSamePlace(f.place, place))) {
      dispatch(showNotification(`${place.name} is already in favorites.`, 'info'));
    } else {
      dispatch(addFavoritePlace());
      dispatch(showNotification(`${place.name} added to favorites.`, 'confirm'));
    }
  };

  return (
    <div id="content">
      <div className="controls-bar">
        <div className="title-container">{content}</div>
        <div id="controls-container">
          <button className="control" id="favoriteBtn" onClick={onFavorite} aria-label="Add to favorites">
            <span className="material-symbols-outlined">favorite</span>
          </button>
          <button className="control" id="refreshBtn" onClick={() => void dispatch(refreshAll())} aria-label="Refresh">
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>
      </div>
      <div className="main-info">
        <img className="main-image" src={getIconLinkForHour(daily.weatherCode[day], 12)} alt="Weather icon" />
        <div className="info">
          <h2 className="place-name">
            {countryCode && (
              <img src={`https://flagcdn.com/16x12/${countryCode}.png`} width="24" height="16" alt={place.countryCode ?? ''} />
            )}{' '}
            {place.name}
          </h2>
          <div className="second-info">
            <p className="temperature">{formatTemperature(daily.temperatureMax[day])}</p>
            <p className="condition-text">{formatTemperature(daily.temperatureMin[day])}</p>
          </div>
        </div>
      </div>
      <div className="actualTime">
        <div className="actual-date">{date}</div>
        <div className="actual-day">{getNameDayFromDate(date)}</div>
      </div>
      <Graph forecast={forecast} day={day} timezoneOffset={forecast.utcOffsetSeconds} />
      <Forecast />
      <DetailsWeather daily={daily} day={day} lat={place.lat} lon={place.lon} />
    </div>
  );
}
