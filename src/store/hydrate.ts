import { createAction } from '@reduxjs/toolkit';
import type { PersistedState } from './persist';

/** Dispatched once on the client after mount with whatever was found in localStorage (may be empty). */
export const hydrate = createAction<PersistedState>('app/hydrate');
