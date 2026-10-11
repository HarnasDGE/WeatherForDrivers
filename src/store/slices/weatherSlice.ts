import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { CurrentWeather, Forecast, Place, PlaceImage } from '@/lib/shared/types';
import type { TimeOfDay } from '@/lib/shared/time-of-day';
import { hydrate } from '../hydrate';

export const CONTENT_TABS = ['Main Info', 'Maps', 'Along The Road'] as const;
export type ContentTab = (typeof CONTENT_TABS)[number];

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface FavoritePlace {
  place: Place;
  current: CurrentWeather;
  forecast: Forecast;
  image: PlaceImage | null;
}

export interface WeatherState {
  place: Place | null;
  current: CurrentWeather | null;
  forecast: Forecast | null;
  image: PlaceImage | null;
  timeOfDay: TimeOfDay | null;
  /** Index (0..4) of the day selected in the daily forecast. */
  selectedDay: number;
  content: ContentTab;
  status: LoadStatus;
  error: string | null;
  favoritePlaces: FavoritePlace[];
  favoritesRefreshing: boolean;
  /** true once localStorage has been read on the client (always false during SSR). */
  hydrated: boolean;
}

export interface PlaceLoaded {
  place: Place;
  current: CurrentWeather;
  forecast: Forecast;
  image: PlaceImage | null;
  timeOfDay: TimeOfDay;
}

export interface FavoriteUpdate {
  place: Place;
  current: CurrentWeather;
  forecast: Forecast;
}

const initialState: WeatherState = {
  place: null,
  current: null,
  forecast: null,
  image: null,
  timeOfDay: null,
  selectedDay: 0,
  content: 'Main Info',
  status: 'idle',
  error: null,
  favoritePlaces: [],
  favoritesRefreshing: false,
  hydrated: false,
};

export const isSamePlace = (a: Place, b: Place) =>
  a.name === b.name && (a.countryCode ?? '') === (b.countryCode ?? '');

const weatherSlice = createSlice({
  name: 'weather',
  initialState,
  reducers: {
    placeRequested(state) {
      state.status = 'loading';
      state.error = null;
    },
    placeLoaded(state, action: PayloadAction<PlaceLoaded>) {
      Object.assign(state, action.payload, { status: 'succeeded', error: null, selectedDay: 0 });
    },
    placeFailed(state, action: PayloadAction<string>) {
      state.status = 'failed';
      state.error = action.payload;
    },
    selectDay(state, action: PayloadAction<number>) {
      state.selectedDay = action.payload;
    },
    changeContent(state, action: PayloadAction<ContentTab>) {
      state.content = action.payload;
    },
    /** Adds the currently shown place to favourites (no-op when empty or already there). */
    addFavoritePlace(state) {
      const { place, current, forecast, image } = state;
      if (!place || !current || !forecast) return;
      if (state.favoritePlaces.some((f) => isSamePlace(f.place, place))) return;
      state.favoritePlaces.push({ place, current, forecast, image });
    },
    removeFavoritePlace(state, action: PayloadAction<number>) {
      state.favoritePlaces.splice(action.payload, 1);
    },
    favoritesRefreshRequested(state) {
      state.favoritesRefreshing = true;
    },
    /** Merges fresh data into favourites by place identity (entries removed meanwhile are ignored). */
    favoritesRefreshed(state, action: PayloadAction<FavoriteUpdate[]>) {
      state.favoritesRefreshing = false;
      for (const update of action.payload) {
        const fav = state.favoritePlaces.find((f) => isSamePlace(f.place, update.place));
        if (fav) {
          fav.current = update.current;
          fav.forecast = update.forecast;
        }
      }
    },
    favoritesRefreshFailed(state) {
      state.favoritesRefreshing = false;
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
    selectWeather: (state) => state,
    selectPlace: (state) => state.place,
    selectCurrentWeather: (state) => state.current,
    selectForecast: (state) => state.forecast,
    selectPlaceImage: (state) => state.image,
    selectTimeOfDay: (state) => state.timeOfDay,
    selectSelectedDay: (state) => state.selectedDay,
    selectContent: (state) => state.content,
    selectWeatherStatus: (state) => state.status,
    selectWeatherError: (state) => state.error,
    selectFavoritePlaces: (state) => state.favoritePlaces,
    selectFavoritesRefreshing: (state) => state.favoritesRefreshing,
    selectHydrated: (state) => state.hydrated,
  },
});

export const {
  placeRequested,
  placeLoaded,
  placeFailed,
  selectDay,
  changeContent,
  addFavoritePlace,
  removeFavoritePlace,
  favoritesRefreshRequested,
  favoritesRefreshed,
  favoritesRefreshFailed,
} = weatherSlice.actions;

export const {
  selectWeather,
  selectPlace,
  selectCurrentWeather,
  selectForecast,
  selectPlaceImage,
  selectTimeOfDay,
  selectSelectedDay,
  selectContent,
  selectWeatherStatus,
  selectWeatherError,
  selectFavoritePlaces,
  selectFavoritesRefreshing,
  selectHydrated,
} = weatherSlice.selectors;

export default weatherSlice.reducer;
