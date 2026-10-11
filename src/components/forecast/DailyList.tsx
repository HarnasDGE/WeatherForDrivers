import ConditionTag from '@/components/ui/ConditionTag';
import Icon from '@/components/ui/Icon';
import { formatTemperature, getNameDayFromDate } from '@/lib/shared/format';
import { assessRoad } from '@/lib/shared/road-conditions';
import type { DailyForecast } from '@/lib/shared/types';
import { getWeatherSymbol } from '@/lib/shared/weather-icons';
import styles from './DailyList.module.css';

const dayLabel = (index: number, date: string) => (index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : getNameDayFromDate(date));

/** Five days: road condition, temperature range (on a shared scale) and the numbers that affect driving. */
export default function DailyList({ daily }: { daily: DailyForecast }) {
  const mins = daily.temperatureMin.filter((v): v is number => v != null);
  const maxs = daily.temperatureMax.filter((v): v is number => v != null);
  const low = Math.min(...mins);
  const span = Math.max(1, Math.max(...maxs) - low);

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Next 5 days</h2>
      <ol>
        {daily.time.map((date, i) => {
          const min = daily.temperatureMin[i];
          const max = daily.temperatureMax[i];
          const condition = assessRoad({
            weatherCode: daily.weatherCode[i],
            temperature: min,
            windGusts: daily.windGustsMax[i],
          });
          const precipitation = daily.precipitationSum[i];
          const gusts = daily.windGustsMax[i];
          return (
            <li key={date} className={styles.day}>
              <div className={styles.label}>
                <span className={styles.name}>{dayLabel(i, date)}</span>
                <ConditionTag condition={condition} />
              </div>
              <Icon name={getWeatherSymbol(daily.weatherCode[i])} size={28} className={styles.symbol} />
              <div className={styles.temps}>
                <span className={styles.range}>
                  <span className={styles.min}>{formatTemperature(min)}</span>
                  <span className={styles.track} aria-hidden="true">
                    {min != null && max != null && (
                      <span
                        className={styles.fill}
                        style={{ left: `${((min - low) / span) * 100}%`, right: `${100 - ((max - low) / span) * 100}%` }}
                      />
                    )}
                  </span>
                  <span className={styles.max}>{formatTemperature(max)}</span>
                </span>
                <span className={styles.extra}>
                  {precipitation ? `${Math.round(precipitation * 10) / 10} mm` : 'Dry'}
                  {gusts != null && `, gusts ${Math.round(gusts)} km/h`}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
