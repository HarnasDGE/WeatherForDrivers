import Icon from '@/components/ui/Icon';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { THEME_PREFERENCES, selectTab, selectThemePreference, setTab, setTheme } from '@/store/slices/uiSlice';
import type { AppTab, ThemePreference } from '@/store/slices/uiSlice';
import styles from './BottomNav.module.css';

const ITEMS: Array<{ tab: AppTab; label: string; icon: string }> = [
  { tab: 'drive', label: 'Drive', icon: 'directions_car' },
  { tab: 'when', label: 'When', icon: 'schedule' },
  { tab: 'exposure', label: 'Sun & wind', icon: 'wb_sunny' },
  { tab: 'forecast', label: 'Forecast', icon: 'partly_cloudy_day' },
];

const THEME_ITEMS: Record<ThemePreference, { label: string; icon: string }> = {
  system: { label: 'Auto', icon: 'brightness_auto' },
  light: { label: 'Light', icon: 'light_mode' },
  dark: { label: 'Dark', icon: 'dark_mode' },
};

const nextTheme = (theme: ThemePreference) =>
  THEME_PREFERENCES[(THEME_PREFERENCES.indexOf(theme) + 1) % THEME_PREFERENCES.length];

/** Bottom tab bar on phones (docked to the edge), a left rail on desktop. Ends with the theme switch. */
export default function BottomNav() {
  const dispatch = useAppDispatch();
  const current = useAppSelector(selectTab);
  const theme = useAppSelector(selectThemePreference);

  return (
    <nav className={styles.nav} aria-label="Main">
      {ITEMS.map(({ tab, label, icon }) => (
        <button
          key={tab}
          type="button"
          className={styles.item}
          aria-current={tab === current ? 'page' : undefined}
          onClick={() => dispatch(setTab(tab))}
        >
          <span className={styles.pill}>
            <Icon name={icon} filled={tab === current} />
          </span>
          <span>{label}</span>
        </button>
      ))}
      <button
        type="button"
        className={`${styles.item} ${styles.theme}`}
        aria-label={`Theme: ${THEME_ITEMS[theme].label}. Switch to ${THEME_ITEMS[nextTheme(theme)].label}`}
        onClick={() => dispatch(setTheme(nextTheme(theme)))}
      >
        <span className={styles.pill}>
          <Icon name={THEME_ITEMS[theme].icon} />
        </span>
        <span>{THEME_ITEMS[theme].label}</span>
      </button>
    </nav>
  );
}
