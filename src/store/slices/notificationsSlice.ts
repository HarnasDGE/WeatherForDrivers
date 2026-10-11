import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type NotificationType = 'info' | 'alert' | 'error' | 'confirm';

export interface NotificationsState {
  /** Empty message = nothing to show. `id` increases on every notification so identical messages re-trigger. */
  message: string;
  type: NotificationType;
  id: number;
}

const initialState: NotificationsState = { message: '', type: 'confirm', id: 0 };

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    showNotification: {
      reducer(state, action: PayloadAction<{ message: string; type: NotificationType }>) {
        state.message = action.payload.message;
        state.type = action.payload.type;
        state.id += 1;
      },
      prepare: (message: string, type: NotificationType = 'info') => ({ payload: { message, type } }),
    },
    clearNotification(state) {
      state.message = '';
    },
  },
  selectors: {
    selectNotification: (state) => state,
  },
});

export const { showNotification, clearNotification } = notificationsSlice.actions;
export const { selectNotification } = notificationsSlice.selectors;
export default notificationsSlice.reducer;
