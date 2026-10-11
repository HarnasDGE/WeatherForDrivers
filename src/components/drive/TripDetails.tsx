import Icon from '@/components/ui/Icon';
import { formatClock, formatDayTime } from '@/lib/shared/format';
import { buildTripLink } from '@/lib/shared/trip-link';
import type { RouteData, RouteWeather } from '@/lib/shared/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { showNotification } from '@/store/slices/notificationsSlice';
import {
  addFavoriteRoute,
  changeMainRoute,
  removeFavoriteRoute,
  selectCurrentRouteFavoriteIndex,
  selectDeparture,
  selectRouteError,
  selectRouteType,
  selectRouteWeatherStatus,
} from '@/store/slices/routeSlice';
import { fetchRouteWeather, fetchRouteWithWeather } from '@/store/thunks';
import DaylightBar from './DaylightBar';
import RoadTimeline, { RoadTimelineLoading } from './RoadTimeline';
import RouteOptions from './RouteOptions';
import { routeOptions, tripVerdict } from './tripSummary';
import styles from './TripDetails.module.css';

interface TripDetailsProps {
  routeData: RouteData;
  routeWeather: RouteWeather[];
  demo: boolean;
}

/** Sheet content for a found route: verdict, route options and the road timeline. */
export default function TripDetails({ routeData, routeWeather, demo }: TripDetailsProps) {
  const dispatch = useAppDispatch();
  const weatherStatus = useAppSelector(selectRouteWeatherStatus);
  const error = useAppSelector(selectRouteError);
  const savedIndex = useAppSelector(selectCurrentRouteFavoriteIndex);
  const departure = useAppSelector(selectDeparture);
  const routeType = useAppSelector(selectRouteType);
  const { departureTime, arrivalTime } = routeData.routes[0].summary;
  const leaving = departure ? `Leave ${formatDayTime(departureTime)}` : 'Leave now';

  const mainPoints = routeWeather[0]?.points ?? [];
  const verdict = tripVerdict(mainPoints);
  const options = routeOptions(routeData.routes, routeWeather);

  const toggleSaved = () => {
    if (savedIndex === -1) {
      dispatch(addFavoriteRoute());
      dispatch(showNotification('Route saved.', 'confirm'));
    } else {
      dispatch(removeFavoriteRoute(savedIndex));
      dispatch(showNotification('Route removed from saved.', 'info'));
    }
  };

  const shareTrip = async () => {
    const plannedAt = departure && new Date(departure).getTime() > Date.now() ? departure : null;
    const url = buildTripLink(window.location.origin, {
      from: routeData.from,
      to: routeData.to,
      departure: plannedAt,
      routeType,
    });
    const text = `${routeData.from.name} to ${routeData.to.name}, ${plannedAt ? `leave ${formatDayTime(departureTime)}` : 'leave now'}`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Weather for Drivers', text, url });
      } else {
        await navigator.clipboard.writeText(url);
        dispatch(showNotification('Link copied', 'confirm'));
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return; // share sheet dismissed
      dispatch(showNotification('Could not share the link.', 'error'));
    }
  };

  return (
    <div>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>
            {routeData.from.name} to {routeData.to.name}
          </h2>
          <p className={styles.when}>
            <Icon name="schedule" size={18} />
            {leaving}, arrive {formatClock(arrivalTime)}
          </p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.action}
            aria-pressed={savedIndex !== -1}
            aria-label={savedIndex === -1 ? 'Save route' : 'Remove from saved'}
            onClick={toggleSaved}
          >
            <Icon name="bookmark" filled={savedIndex !== -1} />
          </button>
          <button type="button" className={styles.action} aria-label="Share route" onClick={() => void shareTrip()}>
            <Icon name="share" />
          </button>
          <button
            type="button"
            className={styles.action}
            aria-label="Refresh route and weather"
            disabled={weatherStatus === 'loading'}
            onClick={() => void dispatch(fetchRouteWithWeather(routeData.from, routeData.to))}
          >
            <Icon name="refresh" />
          </button>
        </div>
      </header>

      {verdict && (
        <p className={styles.verdict} data-level={verdict.condition.level}>
          {verdict.text}
        </p>
      )}

      {weatherStatus !== 'loading' && <DaylightBar points={mainPoints} />}

      <RouteOptions options={options} onSelect={(index) => dispatch(changeMainRoute(index))} />

      {weatherStatus === 'loading' && <RoadTimelineLoading label="Checking the weather along the road" />}
      {weatherStatus === 'failed' && (
        <div className={styles.problem} role="alert">
          <p>{error ?? 'Could not check the weather along this route.'}</p>
          <button type="button" className={styles.retry} onClick={() => void dispatch(fetchRouteWeather())}>
            Try again
          </button>
        </div>
      )}
      {mainPoints.length > 0 && weatherStatus !== 'loading' && (
        <RoadTimeline points={mainPoints} from={routeData.from.name} to={routeData.to.name} />
      )}

      <p className={styles.note}>
        {departure ? `Times assume you leave ${formatDayTime(departureTime)}.` : 'Times assume you leave now.'}
        {demo && ' Routes and weather on this screen are sample data until the API keys are set.'}
      </p>
    </div>
  );
}
