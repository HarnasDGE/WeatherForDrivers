import { useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectThemePreference } from '@/store/slices/uiSlice';
import { DARK_QUERY, useMediaQuery } from './useMediaQuery';

export type Theme = 'light' | 'dark';

/** The theme in effect: the saved preference, or the system setting for "system". */
export function useResolvedTheme(): Theme {
  const preference = useAppSelector(selectThemePreference);
  const systemDark = useMediaQuery(DARK_QUERY);
  return preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
}

/** Keeps <html data-theme> (which switches the CSS tokens) in sync with the resolved theme. */
export function useApplyTheme(): void {
  const theme = useResolvedTheme();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#15191f' : '#ffffff');
  }, [theme]);
}
