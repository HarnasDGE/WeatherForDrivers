import ConditionTag from '@/components/ui/ConditionTag';
import Icon from '@/components/ui/Icon';
import { formatClock, formatDistanceKm, formatTemperature } from '@/lib/shared/format';
import { assessRoad } from '@/lib/shared/road-conditions';
import type { RouteWeatherPoint } from '@/lib/shared/types';
import { getWeatherDescription, getWeatherSymbol } from '@/lib/shared/weather-icons';
import { checkpointName } from './tripSummary';
import styles from './RoadTimeline.module.css';

interface RoadTimelineProps {
  points: RouteWeatherPoint[];
  from: string;
  to: string;
}

const position = (index: number, count: number) => (index === 0 ? 'start' : index === count - 1 ? 'finish' : 'middle');

/**
 * The trip as a road: arrival time on the left, the asphalt band with its centre line in the middle,
 * the weather on the right. The band's edges take the colour of the road condition at each stretch.
 */
export default function RoadTimeline({ points, from, to }: RoadTimelineProps) {
  return (
    <ol className={styles.road} aria-label="Weather along the route">
      {points.map((point, index) => {
        const condition = assessRoad(point);
        return (
          <li
            key={`${point.lat},${point.lon}`}
            className={styles.stop}
            data-position={position(index, points.length)}
            data-level={condition.level}
          >
            <time className={styles.time} dateTime={point.time}>
              {formatClock(point.time)}
            </time>
            <span className={styles.band} aria-hidden="true">
              <span className={styles.marker} />
            </span>
            <div className={styles.info}>
              <div className={styles.head}>
                <span className={styles.name}>{checkpointName(point, index, points.length, from, to)}</span>
                <span className={styles.temp}>{formatTemperature(point.temperature)}</span>
              </div>
              <div className={styles.weather}>
                <Icon name={getWeatherSymbol(point.weatherCode, point.isDay)} size={20} className={styles.symbol} />
                <ConditionTag condition={condition} />
              </div>
              <p className={styles.detail}>
                {getWeatherDescription(point.weatherCode)}
                {index > 0 && `, ${formatDistanceKm(point.lengthInMeters)} in`}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Placeholder road while the route or its weather loads: the centre line scrolls, as if driving. */
export function RoadTimelineLoading({ label }: { label: string }) {
  return (
    <div className={styles.loading} role="status">
      <span className={styles.band} data-moving="true" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}
