import type { Store } from '@reduxjs/toolkit';
import type { RootState } from './root-reducer';

/** Fresh key: the legacy app stored an incompatible shape under "weather". */
const STORAGE_KEY = 'weatherapp:v1';

type WeatherPersisted = Omit<RootState['weather'], 'status' | 'error' | 'favoritesRefreshing' | 'hydrated'>;
type RoutePersisted = Pick<RootState['route'], 'query' | 'routeType' | 'controlPoints' | 'favoriteRoutes'>;

export interface PersistedState {
  weather?: Partial<WeatherPersisted>;
  route?: Partial<RoutePersisted>;
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
  const { status, error, favoritesRefreshing, hydrated, ...weather } = state.weather;
  void status, void error, void favoritesRefreshing, void hydrated;
  const { query, routeType, controlPoints, favoriteRoutes } = state.route;
  return { weather, route: { query, routeType, controlPoints, favoriteRoutes } };
}

/** Writes weather + route preferences/favourites to localStorage on change. Returns an unsubscribe function. */
export function startPersistence(store: Store<RootState>): () => void {
  let last = store.getState();
  return store.subscribe(() => {
    const state = store.getState();
    if (state.weather === last.weather && state.route === last.route) return;
    last = state;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pickPersisted(state)));
    } catch {
      // quota exceeded or storage blocked - the app keeps working without persistence
    }
  });
}
