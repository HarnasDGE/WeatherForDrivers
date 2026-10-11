import Icon from '@/components/ui/Icon';
import { formatLocalTime, formatTemperature } from '@/lib/shared/format';
import { assessRoad } from '@/lib/shared/road-conditions';
import { getWeatherSymbol } from '@/lib/shared/weather-icons';
import type { HourSlot } from './forecastData';
import styles from './HourlyStrip.module.css';

/** Horizontally scrolling hours; the bar under each hour carries its road condition. */
export default function HourlyStrip({ slots }: { slots: HourSlot[] }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Next 24 hours</h2>
      <ol className={styles.strip}>
        {slots.map((slot, index) => {
          const condition = assessRoad({
            weatherCode: slot.weatherCode,
            temperature: slot.temperature,
            windGusts: slot.windGusts,
            visibility: slot.visibility,
          });
          return (
            <li key={slot.time} className={styles.hour} data-level={condition.level} title={condition.label}>
              <span className={styles.time}>{index === 0 ? 'Now' : formatLocalTime(slot.time)}</span>
              <Icon name={getWeatherSymbol(slot.weatherCode, slot.isDay)} size={26} />
              <span className={styles.temp}>{formatTemperature(slot.temperature)}</span>
              <span className={styles.rain}>
                {slot.precipitationProbability ? `${Math.round(slot.precipitationProbability)}%` : ''}
              </span>
              <span className="visually-hidden">{condition.label}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
