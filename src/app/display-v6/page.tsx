import { DisplayExperience } from '@/components/display/DisplayExperience';
import styles from './v6-display.module.css';

/**
 * V6 migration route.
 *
 * Important: this deliberately reuses the production DisplayExperience so the
 * snapshot, queue, eligibility, privacy/safety, reactions, chimes and display
 * coordinator remain the source of truth while the V6 visual system is ported.
 * Once scene parity is verified this skin can move onto /display.
 */
export default function DisplayV6Page() {
  return (
    <div className={styles.v6Shell} data-display-variant="v6">
      <DisplayExperience />
    </div>
  );
}
