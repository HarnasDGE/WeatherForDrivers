import { configureStore } from '@reduxjs/toolkit';
import { hydrate } from './hydrate';
import { loadPersistedState, startPersistence } from './persist';
import { rootReducer } from './root-reducer';

export function makeStore() {
  return configureStore({ reducer: rootReducer });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

let clientStore: AppStore | undefined;

/**
 * Astro islands are separate React roots, so they share one module-level store on the client
 * (one module instance per page); on the server every call returns a fresh store to avoid leaking state between requests.
 */
export function getStore(): AppStore {
  if (typeof window === 'undefined') return makeStore();
  clientStore ??= makeStore();
  return clientStore;
}

let clientInitialized = false;

/** Client only, idempotent: loads localStorage into the store, then starts persisting changes. */
export function initClientStore(): void {
  if (typeof window === 'undefined' || clientInitialized) return;
  clientInitialized = true;
  const store = getStore();
  store.dispatch(hydrate(loadPersistedState()));
  startPersistence(store);
}
