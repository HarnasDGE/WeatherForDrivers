import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Place, RouteData, RouteSummary, RouteType, RouteWarning, RouteWeather } from '@/lib/shared/types';
import { hydrate } from '../hydrate';
import type { LoadStatus } from './weatherSlice';

/**
 * Lightweight favourite: only what is needed to list it and to re-fetch it (fresh traffic and weather).
 * Full geometries are not stored - they are too big for localStorage.
 */
export interface FavoriteRoute {
  from: Place;
  to: Place;
  routeType: RouteType;
  controlPoints: number;
  /** Summary of the main route at the time of saving. */
  summary: RouteSummary;
  savedAt: number;
}

export interface RouteState {
  /** Last typed/searched place names (to prefill the form). */
  query: { from: string; to: string };
  routeType: RouteType;
  /** Control points per route, 3..20. */
  controlPoints: number;
  /** Planned departure (ISO), null = leave now. Not persisted - a stored time would soon be in the past. */
  departure: string | null;
  /** routes[0] is the main route; alternatives follow. `from`/`to` are the geocoded places. */
  routeData: RouteData | null;
  /** Index-aligned with routeData.routes (reordered together with it). */
  routeWeather: RouteWeather[];
  routeStatus: LoadStatus;
  weatherStatus: LoadStatus;
  error: string | null;
  /** Official IMGW warnings along the main route (stretches refer to its distances). */
  warnings: RouteWarning[];
  /** Which main route + weather the warnings belong to (see `warningsKey`), null when none loaded. */
  warningsFor: string | null;
  favoriteRoutes: FavoriteRoute[];
  /** Places picked or checked recently, most recent first (max MAX_RECENT_PLACES). */
  recentPlaces: Place[];
  /** Checkpoint (index in routeWeather[0].points) the map and the timeline both point at. Not persisted. */
  focusedCheckpoint: number | null;
  /** Bumps on every focus request, so tapping the same checkpoint again re-pans the map. */
  focusSeq: number;
  /** Where the focus came from: a timeline row pans the map, a map sign scrolls the timeline. */
  focusSource: 'timeline' | 'map';
}

const isSameTrip = (f: FavoriteRoute, data: RouteData) =>
  f.from.name === data.from.name && f.to.name === data.to.name && f.routeType === data.routeType;

export const MIN_CONTROL_POINTS = 3;
export const MAX_CONTROL_POINTS = 20;
export const MAX_RECENT_PLACES = 8;

const isSamePlace = (a: Place, b: Place) => (a.lat === b.lat && a.lon === b.lon) || a.name === b.name;

const initialState: RouteState = {
  query: { from: '', to: '' },
  routeType: 'fastest',
  controlPoints: 7,
  departure: null,
  routeData: null,
  routeWeather: [],
  routeStatus: 'idle',
  weatherStatus: 'idle',
  error: null,
  warnings: [],
  warningsFor: null,
  favoriteRoutes: [],
  recentPlaces: [],
  focusedCheckpoint: null,
  focusSeq: 0,
  focusSource: 'timeline',
};

