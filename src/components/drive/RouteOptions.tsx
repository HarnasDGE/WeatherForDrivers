import ConditionTag from '@/components/ui/ConditionTag';
import { formatDistanceKm, formatDuration } from '@/lib/shared/format';
import type { RouteOption } from './tripSummary';
import styles from './RouteOptions.module.css';

interface RouteOptionsProps {
  options: RouteOption[];
  onSelect: (index: number) => void;
}

/** Route variants as rows; the first one is the selected (main) route. */
export default function RouteOptions({ options, onSelect }: RouteOptionsProps) {
  if (options.length < 2) return null;
  return (
    <ul className={styles.list} aria-label="Route options">
      {options.map(({ route, condition, quickest, calmest }, index) => {
        const tags = [quickest && 'Quickest', calmest && 'Calmest weather'].filter(Boolean).join(', ');
        const delay = route.summary.trafficDelayInSeconds;
        return (
          <li key={index}>
            <button
              type="button"
              className={styles.option}
              aria-pressed={index === 0}
              onClick={() => index !== 0 && onSelect(index)}
            >
              <span className={styles.main}>
                <span className={styles.duration}>{formatDuration(route.summary.travelTimeInSeconds)}</span>
                <span className={styles.sub}>
                  {formatDistanceKm(route.summary.lengthInMeters)}
                  {delay >= 60 && `, ${formatDuration(delay)} of traffic`}
                </span>
              </span>
              <span className={styles.side}>
                {tags && <span className={styles.tags}>{tags}</span>}
                {condition && <ConditionTag condition={condition} />}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
