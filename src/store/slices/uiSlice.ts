import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { hydrate } from '../hydrate';

export const APP_TABS = ['drive', 'forecast'] as const;
export type AppTab = (typeof APP_TABS)[number];

export interface UiState {
  tab: AppTab;
}

const initialState: UiState = { tab: 'drive' };

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTab(state, action: PayloadAction<AppTab>) {
      state.tab = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(hydrate, (state, action) => {
      const tab = action.payload.ui?.tab;
      if (tab && APP_TABS.includes(tab)) state.tab = tab;
    });
  },
  selectors: {
    selectTab: (state) => state.tab,
  },
});

export const { setTab } = uiSlice.actions;
export const { selectTab } = uiSlice.selectors;
export default uiSlice.reducer;
