import type { CSSProperties } from 'react';
import styles from './ExpressiveMotion.module.css';
export function ExpressiveMotion({ motion = 'lively', screen = 'garden', eventKey = screen }: { motion?: 'still' | 'calm' | 'standard' | 'lively'; screen?: string; eventKey?: string }) {
  const arrival = screen === 'arrival';
  return <div key={eventKey} className={styles.atmosphere} data-motion={motion} data-scene={screen} aria-hidden="true">
    {Array.from({ length: arrival ? 9 : 4 }, (_, i) => <span key={i} className={`${styles.traveler} ${arrival && i % 3 === 0 ? styles.heart : styles.star}`} style={{
      '--x': `${arrival ? 47 + i % 3 * 3 : 76 + i * 4}%`, '--y': arrival ? '58%' : '13%',
      '--dx': `${(i - (arrival ? 4 : 1.5)) * (arrival ? 22 : 12)}px`, '--dy': `${-30 - i % 3 * 22}px`,
      '--delay': `${i * .13}s`, '--size': `${arrival ? 13 + i % 3 * 3 : 10 + i % 2 * 3}px`,
    } as CSSProperties}>{arrival && i % 3 === 0 ? '♥' : '✦'}</span>)}
  </div>;
}
