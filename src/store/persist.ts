import type { Store } from '@reduxjs/toolkit';
import type { RootState } from './root-reducer';

/** Bump the version when the persisted shape changes (old data is then ignored). */
const STORAGE_KEY = 'weatherfordrivers:v2';

type WeatherPersisted = Pick<RootState['weather'], 'place' | 'forecast' | 'savedPlaces'>;
type RoutePersisted = Pick<RootState['route'], 'query' | 'routeType' | 'controlPoints' | 'favoriteRoutes'>;
type UiPersisted = RootState['ui'];

export interface PersistedState {
  weather?: Partial<WeatherPersisted>;
  route?: Partial<RoutePersisted>;
  ui?: Partial<UiPersisted>;
}

export function loadPersistedState(): PersistedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : {};
  } catch {
    return {};
  }
}

function pickPersisted(state: RootState): PersistedState {
  const { place, forecast, savedPlaces } = state.weather;
  const { query, routeType, controlPoints, favoriteRoutes } = state.route;
  return {
    weather: { place, forecast, savedPlaces },
    route: { query, routeType, controlPoints, favoriteRoutes },
    ui: state.ui,
  };
}

/** Writes preferences, saved places/routes and the last forecast to localStorage on change. Returns an unsubscribe function. */
export function startPersistence(store: Store<RootState>): () => void {
  let last = store.getState();
  return store.subscribe(() => {
    const state = store.getState();
    if (state.weather === last.weather && state.route === last.route && state.ui === last.ui) return;
    last = state;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pickPersisted(state)));
    } catch {
      // quota exceeded or storage blocked - the app keeps working without persistence
    }
  });
}
