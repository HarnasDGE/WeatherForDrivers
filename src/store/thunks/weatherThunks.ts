import { fetchForecast, fetchPlaces } from '@/lib/client/api';
import type { Place } from '@/lib/shared/types';
import { showNotification } from '../slices/notificationsSlice';
import { placeFailed, placeLoaded, placeRequested } from '../slices/weatherSlice';
import { errorMessage } from './types';
import type { AppThunk } from './types';

/** Loads the forecast of a place. Resolves to true on success. */
export const loadPlace =
  (place: Place): AppThunk<boolean> =>
  async (dispatch) => {
    dispatch(placeRequested());
    try {
      const forecast = await fetchForecast(place);
      dispatch(placeLoaded({ place, forecast }));
      return true;
    } catch (error) {
      const message = errorMessage(error, 'Could not load the forecast for this place.');
      dispatch(placeFailed(message));
      dispatch(showNotification(message, 'error'));
      return false;
    }
  };

/** Geocodes the query (first match) and loads it - used when the search is submitted without picking a suggestion. */
export const searchPlace =
  (query: string): AppThunk<boolean> =>
  async (dispatch) => {
    const trimmed = query.trim();
    if (!trimmed) return false;
    try {
      const [place] = await fetchPlaces(trimmed, 1);
      if (!place) {
        dispatch(showNotification(`No place called "${trimmed}". Check the spelling.`, 'alert'));
        return false;
      }
      return await dispatch(loadPlace(place));
    } catch (error) {
      dispatch(showNotification(errorMessage(error), 'error'));
      return false;
    }
  };
