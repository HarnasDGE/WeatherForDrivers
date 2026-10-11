import Icon from '@/components/ui/Icon';
import { formatClock } from '@/lib/shared/format';
import type { RadarFrame } from '@/lib/shared/types';
import type { RadarStatus } from '@/hooks/useRadar';
import styles from './RadarToggle.module.css';

interface RadarToggleProps {
  on: boolean;
  frame: RadarFrame | null;
  status: RadarStatus;
  onToggle: () => void;
}

/** Floating chip on the Drive map: switches the rain radar on / off and shows how fresh the picture is. */
export default function RadarToggle({ on, frame, status, onToggle }: RadarToggleProps) {
  const time = on && frame ? formatClock(frame.time) : null;
  return (
    <button
      type="button"
      className={styles.toggle}
      aria-pressed={on}
      data-status={on ? status : 'idle'}
      onClick={onToggle}
    >
      <Icon name="radar" size={22} />
      <span>{time ? `Radar ${time}` : 'Radar'}</span>
      {on && status === 'failed' && <span className="visually-hidden">(unavailable right now)</span>}
    </button>
  );
}
