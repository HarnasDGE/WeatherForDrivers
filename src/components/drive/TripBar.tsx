import Icon from '@/components/ui/Icon';
import type { RouteData } from '@/lib/shared/types';
import styles from './TripBar.module.css';

interface TripBarProps {
  routeData: RouteData | null;
  demo: boolean;
  onEdit: () => void;
}

/** Floating "Where to?" bar; shows the current trip once there is one. Opens the planner. */
export default function TripBar({ routeData, demo, onEdit }: TripBarProps) {
  return (
    <div className={styles.bar}>
      <button type="button" className={styles.trip} onClick={onEdit}>
        {routeData ? (
          <span className={styles.ends}>
            <span className={styles.end} data-kind="start">
              {routeData.from.name}
            </span>
            <span className={styles.end} data-kind="finish">
              {routeData.to.name}
            </span>
            <span className="visually-hidden">Change route</span>
          </span>
        ) : (
          <>
            <Icon name="search" className={styles.searchIcon} />
            <span className={styles.prompt}>Where to?</span>
          </>
        )}
      </button>
      {demo && (
        <span className={styles.demo} title="Routes and road weather are sample data until the API keys are set.">
          Demo data
        </span>
      )}
    </div>
  );
}
