import { useEffect, useState } from 'react';
import { fetchPlaces } from '@/lib/client/api';
import type { Place } from '@/lib/shared/types';

const DEBOUNCE_MS = 250;
const MIN_LENGTH = 2;

/** Debounced place suggestions for a search text (stale responses are ignored). */
export function usePlaceSuggestions(query: string): { places: Place[]; loading: boolean } {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const text = query.trim();
    if (text.length < MIN_LENGTH) {
      setPlaces([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      fetchPlaces(text, 6)
        .then((result) => !cancelled && setPlaces(result))
        .catch(() => !cancelled && setPlaces([]))
        .finally(() => !cancelled && setLoading(false));
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  return { places, loading };
}
