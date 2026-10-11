import { useEffect } from 'react';
import type { RouteWarning } from '@/lib/shared/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectRouteData, selectRouteWarnings, selectRouteWeather } from '@/store/slices/routeSlice';
import { fetchRouteWarnings } from '@/store/thunks';

/** Official warnings along the main route; (re)fetched once its weather is in and whenever the main route changes. */
export function useRouteWarnings(): RouteWarning[] {
  const dispatch = useAppDispatch();
  const mainRoute = useAppSelector(selectRouteData)?.routes[0];
  const mainWeather = useAppSelector(selectRouteWeather)[0];
  const warnings = useAppSelector(selectRouteWarnings);

  useEffect(() => {
    if (mainRoute && mainWeather) void dispatch(fetchRouteWarnings());
  }, [dispatch, mainRoute, mainWeather]);

  return warnings;
}