const routeSlice = createSlice({
  name: 'route',
  initialState,
  reducers: {
    setRouteType(state, action: PayloadAction<RouteType>) {
      state.routeType = action.payload;
    },
    setControlPoints(state, action: PayloadAction<number>) {
      state.controlPoints = Math.min(MAX_CONTROL_POINTS, Math.max(MIN_CONTROL_POINTS, Math.round(action.payload)));
    },
    setDeparture(state, action: PayloadAction<string | null>) {
      state.departure = action.payload;
    },
    routeRequested(state, action: PayloadAction<{ from: string; to: string }>) {
      state.query = action.payload;
      state.routeStatus = 'loading';
      state.weatherStatus = 'idle';
      state.error = null;
      state.routeWeather = [];
      state.focusedCheckpoint = null;
      state.warnings = [];
      state.warningsFor = null;
    },
    routeLoaded(state, action: PayloadAction<RouteData>) {
      state.routeData = action.payload;
      state.routeWeather = [];
      state.focusedCheckpoint = null;
      state.warnings = [];
      state.warningsFor = null;
      state.routeStatus = 'succeeded';
    },
    routeFailed(state, action: PayloadAction<string>) {
      state.routeStatus = 'failed';
      state.error = action.payload;
    },
    routeWeatherRequested(state) {
      state.weatherStatus = 'loading';
      state.error = null;
    },
    routeWeatherLoaded(state, action: PayloadAction<RouteWeather[]>) {
      state.routeWeather = action.payload;
      state.weatherStatus = 'succeeded';
      state.focusedCheckpoint = null;
    },
    routeWeatherFailed(state, action: PayloadAction<string>) {
      state.weatherStatus = 'failed';
      state.error = action.payload;
    },
    /** Warnings for the main route identified by `key` (results for a replaced route are dropped by the thunk). */
    routeWarningsLoaded(state, action: PayloadAction<{ key: string; warnings: RouteWarning[] }>) {
      state.warnings = action.payload.warnings;
      state.warningsFor = action.payload.key;
    },
    /** Makes routes[index] the main route (moved to the front); routeWeather is reordered identically. */
    changeMainRoute(state, action: PayloadAction<number>) {
      const index = action.payload;
      const routes = state.routeData?.routes;
      if (!routes || index <= 0 || index >= routes.length) return;
      routes.unshift(...routes.splice(index, 1));
      state.focusedCheckpoint = null; // the checkpoints belong to another route now
      state.warnings = [];
      state.warningsFor = null;
      if (state.routeWeather.length === routes.length) {
        state.routeWeather.unshift(...state.routeWeather.splice(index, 1));
        state.routeWeather.forEach((w, i) => {
          w.routeIndex = i;
        });
      }
    },
    clearRoute(state) {
      state.routeData = null;
      state.routeWeather = [];
      state.routeStatus = 'idle';
      state.weatherStatus = 'idle';
      state.error = null;
      state.focusedCheckpoint = null;
      state.warnings = [];
      state.warningsFor = null;
    },
    /** Points the map and the timeline at a checkpoint of the main route; null clears the focus. */
    focusCheckpoint(state, action: PayloadAction<{ index: number; source: 'timeline' | 'map' } | null>) {
      if (!action.payload) {
        state.focusedCheckpoint = null;
        return;
      }
      state.focusedCheckpoint = action.payload.index;
      state.focusSource = action.payload.source;
      state.focusSeq += 1;
    },
    /** Saves the current route (no-op when absent or already saved: same from, to and routeType). */
    addFavoriteRoute(state) {
      const data = state.routeData;
      if (!data || data.routes.length === 0) return;
      if (state.favoriteRoutes.some((f) => isSameTrip(f, data))) return;
      state.favoriteRoutes.push({
        from: data.from,
        to: data.to,
        routeType: data.routeType,
        controlPoints: state.controlPoints,
        summary: data.routes[0].summary,
        savedAt: Date.now(),
      });
    },
    removeFavoriteRoute(state, action: PayloadAction<number>) {
      state.favoriteRoutes.splice(action.payload, 1);
    },
    addRecentPlace(state, action: PayloadAction<Place>) {
      const rest = state.recentPlaces.filter((p) => !isSamePlace(p, action.payload));
      state.recentPlaces = [action.payload, ...rest].slice(0, MAX_RECENT_PLACES);
    },
    clearRecentPlaces(state) {
      state.recentPlaces = [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(hydrate, (state, action) => {
      const saved = action.payload.route;
      if (saved) Object.assign(state, saved);
      state.focusedCheckpoint = null;
    });
  },
  selectors: {
    selectRoute: (state) => state,
    selectRouteQuery: (state) => state.query,
    selectRouteType: (state) => state.routeType,
    selectControlPoints: (state) => state.controlPoints,
    selectDeparture: (state) => state.departure,
    selectRouteData: (state) => state.routeData,
    selectRouteWeather: (state) => state.routeWeather,
    selectRouteStatus: (state) => state.routeStatus,
    selectRouteWeatherStatus: (state) => state.weatherStatus,
    selectRouteError: (state) => state.error,
    selectFocusedCheckpoint: (state) => state.focusedCheckpoint,
    selectFocusSeq: (state) => state.focusSeq,
    selectFocusSource: (state) => state.focusSource,
    selectRouteWarnings: (state) => state.warnings,
    selectFavoriteRoutes: (state) => state.favoriteRoutes,
    selectRecentPlaces: (state) => state.recentPlaces,
    /** Index of the current route in favourites, -1 when not saved (or no route). */
    selectCurrentRouteFavoriteIndex: (state) => {
      const data = state.routeData;
      return data ? state.favoriteRoutes.findIndex((f) => isSameTrip(f, data)) : -1;
    },
  },
});

export const {
  setDeparture,
  setRouteType,
  setControlPoints,
  routeRequested,
  routeLoaded,
  routeFailed,
  routeWeatherRequested,
  routeWeatherLoaded,
  routeWeatherFailed,
  routeWarningsLoaded,
  changeMainRoute,
  clearRoute,
  focusCheckpoint,
  addFavoriteRoute,
  removeFavoriteRoute,
  addRecentPlace,
  clearRecentPlaces,
} = routeSlice.actions;

export const {
  selectRoute,
  selectRouteQuery,
  selectRouteType,
  selectControlPoints,
  selectDeparture,
  selectRouteData,
  selectRouteWeather,
  selectRouteStatus,
  selectRouteWeatherStatus,
  selectRouteError,
  selectFocusedCheckpoint,
  selectFocusSeq,
  selectFocusSource,
  selectRouteWarnings,
  selectFavoriteRoutes,
  selectRecentPlaces,
  selectCurrentRouteFavoriteIndex,
} = routeSlice.selectors;

export default routeSlice.reducer;
