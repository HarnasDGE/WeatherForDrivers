import { useEffect, useRef, useState } from 'react';
import type { SubmitEvent } from 'react';
import Icon from '@/components/ui/Icon';
import PlaceSuggestionList from '@/components/ui/PlaceSuggestionList';
import { useCurrentPlace } from '@/hooks/useCurrentPlace';
import { usePlaceSuggestions } from '@/hooks/usePlaceSuggestions';
import type { PlaceInput } from '@/lib/client/api';
import { ROUTE_TYPES } from '@/lib/shared/types';
import type { Place, RouteType } from '@/lib/shared/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectControlPoints,
  selectDeparture,
  selectFavoriteRoutes,
  selectRouteData,
  selectRouteQuery,
  selectRouteType,
  setControlPoints,
  setDeparture,
  setRouteType,
} from '@/store/slices/routeSlice';
import type { FavoriteRoute } from '@/store/slices/routeSlice';
import DeparturePicker from './DeparturePicker';
import styles from './TripPlanner.module.css';

const ROUTE_TYPE_LABELS: Record<RouteType, string> = {
  fastest: 'Fastest',
  shortest: 'Shortest',
  eco: 'Eco',
  thrilling: 'Winding',
};

/** How many weather checkpoints to put on the route (TomTom calls grow with it). */
const CHECKPOINT_PRESETS = [
  { label: 'Fewer', value: 4 },
  { label: 'Standard', value: 7 },
  { label: 'More', value: 12 },
] as const;

const nearestPreset = (value: number) =>
  CHECKPOINT_PRESETS.reduce((best, p) => (Math.abs(p.value - value) < Math.abs(best.value - value) ? p : best)).value;

/** A field holds typed text, plus the place when one was picked from the suggestions. */
interface FieldValue {
  text: string;
  place: Place | null;
}

const toInput = ({ text, place }: FieldValue): PlaceInput => (place && place.name === text ? place : text);

interface TripPlannerProps {
  onClose: () => void;
  onSubmit: (from: PlaceInput, to: PlaceInput) => void;
  onPickSaved: (favorite: FavoriteRoute) => void;
}

/** Full-screen trip form: start, destination (with suggestions), route type and checkpoint density. */
export default function TripPlanner({ onClose, onSubmit, onPickSaved }: TripPlannerProps) {
  const dispatch = useAppDispatch();
  const query = useAppSelector(selectRouteQuery);
  const routeData = useAppSelector(selectRouteData);
  const routeType = useAppSelector(selectRouteType);
  const controlPoints = useAppSelector(selectControlPoints);
  const saved = useAppSelector(selectFavoriteRoutes);
  const departure = useAppSelector(selectDeparture);

  const [from, setFrom] = useState<FieldValue>(() => ({
    text: query.from,
    place: routeData?.from.name === query.from ? routeData.from : null,
  }));
  const [to, setTo] = useState<FieldValue>(() => ({
    text: query.to,
    place: routeData?.to.name === query.to ? routeData.to : null,
  }));
  const [active, setActive] = useState<'from' | 'to' | null>(null);
  const here = useCurrentPlace();
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);

  const activeText = active === 'from' ? from.text : active === 'to' ? to.text : '';
  const { places } = usePlaceSuggestions(activeText);
  const activePlace = active === 'from' ? from.place : active === 'to' ? to.place : null;
  const showSuggestions = active !== null && places.length > 0 && activePlace?.name !== activeText;

  useEffect(() => {
    (query.from ? toRef : fromRef).current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (place: Place) => {
    if (active === 'from') {
      setFrom({ text: place.name, place });
      toRef.current?.focus();
    } else if (active === 'to') {
      setTo({ text: place.name, place });
      setActive(null);
      toRef.current?.blur();
    }
  };

  const locateMe = async () => {
    const place = await here.locate();
    if (!place) return;
    setFrom({ text: place.name, place });
    toRef.current?.focus();
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(toInput(from), toInput(to));
  };

  return (
    <div className={styles.planner} role="dialog" aria-modal="true" aria-labelledby="planner-title">
      <form className={styles.form} onSubmit={submit}>
        <header className={styles.header}>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">
            <Icon name="arrow_back" />
          </button>
          <h1 id="planner-title" className={styles.title}>
            Plan your route
          </h1>
        </header>

        <div className={styles.fields}>
          <div className={styles.ends}>
            <label className={styles.field} data-kind="start">
              <span className="visually-hidden">Start</span>
              <input
                ref={fromRef}
                value={from.text}
                placeholder="Starting point"
                autoComplete="off"
                enterKeyHint="next"
                aria-controls="planner-suggestions"
                onFocus={() => setActive('from')}
                onChange={(e) => setFrom({ text: e.target.value, place: null })}
              />
              {here.supported && (
                <button
                  type="button"
                  className={styles.locate}
                  onClick={locateMe}
                  disabled={here.locating}
                  aria-busy={here.locating}
                  aria-label="Use my location"
                  title="Use my location"
                >
                  <Icon name="my_location" />
                </button>
              )}
            </label>
            <label className={styles.field} data-kind="finish">
              <span className="visually-hidden">Destination</span>
              <input
                ref={toRef}
                value={to.text}
                placeholder="Where to?"
                autoComplete="off"
                enterKeyHint="go"
                aria-controls="planner-suggestions"
                onFocus={() => setActive('to')}
                onChange={(e) => setTo({ text: e.target.value, place: null })}
              />
            </label>
          </div>
          <button type="button" className={styles.iconButton} onClick={swap} aria-label="Swap start and destination">
            <Icon name="swap_vert" />
          </button>
        </div>

        <div className={styles.scroll}>
          {showSuggestions ? (
            <PlaceSuggestionList id="planner-suggestions" places={places} onPick={pick} />
          ) : (
            <>
              <DeparturePicker value={departure} onChange={(value) => dispatch(setDeparture(value))} />

              <fieldset className={styles.choice}>
                <legend>Route</legend>
                <div className={styles.chips}>
                  {ROUTE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={styles.chip}
                      aria-pressed={type === routeType}
                      onClick={() => dispatch(setRouteType(type))}
                    >
                      {ROUTE_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className={styles.choice}>
                <legend>Weather checkpoints</legend>
                <div className={styles.chips}>
                  {CHECKPOINT_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      className={styles.chip}
                      aria-pressed={preset.value === nearestPreset(controlPoints)}
                      onClick={() => dispatch(setControlPoints(preset.value))}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {saved.length > 0 && (
                <section className={styles.saved}>
                  <h2>Saved routes</h2>
                  <ul>
                    {saved.map((favorite) => (
                      <li key={favorite.savedAt}>
                        <button type="button" className={styles.savedItem} onClick={() => onPickSaved(favorite)}>
                          <Icon name="bookmark" filled className={styles.savedIcon} />
                          <span>
                            {favorite.from.name} to {favorite.to.name}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>

        <footer className={styles.footer}>
          <button type="submit" className={styles.submit}>
            Check route
          </button>
        </footer>
      </form>
    </div>
  );
}
