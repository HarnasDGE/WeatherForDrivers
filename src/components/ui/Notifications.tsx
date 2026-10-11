import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearNotification, selectNotification } from '@/store/slices/notificationsSlice';
import type { NotificationType } from '@/store/slices/notificationsSlice';
import Icon from './Icon';
import styles from './Notifications.module.css';

const ICONS: Record<NotificationType, string> = {
  confirm: 'check_circle',
  alert: 'warning',
  error: 'error',
  info: 'info',
};

/** How long a notification stays visible. Errors get more time to be read. */
const VISIBLE_MS: Record<NotificationType, number> = { confirm: 2200, info: 2500, alert: 3500, error: 5000 };

export default function Notifications() {
  const dispatch = useAppDispatch();
  const { message, type, id } = useAppSelector(selectNotification);
  const [visible, setVisible] = useState(false);

  // Re-runs for every new notification (`id`), even when the text is identical.
  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      dispatch(clearNotification());
    }, VISIBLE_MS[type]);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className={styles.region} role={type === 'error' ? 'alert' : 'status'}>
      {visible && message && (
        <div className={styles.toast} data-type={type}>
          <Icon name={ICONS[type]} filled size={20} className={styles.icon} />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
