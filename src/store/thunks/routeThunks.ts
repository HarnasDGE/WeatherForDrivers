import * as api from '@/lib/client/api';
import type { PlaceInput } from '@/lib/client/api';
import { warningPoints } from '@/lib/shared/route-warnings';
import type { Route, RouteWeather } from '@/lib/shared/types';
import { showNotification } from '../slices/notificationsSlice';
import {
  routeFailed,
  routeLoaded,
  routeRequested,
  routeWarningsLoaded,
  routeWeatherFailed,
  routeWeatherLoaded,
  routeWeatherRequested,
  setControlPoints,
  setDeparture,
  setRouteType,
} from '../slices/routeSlice';
import type { FavoriteRoute } from '../slices/routeSlice';
import { errorMessage } from './types';
import type { AppThunk } from './types';

const trimInput = (place: PlaceInput): PlaceInput => (typeof place === 'string' ? place.trim() : place);

/** The planned departure, or undefined for "now" (a departure that has already passed also means now). */
const plannedDeparture = (departure: string | null): string | undefined =>
  departure && new Date(departure).getTime() > Date.now() ? departure : undefined;

/** Fetches the route (main + alternatives) using the current `routeType`. Picked places skip server-side geocoding. */
export const fetchRoute =
  (from: PlaceInput, to: PlaceInput): AppThunk<boolean> =>
  async (dispatch, getState) => {
    const start = trimInput(from);
    const end = trimInput(to);
    if (!api.placeName(start) || !api.placeName(end)) {
      dispatch(showNotification('Enter where you start and where you are going.', 'alert'));
      return false;
    }
    const { routeType, departure } = getState().route;
    const departAt = plannedDeparture(departure);
    if (!departAt && departure) dispatch(setDeparture(null));
    dispatch(routeRequested({ from: api.placeName(start), to: api.placeName(end) }));
    try {
      const data = await api.fetchRoute(start, end, routeType, departAt);
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
  const { routeData, controlPoints, departure } = getState().route;
  if (!routeData || routeData.routes.length === 0) {
    dispatch(showNotification('Check a route first.', 'alert'));
    return false;
  }
  const requested = routeData.routes;
  dispatch(routeWeatherRequested());
  try {
    // Same departure as the route itself, so arrival times match its summary.
    const departureTime = plannedDeparture(departure) && requested[0]?.summary.departureTime;
    const result = await api.fetchRouteWeather({ routes: requested, controlPoints, departureTime: departureTime || undefined });

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
  (from: PlaceInput, to: PlaceInput): AppThunk<boolean> =>
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
    return dispatch(fetchRouteWithWeather(favorite.from, favorite.to));
  };

/** Identifies the main route and its weather check, so warnings are fetched once per checked route. */
const warningsKey = (route: Route, weather: RouteWeather) => {
  const middle = route.points[Math.floor(route.points.length / 2)];
  return [route.summary.lengthInMeters, middle?.lat, middle?.lon, weather.points[0]?.time].join('|');
};

/**
 * Official IMGW warnings along the main route (after its weather has loaded). Quiet on failure:
 * warnings are an extra, the server already answers [] when IMGW is down.
 */
export const fetchRouteWarnings = (): AppThunk<boolean> => async (dispatch, getState) => {
  const { routeData, routeWeather, warningsFor } = getState().route;
  const route = routeData?.routes[0];
  const weather = routeWeather[0];
  if (!route || !weather || weather.points.length === 0) return false;
  const key = warningsKey(route, weather);
  if (warningsFor === key) return true;
  try {
    const warnings = await api.fetchRouteWarnings({ points: warningPoints(route, weather.points) });
    const current = getState().route;
    const [currentRoute, currentWeather] = [current.routeData?.routes[0], current.routeWeather[0]];
    // The route was replaced meanwhile.
    if (!currentRoute || !currentWeather || warningsKey(currentRoute, currentWeather) !== key) return false;
    dispatch(routeWarningsLoaded({ key, warnings }));
    return true;
  } catch {
    return false;
  }
};
