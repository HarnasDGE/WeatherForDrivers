import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { ROUTE_TYPES } from '@/lib/shared/types';
import type { RouteType } from '@/lib/shared/types';
import { calculateTimeAtRoute, formatDistanceKm, formatTemperature } from '@/lib/shared/format';
import { getIconLink } from '@/lib/shared/weather-icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  MAX_CONTROL_POINTS,
  MIN_CONTROL_POINTS,
  addFavoriteRoute,
  selectControlPoints,
  selectRouteData,
  selectRouteError,
  selectRouteQuery,
  selectRouteStatus,
  selectRouteType,
  selectRouteWeather,
  selectRouteWeatherStatus,
  setControlPoints,
  setRouteType,
} from '@/store/slices/routeSlice';
import { showNotification } from '@/store/slices/notificationsSlice';
import { fetchRouteWithWeather } from '@/store/thunks';
import '@/styles/route.css';
import FavoriteRoutes from './FavoriteRoutes';
import RouteMap from './RouteMap';

const isRouteType = (value: string): value is RouteType => (ROUTE_TYPES as readonly string[]).includes(value);
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** "Along The Road" tab: route form, map with alternatives and weather, route stops list and favorites. */
export default function RoutePanel() {
  const dispatch = useAppDispatch();
  const query = useAppSelector(selectRouteQuery);
  const routeType = useAppSelector(selectRouteType);
  const controlPoints = useAppSelector(selectControlPoints);
  const routeData = useAppSelector(selectRouteData);
  const routeWeather = useAppSelector(selectRouteWeather);
  const routeStatus = useAppSelector(selectRouteStatus);
  const weatherStatus = useAppSelector(selectRouteWeatherStatus);
  const error = useAppSelector(selectRouteError);

  const [from, setFrom] = useState(query.from);
  const [to, setTo] = useState(query.to);
  const [showTemperature, setShowTemperature] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(true);

  // The store is hydrated from localStorage after mount - keep the inputs in sync with the last query.
  useEffect(() => {
    setFrom(query.from);
    setTo(query.to);
  }, [query.from, query.to]);

  const isLoading = routeStatus === 'loading' || weatherStatus === 'loading';
  const mainWeather = routeWeather[0]?.points ?? [];

  const search = (start: string, end: string) => {
    if (!start.trim()) {
      dispatch(showNotification("Complete first input 'From'", 'error'));
      return;
    }
    if (!end.trim()) {
      dispatch(showNotification("Complete second input 'To'", 'error'));
      return;
    }
    void dispatch(fetchRouteWithWeather(start, end));
  };

  const onSubmit = (event: { preventDefault(): void }) => {
    event.preventDefault();
    if (!isLoading) search(from, to);
  };

  const onRouteType = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (isRouteType(value)) dispatch(setRouteType(value));
  };

  const addToFavorites = () => {
    if (!routeData) {
      dispatch(showNotification('Find a route first.', 'alert'));
      return;
    }
    dispatch(addFavoriteRoute());
    dispatch(showNotification('Route added to favorites.', 'confirm'));
  };

  return (
    <div id="content">
      <div className="controls-bar">
        <div className="title-container">Along The Road</div>
        <div id="controls-container">
          <button
            type="button"
            className="control"
            id="favoriteBtn"
            title="Add route to favorites"
            aria-label="Add route to favorites"
            onClick={addToFavorites}
          >
            <span className="material-symbols-outlined">favorite</span>
          </button>
          <button
            type="button"
            className="control"
            id="refreshBtn"
            title="Refresh route and weather"
            aria-label="Refresh route and weather"
            disabled={isLoading || !routeData}
            onClick={() => routeData && search(routeData.from.name, routeData.to.name)}
          >
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>
      </div>

      <form className="menu-road-information" onSubmit={onSubmit}>
        <input
          placeholder="From..."
          id="road-from"
          type="text"
          aria-label="From"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <input
          placeholder="To..."
          id="road-to"
          type="text"
          aria-label="To"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <div className="controls">
          <label htmlFor="controlPoints">
            Control Points: {controlPoints}
            <input
              type="range"
              min={MIN_CONTROL_POINTS}
              max={MAX_CONTROL_POINTS}
              name="controlPoints"
              id="controlPoints"
              value={controlPoints}
              onChange={(e) => dispatch(setControlPoints(Number(e.target.value)))}
            />
          </label>
          <label htmlFor="weatherOnRoute">
            Weather on route
            <input
              type="checkbox"
              id="weatherOnRoute"
              checked={showTemperature}
              onChange={() => setShowTemperature((v) => !v)}
            />
          </label>
          <label htmlFor="alternativeRoutes">
            Alternative routes
            <input
              type="checkbox"
              id="alternativeRoutes"
              checked={showAlternatives}
              onChange={() => setShowAlternatives((v) => !v)}
            />
          </label>
          <label htmlFor="typeRoute">
            Type Route
            <select id="typeRoute" className="typeRoute" name="typeRoute" value={routeType} onChange={onRouteType}>
              {ROUTE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {capitalize(type)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="submit" disabled={isLoading}>
          Check Weather Along The Road
        </button>
      </form>

      {error && routeStatus !== 'loading' && (
        <p className="route-error" role="alert">
          {error}
        </p>
      )}
      {routeStatus === 'loading' && (
        <p className="route-loading" role="status">
          Looking for the route...
        </p>
      )}
      {weatherStatus === 'loading' && (
        <p className="route-loading" role="status">
          Checking the weather along the road - this can take a moment...
        </p>
      )}

      <div className="automap">
        <RouteMap
          routes={routeData?.routes ?? []}
          weatherPoints={mainWeather}
          showTemperature={showTemperature}
          showAlternatives={showAlternatives}
        />
      </div>

      {mainWeather.length > 0 && (
        <div className="weather-along-the-road">
          <div className="along-the-road-graphic">
            <ul>
              {mainWeather.map((_, index) => (
                <li key={`graphic-${index}`}>
                  <span className="material-symbols-outlined">
                    {index === 0 ? 'location_on' : index === mainWeather.length - 1 ? 'pin_drop' : 'airline_stops'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <ul>
            {mainWeather.map((point, index) => (
              <li key={`along-item-${index}`} className="along-item">
                <div className="along-item-weather">
                  <img src={getIconLink(point.weatherCode, point.isDay)} alt="Weather icon" />
                  <div className="information">
                    <h2>{point.name}</h2>
                    <p>{formatTemperature(point.temperature)}</p>
                  </div>
                </div>
                <div className="along-item-route">
                  <p className="route-km">{formatDistanceKm(point.lengthInMeters).toUpperCase()}</p>
                  <p className="route-time">{calculateTimeAtRoute(point.travelTimeInSeconds)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <FavoriteRoutes />
    </div>
  );
}
