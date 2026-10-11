import type { AppDispatch, RootState } from '../index';

export type AppThunk<R = void> = (dispatch: AppDispatch, getState: () => RootState) => Promise<R>;

export const errorMessage = (error: unknown, fallback = 'Something went wrong.') =>
  error instanceof Error && error.message ? error.message : fallback;
