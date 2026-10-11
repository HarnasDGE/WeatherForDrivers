import { useAppSelector } from '@/store/hooks';
import { selectContent } from '@/store/slices/weatherSlice';
import MainInfo from '@/components/weather/MainInfo';
import RoutePanel from '@/components/route/RoutePanel';
import WeatherMapPanel from '@/components/maps/WeatherMapPanel';

/** Shows the tab selected in the store (`content`). */
export default function Section() {
  const content = useAppSelector(selectContent);
  switch (content) {
    case 'Maps':
      return <WeatherMapPanel />;
    case 'Along The Road':
      return <RoutePanel />;
    default:
      return <MainInfo />;
  }
}
