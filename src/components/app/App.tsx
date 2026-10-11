import { useEffect, useRef } from 'react';
import StoreProvider from '@/components/providers/StoreProvider';
import DriveScreen from '@/components/drive/DriveScreen';
import ExposureScreen from '@/components/exposure/ExposureScreen';
import ForecastScreen from '@/components/forecast/ForecastScreen';
import WhenScreen from '@/components/when/WhenScreen';
import Notifications from '@/components/ui/Notifications';
import { useApplyTheme } from '@/hooks/useTheme';
import { parseTripQuery, TRIP_LINK_PARAMS } from '@/lib/shared/trip-link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setDeparture, setRouteType } from '@/store/slices/routeSlice';
import { fetchRouteWithWeather } from '@/store/thunks';
import { selectTab, setTab } from '@/store/slices/uiSlice';
import { selectHydrated } from '@/store/slices/weatherSlice';
import BottomNav from './BottomNav';
import styles from './App.module.css';

interface AppProps {
  /** Server is in mock mode: routes and road weather are sample data. */
  demo: boolean;
}

function AppShell({ demo }: AppProps) {
  const hydrated = useAppSelector(selectHydrated);
  const tab = useAppSelector(selectTab);
  useApplyTheme();
  const dispatch = useAppDispatch();
  const linkHandled = useRef(false);

  // Open a trip from a shared link (?from=...&to=...) once the store is hydrated, then clean the URL.
  useEffect(() => {
    if (!hydrated || linkHandled.current) return;
    linkHandled.current = true;
    const url = new URL(window.location.href);
    const trip = parseTripQuery(url.search);
    if (!trip) return;
    TRIP_LINK_PARAMS.forEach((key) => url.searchParams.delete(key));
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    dispatch(setTab('drive'));
    if (trip.routeType) dispatch(setRouteType(trip.routeType));
    const future = trip.departure && new Date(trip.departure).getTime() > Date.now();
    dispatch(setDeparture(future ? trip.departure : null));
    void dispatch(fetchRouteWithWeather(trip.from, trip.to));
  }, [hydrated, dispatch]);

  return (
    <div className={styles.shell}>
      <main className={styles.screen}>
        {hydrated && tab === 'drive' && <DriveScreen demo={demo} />}
        {hydrated && tab === 'when' && <WhenScreen />}
        {hydrated && tab === 'exposure' && <ExposureScreen />}
        {hydrated && tab === 'forecast' && <ForecastScreen />}
      </main>
      <BottomNav />
      <Notifications />
    </div>
  );
}

/** Root of the React island. */
export default function App({ demo }: AppProps) {
  return (
    <StoreProvider>
      <AppShell demo={demo} />
    </StoreProvider>
  );
}
