import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Forecast, Place } from '@/lib/shared/types';
import { hydrate } from '../hydrate';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

/** Place forecast (the "Forecast" tab). */
export interface WeatherState {
  place: Place | null;
  forecast: Forecast | null;
  status: LoadStatus;
  error: string | null;
  savedPlaces: Place[];
  /** true once localStorage has been read on the client (always false during SSR). */
  hydrated: boolean;
}

const initialState: WeatherState = {
  place: null,
  forecast: null,
  status: 'idle',
  error: null,
  savedPlaces: [],
  hydrated: false,
};

export const isSamePlace = (a: Place, b: Place) =>
  a.name === b.name && (a.countryCode ?? '') === (b.countryCode ?? '') && (a.admin1 ?? '') === (b.admin1 ?? '');

const weatherSlice = createSlice({
  name: 'weather',
  initialState,
  reducers: {
    placeRequested(state) {
      state.status = 'loading';
      state.error = null;
    },
    placeLoaded(state, action: PayloadAction<{ place: Place; forecast: Forecast }>) {
      state.place = action.payload.place;
      state.forecast = action.payload.forecast;
      state.status = 'succeeded';
    },
    placeFailed(state, action: PayloadAction<string>) {
      state.status = 'failed';
      state.error = action.payload;
    },
    /** Saves the shown place, or removes it when it is already saved. */
    toggleSavedPlace(state) {
      const { place } = state;
      if (!place) return;
      const index = state.savedPlaces.findIndex((p) => isSamePlace(p, place));
      if (index === -1) state.savedPlaces.push(place);
      else state.savedPlaces.splice(index, 1);
    },
    removeSavedPlace(state, action: PayloadAction<number>) {
      state.savedPlaces.splice(action.payload, 1);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(hydrate, (state, action) => {
      const saved = action.payload.weather;
      if (saved) Object.assign(state, saved);
      state.hydrated = true;
    });
  },
  selectors: {
    selectPlace: (state) => state.place,
    selectForecast: (state) => state.forecast,
    selectWeatherStatus: (state) => state.status,
    selectWeatherError: (state) => state.error,
    selectSavedPlaces: (state) => state.savedPlaces,
    selectIsPlaceSaved: (state) => state.place !== null && state.savedPlaces.some((p) => isSamePlace(p, state.place!)),
    selectHydrated: (state) => state.hydrated,
  },
});

export const { placeRequested, placeLoaded, placeFailed, toggleSavedPlace, removeSavedPlace } = weatherSlice.actions;

export const {
  selectPlace,
  selectForecast,
  selectWeatherStatus,
  selectWeatherError,
  selectSavedPlaces,
  selectIsPlaceSaved,
  selectHydrated,
} = weatherSlice.selectors;

export default weatherSlice.reducer;
