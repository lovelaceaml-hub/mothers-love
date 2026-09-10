import type { CSSProperties } from 'react';
import { EXPRESSIONS } from '@/lib/catalog';
import styles from './ExpressionDrift.module.css';

// Deterministic independent paths avoid hydration changes and synchronized motion.
const paths = [
  [6,44,32,29,-8,15,-8,-5,7,-13,-2],
  [17,57,37,37,-20,-10,8,9,-10,16,3],
  [28,35,29,23,-12,14,9,-12,-5,8,-6],
  [39,63,34,32,-24,-17,-8,14,4,6,-9],
  [50,35,28,27,-6,11,12,-14,3,-4,-7],
  [61,56,36,41,-26,-13,-9,8,8,-6,12],
  [72,35,30,31,-15,14,8,-11,-8,5,7],
  [82,63,34,25,-4,-16,-12,10,5,-2,-9],
  [93,42,29,35,-19,-9,11,-15,-4,1,-8],
];
export function ExpressionDrift({ className = '' }: { className?: string }) {
  return <div className={`${styles.field} ${className}`} aria-hidden="true" data-expression-drift>
    {EXPRESSIONS.map((expression,index) => {
      const [x,y,size,duration,delay,x1,y1,x2,y2,x3,y3] = paths[index];
      const style = { left:`${x}%`,top:`${y}%`,'--size':`${size}px`,'--duration':`${duration}s`,'--delay':`${delay}s`,'--color':expression.color,'--x1':`${x1}px`,'--y1':`${y1}px`,'--x2':`${x2}px`,'--y2':`${y2}px`,'--x3':`${x3}px`,'--y3':`${y3}px` } as CSSProperties;
      return <span className={styles.orb} style={style} key={expression.id} data-drift-orb>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/home-art/icon${expression.id}.webp`} alt="" width="40" height="40" draggable="false" />
      </span>;
    })}
  </div>;
}
