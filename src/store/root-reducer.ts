import { combineReducers } from '@reduxjs/toolkit';
import notifications from './slices/notificationsSlice';
import route from './slices/routeSlice';
import ui from './slices/uiSlice';
import weather from './slices/weatherSlice';

export const rootReducer = combineReducers({ weather, route, ui, notifications });
export type RootState = ReturnType<typeof rootReducer>;
