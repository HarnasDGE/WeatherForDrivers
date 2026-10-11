import { useAppDispatch } from '@/store/hooks';
import { setTab } from '@/store/slices/uiSlice';
import styles from './NeedsRoute.module.css';

interface NeedsRouteProps {
  title: string;
  text: string;
}

/** Empty state for screens that work on the current route. */
export default function NeedsRoute({ title, text }: NeedsRouteProps) {
  const dispatch = useAppDispatch();
  return (
    <div className={styles.empty}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.text}>{text}</p>
      <button type="button" className={styles.plan} onClick={() => dispatch(setTab('drive'))}>
        Plan a route
      </button>
    </div>
  );
}
