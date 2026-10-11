import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Place, RouteData, RouteSummary, RouteType, RouteWeather } from '@/lib/shared/types';
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
  /** routes[0] is the main route; alternatives follow. `from`/`to` are the geocoded places. */
  routeData: RouteData | null;
  /** Index-aligned with routeData.routes (reordered together with it). */
  routeWeather: RouteWeather[];
  routeStatus: LoadStatus;
  weatherStatus: LoadStatus;
  error: string | null;
  favoriteRoutes: FavoriteRoute[];
}

const isSameTrip = (f: FavoriteRoute, data: RouteData) =>
  f.from.name === data.from.name && f.to.name === data.to.name && f.routeType === data.routeType;

export const MIN_CONTROL_POINTS = 3;
export const MAX_CONTROL_POINTS = 20;

const initialState: RouteState = {
  query: { from: '', to: '' },
  routeType: 'fastest',
  controlPoints: 7,
  routeData: null,
  routeWeather: [],
  routeStatus: 'idle',
  weatherStatus: 'idle',
  error: null,
  favoriteRoutes: [],
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
    routeRequested(state, action: PayloadAction<{ from: string; to: string }>) {
      state.query = action.payload;
      state.routeStatus = 'loading';
      state.weatherStatus = 'idle';
      state.error = null;
      state.routeWeather = [];
    },
    routeLoaded(state, action: PayloadAction<RouteData>) {
      state.routeData = action.payload;
      state.routeWeather = [];
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
    },
    routeWeatherFailed(state, action: PayloadAction<string>) {
      state.weatherStatus = 'failed';
      state.error = action.payload;
    },
    /** Makes routes[index] the main route (moved to the front); routeWeather is reordered identically. */
    changeMainRoute(state, action: PayloadAction<number>) {
      const index = action.payload;
      const routes = state.routeData?.routes;
      if (!routes || index <= 0 || index >= routes.length) return;
      routes.unshift(...routes.splice(index, 1));
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
  },
  extraReducers: (builder) => {
    builder.addCase(hydrate, (state, action) => {
      const saved = action.payload.route;
      if (saved) Object.assign(state, saved);
    });
  },
  selectors: {
    selectRoute: (state) => state,
    selectRouteQuery: (state) => state.query,
    selectRouteType: (state) => state.routeType,
    selectControlPoints: (state) => state.controlPoints,
    selectRouteData: (state) => state.routeData,
    selectRouteWeather: (state) => state.routeWeather,
    selectRouteStatus: (state) => state.routeStatus,
    selectRouteWeatherStatus: (state) => state.weatherStatus,
    selectRouteError: (state) => state.error,
    selectFavoriteRoutes: (state) => state.favoriteRoutes,
    /** Index of the current route in favourites, -1 when not saved (or no route). */
    selectCurrentRouteFavoriteIndex: (state) => {
      const data = state.routeData;
      return data ? state.favoriteRoutes.findIndex((f) => isSameTrip(f, data)) : -1;
    },
  },
});

export const {
  setRouteType,
  setControlPoints,
  routeRequested,
  routeLoaded,
  routeFailed,
  routeWeatherRequested,
  routeWeatherLoaded,
  routeWeatherFailed,
  changeMainRoute,
  clearRoute,
  addFavoriteRoute,
  removeFavoriteRoute,
} = routeSlice.actions;

export const {
  selectRoute,
  selectRouteQuery,
  selectRouteType,
  selectControlPoints,
  selectRouteData,
  selectRouteWeather,
  selectRouteStatus,
  selectRouteWeatherStatus,
  selectRouteError,
  selectFavoriteRoutes,
  selectCurrentRouteFavoriteIndex,
} = routeSlice.selectors;

export default routeSlice.reducer;
