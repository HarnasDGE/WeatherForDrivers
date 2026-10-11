import { useState } from 'react';
import type { SubmitEvent } from 'react';
import Icon from '@/components/ui/Icon';
import PlaceSuggestionList from '@/components/ui/PlaceSuggestionList';
import { useCurrentPlace } from '@/hooks/useCurrentPlace';
import { usePlaceSuggestions } from '@/hooks/usePlaceSuggestions';
import type { Place } from '@/lib/shared/types';
import styles from './PlaceSearch.module.css';

interface PlaceSearchProps {
  onPick: (place: Place) => void;
  /** Enter without picking a suggestion. */
  onSubmitText: (text: string) => void;
}

export default function PlaceSearch({ onPick, onSubmitText }: PlaceSearchProps) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const { places } = usePlaceSuggestions(text);
  const here = useCurrentPlace();

  const pick = (place: Place) => {
    setText('');
    (document.activeElement as HTMLElement | null)?.blur();
    onPick(place);
  };

  const locateMe = async () => {
    const place = await here.locate();
    if (place) pick(place);
  };

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (places[0]) pick(places[0]);
    else if (text.trim()) {
      onSubmitText(text);
      setText('');
    }
  };

  return (
    <form className={styles.search} role="search" onSubmit={submit}>
      <label className={styles.field}>
        <Icon name="search" className={styles.icon} />
        <span className="visually-hidden">Town</span>
        <input
          value={text}
          placeholder="Search a town"
          autoComplete="off"
          enterKeyHint="search"
          aria-controls="forecast-suggestions"
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </label>
      {here.supported && (
        <button type="button" className={styles.locate} onClick={locateMe} disabled={here.locating}>
          <Icon name="my_location" />
          {here.locating ? 'Locating...' : 'Use my location'}
        </button>
      )}
      {focused && places.length > 0 && (
        <div className={styles.dropdown}>
          <PlaceSuggestionList id="forecast-suggestions" places={places} onPick={pick} />
        </div>
      )}
    </form>
  );
}
