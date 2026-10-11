import { useState } from 'react';
import styles from './TripPlanner.module.css';

/** Planning window - matches the server limit (forecasts get coarse beyond it). */
const DAYS_AHEAD = 3;
const STEP_MINUTES = 15;

const pad2 = (n: number) => String(n).padStart(2, '0');
const dayLabel = (offset: number, date: Date) =>
  offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : date.toLocaleDateString('en-GB', { weekday: 'long' });

/** Next full quarter hour at least `minutes` from now. */
function defaultLater(minutes = 60): Date {
  const date = new Date(Date.now() + minutes * 60_000);
  date.setMinutes(Math.ceil(date.getMinutes() / STEP_MINUTES) * STEP_MINUTES, 0, 0);
  return date;
}

interface DeparturePickerProps {
  /** ISO departure, null = now. */
  value: string | null;
  onChange: (value: string | null) => void;
}

/** "Now" or a day + time within the next three days. */
export default function DeparturePicker({ value, onChange }: DeparturePickerProps) {
  const later = value !== null;
  const date = value ? new Date(value) : defaultLater();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOffset = Math.round(
    (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - today.getTime()) / 86_400_000,
  );
  const [time, setTime] = useState(`${pad2(date.getHours())}:${pad2(date.getMinutes())}`);
  const inPast = later && date.getTime() < Date.now();

  const compose = (offset: number, hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    const next = new Date(today);
    next.setDate(today.getDate() + offset);
    next.setHours(h || 0, m || 0, 0, 0);
    onChange(next.toISOString());
  };

  return (
    <fieldset className={styles.choice}>
      <legend>Leave</legend>
      <div className={styles.chips}>
        <button type="button" className={styles.chip} aria-pressed={!later} onClick={() => onChange(null)}>
          Now
        </button>
        <button
          type="button"
          className={styles.chip}
          aria-pressed={later}
          onClick={() => {
            if (later) return;
            const next = defaultLater();
            setTime(`${pad2(next.getHours())}:${pad2(next.getMinutes())}`);
            onChange(next.toISOString());
          }}
        >
          Later
        </button>
      </div>
      {later && (
        <div className={styles.when}>
          <div className={styles.chips} role="group" aria-label="Day">
            {Array.from({ length: DAYS_AHEAD }, (_, offset) => {
              const day = new Date(today);
              day.setDate(today.getDate() + offset);
              return (
                <button
                  key={offset}
                  type="button"
                  className={styles.chip}
                  aria-pressed={offset === dayOffset}
                  onClick={() => compose(offset, time)}
                >
                  {dayLabel(offset, day)}
                </button>
              );
            })}
          </div>
          <label className={styles.timeField}>
            <span>At</span>
            <input
              type="time"
              step={STEP_MINUTES * 60}
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                if (e.target.value) compose(Math.max(0, dayOffset), e.target.value);
              }}
            />
          </label>
          {inPast && <p className={styles.hint}>That time has passed. The route will be checked for now.</p>}
        </div>
      )}
    </fieldset>
  );
}
