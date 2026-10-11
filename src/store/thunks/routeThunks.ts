import * as api from '@/lib/client/api';
import { showNotification } from '../slices/notificationsSlice';
import {
  routeFailed,
  routeLoaded,
  routeRequested,
  routeWeatherFailed,
  routeWeatherLoaded,
  routeWeatherRequested,
  setControlPoints,
  setRouteType,
} from '../slices/routeSlice';
import type { FavoriteRoute } from '../slices/routeSlice';
import { errorMessage } from './types';
import type { AppThunk } from './types';

/** Fetches the route (main + alternatives) for the typed place names using the current `routeType`. */
export const fetchRoute =
  (from: string, to: string): AppThunk<boolean> =>
  async (dispatch, getState) => {
    const start = from.trim();
    const end = to.trim();
    if (!start || !end) {
      dispatch(showNotification('Enter both start and destination!', 'alert'));
      return false;
    }
    dispatch(routeRequested({ from: start, to: end }));
    try {
      const data = await api.fetchRoute(start, end, getState().route.routeType);
      dispatch(routeLoaded(data));
      return true;
    } catch (error) {
      const message = errorMessage(error);
      dispatch(routeFailed(message));
      dispatch(showNotification(message, 'error'));
      return false;
    }
  };

/**
 * Fetches weather at control points for all routes of the current route data (slow - show a loader).
 * If the user swaps the main route while this is running, results are re-aligned to the new order.
 */
export const fetchRouteWeather = (): AppThunk<boolean> => async (dispatch, getState) => {
  const { routeData, controlPoints } = getState().route;
  if (!routeData || routeData.routes.length === 0) {
    dispatch(showNotification('Route information is empty.', 'alert'));
    return false;
  }
  const requested = routeData.routes;
  dispatch(routeWeatherRequested());
  try {
    const result = await api.fetchRouteWeather({ routes: requested, controlPoints });

    const current = getState().route.routeData?.routes ?? [];
    const aligned = current.map((route, index) => {
      const original = requested.findIndex((r) => r.points === route.points);
      return original === -1 || !result[original] ? null : { ...result[original], routeIndex: index };
    });
    if (aligned.length === 0 || aligned.some((w) => w === null)) return false; // route was replaced meanwhile
    dispatch(routeWeatherLoaded(aligned.filter((w) => w !== null)));
    return true;
  } catch (error) {
    const message = errorMessage(error);
    dispatch(routeWeatherFailed(message));
    dispatch(showNotification(message, 'error'));
    return false;
  }
};

/** Route + weather along it (legacy `fetchAllDataAboutRoute`). */
export const fetchRouteWithWeather =
  (from: string, to: string): AppThunk<boolean> =>
  async (dispatch) => {
    if (!(await dispatch(fetchRoute(from, to)))) return false;
    return dispatch(fetchRouteWeather());
  };

/** Re-fetches a saved route (fresh traffic and weather) using its saved type and control points. */
export const loadFavoriteRoute =
  (favorite: FavoriteRoute): AppThunk<boolean> =>
  async (dispatch) => {
    dispatch(setRouteType(favorite.routeType));
    dispatch(setControlPoints(favorite.controlPoints));
    return dispatch(fetchRouteWithWeather(favorite.from.name, favorite.to.name));
  };

