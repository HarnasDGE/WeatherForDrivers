import { Fragment, useEffect, useRef } from 'react';
import ConditionTag from '@/components/ui/ConditionTag';
import Icon from '@/components/ui/Icon';
import { formatClock, formatDistanceKm, formatTemperature } from '@/lib/shared/format';
import { assessRoad } from '@/lib/shared/road-conditions';
import type { RouteWeatherPoint } from '@/lib/shared/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { focusCheckpoint, selectFocusedCheckpoint, selectFocusSeq, selectFocusSource } from '@/store/slices/routeSlice';
import { getWeatherDescription, getWeatherSymbol } from '@/lib/shared/weather-icons';
import { checkpointName, lightAt, lightChanges } from './tripSummary';
import styles from './RoadTimeline.module.css';

interface RoadTimelineProps {
  points: RouteWeatherPoint[];
  from: string;
  to: string;
}

const position = (index: number, count: number) => (index === 0 ? 'start' : index === count - 1 ? 'finish' : 'middle');

/**
 * The trip as a road: arrival time on the left, the asphalt band with its centre line in the middle,
 * the weather on the right. The band's edges take the colour of the road condition at each stretch;
 * stretches driven in the dark turn indigo, with a sunset / sunrise row where the light changes.
 */
export default function RoadTimeline({ points, from, to }: RoadTimelineProps) {
  const dispatch = useAppDispatch();
  const focused = useAppSelector(selectFocusedCheckpoint);
  const focusSeq = useAppSelector(selectFocusSeq);
  const focusSource = useAppSelector(selectFocusSource);
  const rows = useRef(new Map<number, HTMLLIElement>());

  // A sign tapped on the map: scroll its row into view (after the sheet has finished opening).
  useEffect(() => {
    if (focused === null || focusSource !== 'map') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(
      () => rows.current.get(focused)?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }),
      300,
    );
    return () => window.clearTimeout(timer);
    // Only a new request scrolls, not a re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSeq]);

  const changes = new Map(lightChanges(points).map((change) => [change.index, change]));
  return (
    <ol className={styles.road} aria-label="Weather along the route">
      {points.map((point, index) => {
        const condition = assessRoad(point);
        const light = lightAt(point);
        const change = changes.get(index);
        return (
          <Fragment key={`${point.lat},${point.lon}`}>
            {change && (
              <li className={styles.change} data-kind={change.kind}>
                <span className={styles.changeIcon} aria-hidden="true">
                  <Icon name="wb_twilight" size={20} />
                </span>
                <span className={styles.band} aria-hidden="true" />
                <p className={styles.changeText}>
                  {change.kind === 'sunset' ? 'Sunset, dark from here' : 'Sunrise, daylight from here'}
                  <span>
                    between {formatClock(change.from)} and {formatClock(change.to)}
                  </span>
                </p>
              </li>
            )}
            <li
              ref={(element) => {
                if (element) rows.current.set(index, element);
                else rows.current.delete(index);
              }}
              className={styles.stop}
              data-focused={focused === index}
              data-flash={focused === index && focusSource === 'map' ? focusSeq : undefined}
              data-position={position(index, points.length)}
              data-level={condition.level}
              data-light={light}
            >
              <button
                type="button"
                className={styles.pick}
                aria-pressed={focused === index}
                aria-label={`Show ${checkpointName(point, index, points.length, from, to)} on the map`}
                onClick={() => dispatch(focusCheckpoint({ index, source: 'timeline' }))}
              />
              <time className={styles.time} dateTime={point.time}>
                {formatClock(point.time)}
                <Icon name={light === 'day' ? 'light_mode' : 'bedtime'} size={16} className={styles.lightIcon} />
                <span className="visually-hidden">{light === 'day' ? 'daylight' : 'dark'}</span>
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
          </Fragment>
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
