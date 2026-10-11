import { combineReducers } from '@reduxjs/toolkit';
import notifications from './slices/notificationsSlice';
import route from './slices/routeSlice';
import weather from './slices/weatherSlice';

export const rootReducer = combineReducers({ weather, route, notifications });
export type RootState = ReturnType<typeof rootReducer>;
