import Icon from '@/components/ui/Icon';
import { formatDistanceKm, formatDuration } from '@/lib/shared/format';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { removeFavoriteRoute, selectFavoriteRoutes } from '@/store/slices/routeSlice';
import type { FavoriteRoute } from '@/store/slices/routeSlice';
import styles from './DriveHome.module.css';

interface DriveHomeProps {
  onPlan: () => void;
  onPickSaved: (favorite: FavoriteRoute) => void;
}

/** Sheet content before any route: saved routes, or a short explanation when there are none. */
export default function DriveHome({ onPlan, onPickSaved }: DriveHomeProps) {
  const dispatch = useAppDispatch();
  const saved = useAppSelector(selectFavoriteRoutes);

  if (saved.length === 0) {
    return (
      <div className={styles.empty}>
        <h2 className={styles.title}>Where are you driving?</h2>
        <p className={styles.text}>
          See the weather at every stretch of your route, for the time you actually get there.
        </p>
        <button type="button" className={styles.plan} onClick={onPlan}>
          Plan a route
        </button>
      </div>
    );
  }

  return (
    <section>
      <h2 className={styles.heading}>Saved routes</h2>
      <ul>
        {saved.map((favorite, index) => (
          <li key={favorite.savedAt} className={styles.row}>
            <button type="button" className={styles.trip} onClick={() => onPickSaved(favorite)}>
              <span className={styles.name}>
                {favorite.from.name} to {favorite.to.name}
              </span>
              <span className={styles.meta}>
                {formatDistanceKm(favorite.summary.lengthInMeters)}, usually{' '}
                {formatDuration(favorite.summary.travelTimeInSeconds)}
              </span>
            </button>
            <button
              type="button"
              className={styles.remove}
              aria-label={`Remove ${favorite.from.name} to ${favorite.to.name}`}
              onClick={() => dispatch(removeFavoriteRoute(index))}
            >
              <Icon name="delete" size={22} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
