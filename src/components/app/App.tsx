import StoreProvider from '@/components/providers/StoreProvider';
import DriveScreen from '@/components/drive/DriveScreen';
import ExposureScreen from '@/components/exposure/ExposureScreen';
import ForecastScreen from '@/components/forecast/ForecastScreen';
import WhenScreen from '@/components/when/WhenScreen';
import Notifications from '@/components/ui/Notifications';
import { useApplyTheme } from '@/hooks/useTheme';
import { useAppSelector } from '@/store/hooks';
import { selectTab } from '@/store/slices/uiSlice';
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
