import { formatDayTime } from '@/lib/shared/format';
import { warningName } from '@/lib/shared/route-warnings';
import type { RouteWarning, WarningStretch } from '@/lib/shared/types';
import styles from './OfficialWarnings.module.css';

const km = (meters: number) => Math.round(meters / 1000);

const stretchText = (s: WarningStretch) =>
  km(s.fromMeters) === km(s.toMeters) ? `around km ${km(s.fromMeters)}` : `km ${km(s.fromMeters)} to ${km(s.toMeters)}`;

/** Official IMGW-PIB warnings on the route: one row per warning, details on tap. Renders nothing when there are none. */
export default function OfficialWarnings({ warnings }: { warnings: RouteWarning[] }) {
  if (warnings.length === 0) return null;
  const sampleOnly = warnings.every((w) => w.sample);
  return (
    <section className={styles.warnings} aria-labelledby="official-warnings">
      <h3 id="official-warnings" className={styles.title}>
        Official warnings
      </h3>
      <ul className={styles.list}>
        {warnings.map((warning) => (
          <li key={warning.id}>
            <details className={styles.warning}>
              <summary className={styles.summary}>
                <span className={styles.level} data-level={warning.level}>
                  <span className="visually-hidden">Level </span>
                  {warning.level}
                </span>
                <span className={styles.what}>
                  <span className={styles.name}>{warningName(warning)}</span>
                  <span className={styles.when}>
                    {formatDayTime(warning.validFrom)} to {formatDayTime(warning.validTo)}
                  </span>
                </span>
                <span className={styles.where}>{warning.stretches.map(stretchText).join(', ')}</span>
              </summary>
              <div className={styles.body}>
                <p>{warning.description}</p>
                <p className={styles.meta}>
                  {warning.eventLabel && `${warning.event}. `}
                  {warning.probability !== null && `Probability ${warning.probability}%. `}
                  {warning.areas.length > 0 && `Counties: ${warning.areas.join(', ')}.`}
                </p>
              </div>
            </details>
          </li>
        ))}
      </ul>
      <p className={styles.source}>
        {sampleOnly ? 'Sample warning for the demo, not from IMGW-PIB.' : 'Source: IMGW-PIB'}
      </p>
    </section>
  );
}
