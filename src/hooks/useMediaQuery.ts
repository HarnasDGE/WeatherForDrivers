import { useEffect, useState } from 'react';

/** Live `window.matchMedia(query).matches` (client-only islands, so the initial read is safe). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export const DESKTOP_QUERY = '(min-width: 900px)';
export const DARK_QUERY = '(prefers-color-scheme: dark)';
