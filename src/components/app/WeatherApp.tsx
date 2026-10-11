import loadingIcon from '@/assets/loading.gif';
import StoreProvider from '@/components/providers/StoreProvider';
import Header from '@/components/layout/Header';
import Notifications from '@/components/ui/Notifications';
import FirstEntry from '@/components/weather/FirstEntry';
import { useAppSelector } from '@/store/hooks';
import { selectHydrated, selectPlace, selectPlaceImage, selectTimeOfDay } from '@/store/slices/weatherSlice';
import type { TimeOfDay } from '@/lib/shared/time-of-day';
import Section from './Section';
import Sidebar from './Sidebar';

// Local fallback backgrounds (bundled by Vite), keyed by time of day, e.g. "morning".
const TIME_OF_DAY_IMAGES = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('/src/assets/timeofday/*.png', { eager: true, query: '?url', import: 'default' }),
  ).map(([path, url]) => [path.split('/').pop()!.replace('.png', ''), url]),
) as Record<TimeOfDay, string | undefined>;

function Background() {
  const image = useAppSelector(selectPlaceImage);
  const timeOfDay = useAppSelector(selectTimeOfDay);
  const url = image?.url ?? TIME_OF_DAY_IMAGES[timeOfDay ?? 'midnight'];

  return (
    <>
      <div className="app-bg" style={url ? { backgroundImage: `url("${url}")` } : undefined} />
      {image && (
        <div className="photo-credit">
          Photo by{' '}
          <a href={image.authorUrl} target="_blank" rel="noopener noreferrer">
            {image.authorName}
          </a>{' '}
          on{' '}
          <a href="https://unsplash.com/" target="_blank" rel="noopener noreferrer">
            Unsplash
          </a>
        </div>
      )}
    </>
  );
}

function AppContent() {
  const hydrated = useAppSelector(selectHydrated);
  const place = useAppSelector(selectPlace);

  return (
    <>
      <Background />
      {hydrated ? (
        <div id="main-container">
          <Header />
          {place && <Sidebar />}
          {place ? <Section /> : <FirstEntry />}
        </div>
      ) : (
        <div className="loading">
          <img src={loadingIcon.src} alt="Loading..." width={48} />
        </div>
      )}
      <Notifications />
    </>
  );
}

/** Root of the React island: shared store + background + page content. */
export default function WeatherApp() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
