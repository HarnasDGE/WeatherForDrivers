import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { hydrate } from '../hydrate';

export const APP_TABS = ['drive', 'forecast'] as const;
export type AppTab = (typeof APP_TABS)[number];

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export interface UiState {
  tab: AppTab;
  /** "system" follows prefers-color-scheme. */
  theme: ThemePreference;
}

const initialState: UiState = { tab: 'drive', theme: 'system' };

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
  },
  extraReducers: (builder) => {
    builder.addCase(hydrate, (state, action) => {
      const { tab, theme } = action.payload.ui ?? {};
      if (tab && APP_TABS.includes(tab)) state.tab = tab;
      if (theme && THEME_PREFERENCES.includes(theme)) state.theme = theme;
    });
  },
  selectors: {
    selectTab: (state) => state.tab,
    selectThemePreference: (state) => state.theme,
  },
});

export const { setTab, setTheme } = uiSlice.actions;
export const { selectTab, selectThemePreference } = uiSlice.selectors;
export default uiSlice.reducer;
