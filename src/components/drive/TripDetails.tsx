import Icon from '@/components/ui/Icon';
import type { RouteData, RouteWeather } from '@/lib/shared/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { showNotification } from '@/store/slices/notificationsSlice';
import {
  addFavoriteRoute,
  changeMainRoute,
  removeFavoriteRoute,
  selectCurrentRouteFavoriteIndex,
  selectRouteError,
  selectRouteWeatherStatus,
} from '@/store/slices/routeSlice';
import { fetchRouteWeather, fetchRouteWithWeather } from '@/store/thunks';
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

  return (
    <div>
      <header className={styles.header}>
        <h2 className={styles.title}>
          {routeData.from.name} to {routeData.to.name}
        </h2>
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
        Times assume you leave now.
        {demo && ' Routes and weather on this screen are sample data until the API keys are set.'}
      </p>
    </div>
  );
}
