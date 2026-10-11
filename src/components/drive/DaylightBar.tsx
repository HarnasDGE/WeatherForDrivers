import Icon from '@/components/ui/Icon';
import { formatDuration } from '@/lib/shared/format';
import type { RouteWeatherPoint } from '@/lib/shared/types';
import { lightAt, lightShares, lightSummary } from './tripSummary';
import styles from './DaylightBar.module.css';

/**
 * Daylight vs dark along the trip: a bar split by driving time (in trip order), with the same
 * colours the road uses on the map and in the timeline.
 */
export default function DaylightBar({ points }: { points: RouteWeatherPoint[] }) {
  if (points.length < 2) return null;
  const shares = lightShares(points);
  const total = Math.max(1, points[points.length - 1].travelTimeInSeconds);

  // Consecutive stretches with the same light, in order, as bar segments.
  const segments: Array<{ light: 'day' | 'night'; seconds: number }> = [];
  for (let i = 1; i < points.length; i++) {
    const seconds = Math.max(0, points[i].travelTimeInSeconds - points[i - 1].travelTimeInSeconds);
    const before = lightAt(points[i - 1]);
    const after = lightAt(points[i]);
    const parts =
      before === after
        ? [{ light: before, seconds }]
        : [
            { light: before, seconds: seconds / 2 },
            { light: after, seconds: seconds / 2 },
          ];
    for (const part of parts) {
      const last = segments[segments.length - 1];
      if (last && last.light === part.light) last.seconds += part.seconds;
      else segments.push({ ...part });
    }
  }

  return (
    <section className={styles.daylight} aria-label="Daylight on the route">
      <div className={styles.bar} aria-hidden="true">
        {segments.map((segment, index) => (
          <span key={index} data-light={segment.light} style={{ flexGrow: segment.seconds / total }} />
        ))}
      </div>
      <div className={styles.legend}>
        <span>
          <Icon name="light_mode" size={18} className={styles.sun} />
          Daylight {formatDuration(shares.day)}
        </span>
        <span>
          <Icon name="bedtime" size={18} className={styles.moon} />
          Dark {formatDuration(shares.night)}
        </span>
      </div>
      <p className={styles.summary}>{lightSummary(points)}</p>
    </section>
  );
}
