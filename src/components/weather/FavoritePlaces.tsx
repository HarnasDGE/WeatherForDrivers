import { getIconLink } from '@/lib/shared/weather-icons';
import { formatTemperature } from '@/lib/shared/format';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  removeFavoritePlace,
  selectFavoritePlaces,
  selectFavoritesRefreshing,
} from '@/store/slices/weatherSlice';
import { loadPlace } from '@/store/thunks';

export default function FavoritePlaces() {
  const dispatch = useAppDispatch();
  const favorites = useAppSelector(selectFavoritePlaces);
  const refreshing = useAppSelector(selectFavoritesRefreshing);

  return (
    <div className="favorites">
      <div className="controls-bar">Favorite Places{refreshing ? ' (refreshing...)' : ''}</div>
      {favorites.length === 0 ? (
        <>
          <div className="listOfPlaces" />
          <span>Press the heart to add a place to favorites!</span>
        </>
      ) : (
        <div className="listOfPlaces">
          <ul>
            {favorites.map(({ place, forecast }, index) => (
              <li
                key={`${place.name}-${place.countryCode ?? ''}`}
                className="favorite-place"
                onClick={() => void dispatch(loadPlace(place))}
              >
                <div className="main-info-favorites">
                  <img className="favourite-image" src={getIconLink(forecast.daily.weatherCode[0], true)} alt="Weather icon" />
                  <div className="info">
                    <h2 className="favourite-place-name">{place.name}</h2>
                    <div className="second-info">
                      <p className="favourite-temperature">{formatTemperature(forecast.daily.temperatureMax[0])}</p>
                    </div>
                  </div>
                </div>
                <div className="favorite-controls">
                  <button
                    className="control"
                    aria-label={`Remove ${place.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch(removeFavoritePlace(index));
                    }}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
