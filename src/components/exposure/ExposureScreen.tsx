import { useMemo } from 'react';
import Icon from '@/components/ui/Icon';
import NeedsRoute from '@/components/ui/NeedsRoute';
import { formatClock, formatDayTime, formatDistanceKm } from '@/lib/shared/format';
import { computeExposure } from '@/lib/shared/road-exposure';
import type { ExposureKind, ExposureStretch } from '@/lib/shared/road-exposure';
import { useAppSelector } from '@/store/hooks';
import {
  selectDeparture,
  selectRouteData,
  selectRouteWeather,
  selectRouteWeatherStatus,
} from '@/store/slices/routeSlice';
import screen from '@/styles/screen.module.css';
import styles from './ExposureScreen.module.css';

const LANES: Array<{ kind: ExposureKind; label: string; icon: string }> = [
  { kind: 'glare', label: 'Sun in your eyes', icon: 'wb_sunny' },
  { kind: 'wind', label: 'Crosswind', icon: 'air' },
];

const TIPS: Record<ExposureKind, string> = {
  glare:
    'Clean the windscreen inside and out, keep sunglasses at hand, and leave more space: the car ahead is dazzled too.',
  wind: 'Hold the wheel with both hands on bridges, in cuttings and when passing lorries. Vans, trailers and roof boxes feel it most.',
};

function title(stretch: ExposureStretch): string {
  if (stretch.kind === 'glare') return stretch.level === 'danger' ? 'Sun straight in your eyes' : 'Low sun ahead';
  return `Crosswind from the ${stretch.side}, gusts ${stretch.peak} km/h`;
}

function detail(stretch: ExposureStretch): string {
  const when =
    formatClock(stretch.fromTime) === formatClock(stretch.toTime)
      ? `around ${formatClock(stretch.fromTime)}`
      : `${formatClock(stretch.fromTime)} to ${formatClock(stretch.toTime)}`;
  const where = `${formatDistanceKm(stretch.fromMeters)} to ${formatDistanceKm(stretch.toMeters)}`;
  const extra = stretch.kind === 'glare' ? `, sun ${Math.max(1, Math.round(stretch.peak))}° above the horizon` : '';
  return `${when}, ${where}${extra}`;
}

/** "Sun & wind" tab: where low sun shines into the windscreen and where gusts hit the side of the car. */
export default function ExposureScreen() {
  const routeData = useAppSelector(selectRouteData);
  const routeWeather = useAppSelector(selectRouteWeather);
  const weatherStatus = useAppSelector(selectRouteWeatherStatus);
  const departure = useAppSelector(selectDeparture);
  const route = routeData?.routes[0];
  const checkpoints = routeWeather[0]?.points ?? [];

  const exposure = useMemo(
    () => (route ? computeExposure(route.points, checkpoints, route.summary.departureTime, route.timeline) : null),
    [route, checkpoints],
  );

  if (!routeData || !route || (!exposure && weatherStatus !== 'loading')) {
    return (
      <div className={screen.screen}>
        <div className={screen.column}>
          <NeedsRoute
            title="Sun and wind on your way"
            text="Check a route on the Drive tab to see where low sun shines into the windscreen and where crosswinds are strong."
          />
        </div>
      </div>
    );
  }

  const leaving = departure ? `leave ${formatDayTime(route.summary.departureTime)}` : 'leave now';

  return (
    <div className={screen.screen}>
      <div className={screen.column}>
        <h1 className={screen.title}>Sun and wind</h1>
        <p className={screen.subtitle}>
          {routeData.from.name} to {routeData.to.name}, {leaving}
        </p>

        {weatherStatus === 'loading' || !exposure ? (
          <p className={styles.status} role="status">
            Checking the weather along the road
          </p>
        ) : (
          <>
            <section className={styles.ribbon} aria-label="Along the trip">
              {LANES.map(({ kind, label, icon }) => {
                const stretches = exposure.stretches.filter((s) => s.kind === kind);
                return (
                  <div key={kind} className={styles.lane}>
                    <p className={styles.laneLabel}>
                      <Icon name={icon} size={18} />
                      {label}
                      <span className={styles.count}>{stretches.length === 0 ? 'none' : `${stretches.length}x`}</span>
                    </p>
                    <div className={styles.track} aria-hidden="true">
                      {stretches.map((s) => (
                        <span
                          key={`${s.fromMeters}`}
                          data-level={s.level}
                          style={{
                            left: `${(s.fromMeters / exposure.totalMeters) * 100}%`,
                            width: `${Math.max(1.5, ((s.toMeters - s.fromMeters) / exposure.totalMeters) * 100)}%`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className={styles.ticks}>
                <span>{formatClock(exposure.departure)}</span>
                <span>{formatDistanceKm(exposure.totalMeters)}</span>
                <span>{formatClock(exposure.arrival)}</span>
              </div>
            </section>

            {exposure.stretches.length === 0 ? (
              <p className={styles.clear}>No low sun ahead and no strong crosswind on this trip.</p>
            ) : (
              <ol className={styles.list}>
                {exposure.stretches.map((s) => (
                  <li key={`${s.kind}-${s.fromMeters}`} className={styles.item} data-level={s.level}>
                    <span className={styles.itemIcon} data-kind={s.kind}>
                      <Icon name={s.kind === 'glare' ? 'wb_sunny' : 'air'} size={20} />
                    </span>
                    <div>
                      <p className={styles.itemTitle}>{title(s)}</p>
                      <p className={styles.itemDetail}>{detail(s)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {LANES.filter(({ kind }) => exposure.stretches.some((s) => s.kind === kind)).map(({ kind, label }) => (
              <p key={kind} className={styles.tip}>
                <b>{label}:</b> {TIPS[kind]}
              </p>
            ))}

            <p className={screen.note}>
              The sun's position is calculated for each stretch; glare only counts under a mostly clear sky. Crosswind
              uses forecast gusts and the direction of the road.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
