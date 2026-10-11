import { fetchCurrentWeather, fetchForecast, fetchPlaceImage, fetchPlaces } from '@/lib/client/api';
import { getTimeOfDay } from '@/lib/shared/time-of-day';
import type { Place } from '@/lib/shared/types';
import { showNotification } from '../slices/notificationsSlice';
import {
  favoritesRefreshFailed,
  favoritesRefreshRequested,
  favoritesRefreshed,
  placeFailed,
  placeLoaded,
  placeRequested,
} from '../slices/weatherSlice';
import type { FavoriteUpdate } from '../slices/weatherSlice';
import { errorMessage } from './types';
import type { AppThunk } from './types';

/** Loads current weather, forecast and photo of a place in parallel. Resolves to true on success. */
export const loadPlace =
  (place: Place): AppThunk<boolean> =>
  async (dispatch) => {
    dispatch(placeRequested());
    const [current, forecast, image] = await Promise.allSettled([
      fetchCurrentWeather(place, place.name),
      fetchForecast(place),
      fetchPlaceImage(place.name),
    ]);

    if (current.status === 'rejected' || forecast.status === 'rejected') {
      const reason = current.status === 'rejected' ? current.reason : (forecast as PromiseRejectedResult).reason;
      const message = errorMessage(reason, 'Could not load weather for this place.');
      dispatch(placeFailed(message));
      dispatch(showNotification(message, 'error'));
      return false;
    }

    if (image.status === 'rejected') {
      dispatch(showNotification(errorMessage(image.reason, 'No images found for this place!'), 'error'));
    }

    dispatch(
      placeLoaded({
        place,
        current: current.value,
        forecast: forecast.value,
        image: image.status === 'fulfilled' ? image.value : null,
        timeOfDay: getTimeOfDay(current.value.dt, current.value.timezoneOffset),
      }),
    );
    return true;
  };

/** Geocodes the query (first match, like the legacy search) and loads it. */
export const searchPlace =
  (query: string): AppThunk<boolean> =>
  async (dispatch) => {
    const trimmed = query.trim();
    if (!trimmed) {
      dispatch(showNotification('Input is empty, please enter a value!', 'alert'));
      return false;
    }
    try {
      const [place] = await fetchPlaces(trimmed, 1);
      if (!place) {
        dispatch(showNotification(`Place "${trimmed}" not found.`, 'alert'));
        return false;
      }
      return await dispatch(loadPlace(place));
    } catch (error) {
      dispatch(showNotification(errorMessage(error), 'error'));
      return false;
    }
  };

/** Refreshes current weather + forecast of every favourite; a failed place keeps its old data. */
export const refreshFavoritePlaces = (): AppThunk => async (dispatch, getState) => {
  const favorites = getState().weather.favoritePlaces;
  if (favorites.length === 0) return;
  dispatch(favoritesRefreshRequested());
  try {
    const results = await Promise.all(
      favorites.map(async ({ place }): Promise<FavoriteUpdate | null> => {
        try {
          const [current, forecast] = await Promise.all([fetchCurrentWeather(place, place.name), fetchForecast(place)]);
          return { place, current, forecast };
        } catch {
          return null;
        }
      }),
    );
    const updates = results.filter((r): r is FavoriteUpdate => r !== null);
    dispatch(favoritesRefreshed(updates));
    if (updates.length < favorites.length) {
      dispatch(showNotification('Some favourite places could not be refreshed.', 'alert'));
    }
  } catch (error) {
    dispatch(favoritesRefreshFailed());
    dispatch(showNotification(errorMessage(error), 'error'));
  }
};

/** Reloads the current place and all favourites. */
export const refreshAll = (): AppThunk => async (dispatch, getState) => {
  const { place } = getState().weather;
  await Promise.all([place ? dispatch(loadPlace(place)) : Promise.resolve(), dispatch(refreshFavoritePlaces())]);
  dispatch(showNotification('Data refreshed.', 'info'));
};
