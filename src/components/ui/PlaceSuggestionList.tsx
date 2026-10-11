import type { Place } from '@/lib/shared/types';
import Icon from './Icon';
import styles from './PlaceSuggestionList.module.css';

const placeDetails = (place: Place) => [place.admin1, place.country].filter(Boolean).join(', ');

interface PlaceSuggestionListProps {
  id: string;
  places: Place[];
  onPick: (place: Place) => void;
}

/** Search results under a place field; region and country tell same-named towns apart. */
export default function PlaceSuggestionList({ id, places, onPick }: PlaceSuggestionListProps) {
  return (
    <ul id={id} className={styles.list} role="listbox">
      {places.map((place) => (
        <li key={`${place.lat},${place.lon}`} role="option" aria-selected={false}>
          <button
            type="button"
            className={styles.item}
            // Keep focus in the field until the click lands (blur would hide the list first).
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(place)}
          >
            <Icon name="location_on" className={styles.icon} />
            <span className={styles.text}>
              <span className={styles.name}>{place.name}</span>
              <span className={styles.details}>{placeDetails(place)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
