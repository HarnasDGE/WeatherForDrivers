import ConditionTag from '@/components/ui/ConditionTag';
import Icon from '@/components/ui/Icon';
import { formatTemperature } from '@/lib/shared/format';
import { assessRoad } from '@/lib/shared/road-conditions';
import { getWeatherDescription, getWeatherSymbol } from '@/lib/shared/weather-icons';
import type { HourSlot } from './forecastData';
import styles from './CurrentConditions.module.css';

const formatVisibility = (metres: number | null) =>
  metres == null ? '--' : metres >= 10_000 ? '10+ km' : metres >= 1000 ? `${Math.round(metres / 1000)} km` : `${Math.round(metres)} m`;

const orDash = (value: number | null, unit: string) => (value == null ? '--' : `${Math.round(value)} ${unit}`);

/** This hour, with the four numbers that matter on the road. */
export default function CurrentConditions({ slot }: { slot: HourSlot }) {
  const condition = assessRoad({
    weatherCode: slot.weatherCode,
    temperature: slot.temperature,
    windGusts: slot.windGusts,
    visibility: slot.visibility,
    dewPoint: slot.dewPoint,
    surfaceTemperature: slot.surfaceTemperature,
  });

  return (
    <section className={styles.now} aria-label="Now">
      <div className={styles.headline}>
        <span className={styles.temp}>{formatTemperature(slot.temperature)}</span>
        <span className={styles.sky}>
          <Icon name={getWeatherSymbol(slot.weatherCode, slot.isDay)} size={36} />
          <span>{getWeatherDescription(slot.weatherCode)}</span>
        </span>
      </div>
      <ConditionTag condition={condition} />
      <dl className={styles.stats}>
        <div>
          <dt>
            <Icon name="air" size={18} /> Gusts
          </dt>
          <dd>{orDash(slot.windGusts, 'km/h')}</dd>
        </div>
        <div>
          <dt>
            <Icon name="visibility" size={18} /> Visibility
          </dt>
          <dd>{formatVisibility(slot.visibility)}</dd>
        </div>
        <div>
          <dt>
            <Icon name="device_thermostat" size={18} /> Road surface
          </dt>
          <dd>{formatTemperature(slot.surfaceTemperature)}</dd>
        </div>
        <div>
          <dt>
            <Icon name="umbrella" size={18} /> Rain chance
          </dt>
          <dd>{orDash(slot.precipitationProbability, '%')}</dd>
        </div>
      </dl>
    </section>
  );
}
