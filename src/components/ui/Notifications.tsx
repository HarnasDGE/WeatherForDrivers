import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearNotification, selectNotification } from '@/store/slices/notificationsSlice';
import type { NotificationType } from '@/store/slices/notificationsSlice';

const ICONS: Record<NotificationType, string> = {
  confirm: 'check_circle',
  alert: 'warning',
  error: 'error',
  info: 'info',
};

/** How long a notification stays visible. Errors get more time to be read. */
const VISIBLE_MS: Record<NotificationType, number> = { confirm: 2000, info: 2000, alert: 3500, error: 5000 };

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

  if (!visible || !message) return null;

  const icon = ICONS[type];
  return (
    <div id="popup-display" role={type === 'error' ? 'alert' : 'status'}>
      <span className={`popup-display-icon material-symbols-outlined ${icon}-popup`}>{icon}</span>
      <span className="popup-display-text">{message}</span>
    </div>
  );
}
