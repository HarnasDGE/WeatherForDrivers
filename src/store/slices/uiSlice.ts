import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { hydrate } from '../hydrate';

export const APP_TABS = ['drive', 'when', 'exposure', 'forecast'] as const;
export type AppTab = (typeof APP_TABS)[number];

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export interface UiState {
  tab: AppTab;
  /** "system" follows prefers-color-scheme. */
  theme: ThemePreference;
  /** Rain radar overlay on the Drive map. */
  radar: boolean;
}

const initialState: UiState = { tab: 'drive', theme: 'system', radar: false };

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTab(state, action: PayloadAction<AppTab>) {
      state.tab = action.payload;
    },
    setTheme(state, action: PayloadAction<ThemePreference>) {
      state.theme = action.payload;
    },
    setRadar(state, action: PayloadAction<boolean>) {
      state.radar = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(hydrate, (state, action) => {
      const { tab, theme, radar } = action.payload.ui ?? {};
      if (tab && APP_TABS.includes(tab)) state.tab = tab;
      if (theme && THEME_PREFERENCES.includes(theme)) state.theme = theme;
      if (typeof radar === 'boolean') state.radar = radar;
    });
  },
  selectors: {
    selectTab: (state) => state.tab,
    selectThemePreference: (state) => state.theme,
    selectRadar: (state) => state.radar,
  },
});

export const { setTab, setTheme, setRadar } = uiSlice.actions;
export const { selectTab, selectThemePreference, selectRadar } = uiSlice.selectors;
export default uiSlice.reducer;
