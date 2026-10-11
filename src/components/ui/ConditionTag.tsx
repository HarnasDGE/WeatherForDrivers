import type { RoadCondition } from '@/lib/shared/road-conditions';
import styles from './ConditionTag.module.css';

/** Driver-facing road condition, coloured by severity (the colour is never the only signal - the label says it). */
export default function ConditionTag({ condition }: { condition: RoadCondition }) {
  return (
    <span className={styles.tag} data-level={condition.level}>
      {condition.label}
    </span>
  );
}
