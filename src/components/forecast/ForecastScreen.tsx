import { useEffect } from 'react';
import Icon from '@/components/ui/Icon';
import type { Place } from '@/lib/shared/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectForecast,
  selectIsPlaceSaved,
  selectPlace,
  selectSavedPlaces,
  selectWeatherStatus,
  toggleSavedPlace,
} from '@/store/slices/weatherSlice';
import { loadPlace, searchPlace } from '@/store/thunks';
import CurrentConditions from './CurrentConditions';
import DailyList from './DailyList';
import HourlyStrip from './HourlyStrip';
import PlaceSearch from './PlaceSearch';
import { hourSlot, currentHourIndex, nextHours } from './forecastData';
import styles from './ForecastScreen.module.css';

const placeDetails = (place: Place) => [place.admin1, place.country].filter(Boolean).join(', ');

/** "Forecast" tab: a town's conditions now, the next 24 hours and five days, read for driving. */
export default function ForecastScreen() {
  const dispatch = useAppDispatch();
  const place = useAppSelector(selectPlace);
  const forecast = useAppSelector(selectForecast);
  const status = useAppSelector(selectWeatherStatus);
  const saved = useAppSelector(selectSavedPlaces);
  const isSaved = useAppSelector(selectIsPlaceSaved);

  // The stored forecast may be hours old - refresh it when the tab opens.
  useEffect(() => {
    if (place) void dispatch(loadPlace(place));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.screen}>
      <div className={styles.column}>
        <div className={styles.top}>
          <PlaceSearch
            onPick={(picked) => void dispatch(loadPlace(picked))}
            onSubmitText={(text) => void dispatch(searchPlace(text))}
          />
          {saved.length > 0 && (
            <ul className={styles.saved} aria-label="Saved places">
              {saved.map((p) => (
                <li key={`${p.lat},${p.lon}`}>
                  <button
                    type="button"
                    className={styles.chip}
                    aria-pressed={p.lat === place?.lat && p.lon === place?.lon}
                    onClick={() => void dispatch(loadPlace(p))}
                  >
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {place && forecast ? (
          <article className={styles.place} aria-busy={status === 'loading'}>
            <header className={styles.header}>
              <div>
                <h1 className={styles.name}>{place.name}</h1>
                {placeDetails(place) && <p className={styles.details}>{placeDetails(place)}</p>}
              </div>
              <button
                type="button"
                className={styles.save}
                aria-pressed={isSaved}
                aria-label={isSaved ? `Remove ${place.name} from saved` : `Save ${place.name}`}
                onClick={() => dispatch(toggleSavedPlace())}
              >
                <Icon name="bookmark" filled={isSaved} />
              </button>
            </header>
            <CurrentConditions slot={hourSlot(forecast, currentHourIndex(forecast))} />
            <HourlyStrip slots={nextHours(forecast, 24)} />
            <DailyList daily={forecast.daily} />
            <p className={styles.source}>
              Forecast from{' '}
              <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
                Open-Meteo
              </a>
              .
            </p>
          </article>
        ) : status === 'loading' ? (
          <p className={styles.status} role="status">
            Loading the forecast
          </p>
        ) : (
          <div className={styles.empty}>
            <h1 className={styles.emptyTitle}>Check a town before you go</h1>
            <p>Search for any town to see the next five days, and what the weather means for the roads there.</p>
          </div>
        )}
      </div>
    </div>
  );
}
