import { useEffect, useMemo, useRef, useState } from 'react';
import ConditionTag from '@/components/ui/ConditionTag';
import NeedsRoute from '@/components/ui/NeedsRoute';
import { tripVerdict, lightSummary } from '@/components/drive/tripSummary';
import { useDepartureWindows } from '@/hooks/useDepartureWindows';
import { formatClock, formatDayTime } from '@/lib/shared/format';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectRouteData, selectRouteWeather, selectRouteWeatherStatus, setDeparture } from '@/store/slices/routeSlice';
import { setTab } from '@/store/slices/uiSlice';
import { fetchRouteWithWeather } from '@/store/thunks';
import screen from '@/styles/screen.module.css';
import { bestIndex, summarizeWindows } from './windowSummary';
import type { WindowSummary } from './windowSummary';
import styles from './WhenScreen.module.css';

const SHORT_DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });

const columnLabel = (summary: WindowSummary, index: number) =>
  index === 0 ? 'Now' : formatClock(summary.window.departure);
const leaveLabel = (summary: WindowSummary, index: number) =>
  index === 0 ? 'Leave now' : `Leave ${formatDayTime(summary.window.departure)}`;
const percentInDaylight = (summary: WindowSummary) => `${Math.round((1 - summary.darkShare) * 100)}% in daylight`;

/** "When" tab: the current route checked for every departure in the next 24 hours, best one first. */
export default function WhenScreen() {
  const dispatch = useAppDispatch();
  const routeData = useAppSelector(selectRouteData);
  const routeWeather = useAppSelector(selectRouteWeather);
  const weatherStatus = useAppSelector(selectRouteWeatherStatus);
  const checkpoints = routeWeather[0]?.points ?? [];
  const { status, windows, error } = useDepartureWindows(checkpoints);

  const summaries = useMemo(() => summarizeWindows(windows, checkpoints), [windows, checkpoints]);
  const best = summaries.length > 0 ? bestIndex(summaries) : -1;
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => setSelected(null), [windows]);
  const active = selected ?? best;
  // Bars are scaled between the best and the worst departure, so differences stay visible.
  const scores = summaries.map((s) => s.score);
  const minScore = Math.min(...scores);
  const scoreRange = Math.max(0.5, Math.max(...scores) - minScore);
  const chartRef = useRef<HTMLOListElement>(null);

  // Bring the best departure into view when the windows arrive.
  useEffect(() => {
    const column = chartRef.current?.querySelector<HTMLElement>('[data-best="true"]');
    column?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [best, windows]);

  if (!routeData || (checkpoints.length < 2 && weatherStatus !== 'loading')) {
    return (
      <div className={screen.screen}>
        <div className={screen.column}>
          <NeedsRoute
            title="When should you leave?"
            text="Check a route on the Drive tab. We then try every departure in the next 24 hours and pick the calmest one."
          />
        </div>
      </div>
    );
  }

  const use = (index: number) => {
    const summary = summaries[index];
    dispatch(setDeparture(index === 0 ? null : summary.window.departure));
    void dispatch(fetchRouteWithWeather(routeData.from, routeData.to));
    dispatch(setTab('drive'));
  };

  const activeSummary = active >= 0 ? summaries[active] : null;
  const verdict = activeSummary ? tripVerdict(activeSummary.points) : null;

  return (
    <div className={screen.screen}>
      <div className={screen.column}>
        <h1 className={screen.title}>When to leave</h1>
        <p className={screen.subtitle}>
          {routeData.from.name} to {routeData.to.name}, next 24 hours
        </p>

        {status === 'loading' || weatherStatus === 'loading' ? (
          <p className={styles.status} role="status">
            Checking 25 departure times
          </p>
        ) : status === 'failed' ? (
          <p className={styles.status} role="alert">
            {error}
          </p>
        ) : (
          best >= 0 && (
            <>
              <section className={styles.best} data-level={summaries[best].worst.level}>
                <p className={styles.bestLabel}>Best time</p>
                <p className={styles.bestWhen}>{leaveLabel(summaries[best], best)}</p>
                <p className={styles.bestWhy}>
                  {tripVerdict(summaries[best].points)?.text} {percentInDaylight(summaries[best])}, arrive{' '}
                  {formatClock(summaries[best].arrival)}.
                </p>
              </section>

              <section className={screen.section}>
                <h2 className={screen.heading}>Every departure</h2>
                <p className={styles.hint}>Taller bars are calmer drives. Tap one to see it.</p>
                <ol ref={chartRef} className={styles.chart} aria-label="Departures">
                  {summaries.map((summary, index) => {
                    const date = new Date(summary.window.departure);
                    const previous = index > 0 ? new Date(summaries[index - 1].window.departure) : null;
                    const newDay = previous !== null && previous.getDate() !== date.getDate();
                    const height = 14 + 82 * (1 - (summary.score - minScore) / scoreRange);
                    return (
                      <li key={summary.window.departure}>
                        <button
                          type="button"
                          className={styles.column}
                          aria-pressed={index === active}
                          data-best={index === best}
                          data-level={summary.worst.level}
                          aria-label={`${leaveLabel(summary, index)}: ${summary.worst.label}, ${percentInDaylight(summary)}`}
                          onClick={() => setSelected(index)}
                        >
                          <span className={styles.day}>
                            {newDay ? SHORT_DAY.format(date) : index === best ? 'Best' : ''}
                          </span>
                          <span className={styles.track}>
                            <span className={styles.bar} style={{ height }} />
                          </span>
                          <span className={styles.light} aria-hidden="true">
                            <span style={{ flexGrow: 1 - summary.darkShare }} data-light="day" />
                            <span style={{ flexGrow: summary.darkShare }} data-light="night" />
                          </span>
                          <span className={styles.time}>{columnLabel(summary, index)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
                <p className={styles.legend}>
                  <span data-level="good">Dry</span>
                  <span data-level="caution">Take care</span>
                  <span data-level="danger">Hazard</span>
                  <span data-light="night">Dark share</span>
                </p>
              </section>

              {activeSummary && (
                <section className={styles.detail}>
                  <p className={styles.detailWhen}>
                    {leaveLabel(activeSummary, active)}, arrive {formatClock(activeSummary.arrival)}
                  </p>
                  <ConditionTag condition={activeSummary.worst} />
                  {verdict && <p className={styles.detailText}>{verdict.text}</p>}
                  <p className={styles.detailText}>{lightSummary(activeSummary.points)}</p>
                  <button type="button" className={styles.use} onClick={() => use(active)}>
                    {active === 0 ? 'Leave now' : `Leave at ${formatClock(activeSummary.window.departure)}`}
                  </button>
                </section>
              )}

              <p className={screen.note}>
                Driving times come from your current route; traffic at other hours is not included.
              </p>
            </>
          )
        )}
      </div>
    </div>
  );
}
