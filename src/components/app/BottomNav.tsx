import Icon from '@/components/ui/Icon';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectTab, setTab } from '@/store/slices/uiSlice';
import type { AppTab } from '@/store/slices/uiSlice';
import styles from './BottomNav.module.css';

const ITEMS: Array<{ tab: AppTab; label: string; icon: string }> = [
  { tab: 'drive', label: 'Drive', icon: 'directions_car' },
  { tab: 'forecast', label: 'Forecast', icon: 'partly_cloudy_day' },
];

/** Bottom tab bar on phones, a left rail on desktop. */
export default function BottomNav() {
  const dispatch = useAppDispatch();
  const current = useAppSelector(selectTab);

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
          <Icon name={icon} filled={tab === current} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
