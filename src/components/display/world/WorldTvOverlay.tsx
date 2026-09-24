"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import type { Recognition } from "@/lib/contracts";
import { tickerItems } from "./art/tv-page";
import type { WorldZone } from "./world-data";
import { TrustedQR } from "./WorldContent";
import styles from "./WorldTv.module.css";

/** Ticker speed on a 1080 line screen, pixels a second: slow enough to read a name and a line. */
const TICKER_SPEED = 70;

/**
 * The TV page's screen text (PLAN-01 Section 5, steps 6 to 8): the heart logo with the place
 * title and its short line top left, "Live recognitions" top right, the QR code to share a
 * recognition, and the glass ticker along the whole bottom of the screen.
 *
 * Every personal word here comes from the same records the TV View shows; nothing renders
 * unless the feed is safe, and the ticker empties with it. Fictional sample content is never
 * labelled live: it reads "Sample recognitions" with no live dot (Plan 28 Section 8).
 *
 * In still or reduced motion the ticker is left out: a row that cannot move would cut every
 * message past the screen's edge, and no message is ever clipped. The bubbles keep every word.
 */
export function WorldTvOverlay({
  zone,
  traveling,
  arriving,
  safe,
  sample,
  records,
  fresh,
  reduced,
}: {
  zone: WorldZone;
  traveling: boolean;
  /** A new recognition is being presented at the arrival stage, away from the tour's place. */
  arriving: boolean;
  safe: boolean;
  sample: boolean;
  records: readonly Recognition[];
  /** Records that arrived in the last 90 s, newest last. */
  fresh: readonly string[];
  reduced: boolean;
}) {
  return (
    <>
      <header className={styles.header}>
        <div className={styles.place}>
          <span className={styles.logo} aria-hidden="true">♡</span>
          <div>
            <h1>{arriving ? "A new recognition" : zone.name}</h1>
            <p>{arriving ? "A new light in our world" : traveling ? "On the way" : zone.caption}</p>
          </div>
        </div>
        <div className={styles.live}>
          {!sample && <span className={styles.liveDot} aria-hidden="true" />}
          {sample ? "Sample recognitions" : "Live recognitions"}
          {sample && <small>Fictional sample</small>}
        </div>
      </header>
      <div className={styles.share}>
        <TrustedQR url="https://mothers-love.vercel.app/recognize" label="Share a recognition" />
      </div>
      {safe && !reduced && <Ticker records={records} fresh={fresh} sample={sample} />}
    </>
  );
}

function Ticker({ records, fresh, sample }: { records: readonly Recognition[]; fresh: readonly string[]; sample: boolean }) {
  // Newest first; the latest arrivals lead, newest of them first, and carry a "New" mark.
  const items = useMemo(() => {
    const all = tickerItems(records);
    const freshSet = new Set(fresh);
    const lead = [...fresh].reverse().map((id) => all.find((item) => item.id === id)).filter((item) => item !== undefined);
    return [...lead, ...all.filter((item) => !freshSet.has(item.id))].map((item) => ({ ...item, fresh: freshSet.has(item.id) }));
  }, [records, fresh]);
  const [duration, setDuration] = useState(60);
  // A callback ref, so the observer follows the track through every remount below.
  const observer = useRef<ResizeObserver | null>(null);
  const track = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node) return;
    const measure = () => setDuration(Math.max(20, node.scrollWidth / 2 / TICKER_SPEED));
    measure();
    observer.current = new ResizeObserver(measure);
    observer.current.observe(node);
  }, []);
  // Restart the loop from the front whenever a new arrival leads, so it is seen at once.
  const leadKey = items[0]?.fresh ? items[0].id : "steady";
  if (!items.length) return null;
  const row = (copy: number) =>
    items.map((item) => (
      <span key={`${copy}:${item.id}`} className={styles.item} aria-hidden={copy > 0 || undefined}>
        {item.fresh && <span className={styles.fresh}>New</span>}
        <span className={styles.heart} aria-hidden="true">♥</span>
        <strong>{item.recipient}</strong>
        <span className={styles.message}>{item.message}</span>
      </span>
    ));
  return (
    <section className={styles.ticker} aria-label={sample ? "Sample recognitions" : "Live recognitions"}>
      <div
        key={leadKey}
        ref={track}
        className={styles.track}
        style={{ animationDuration: `${duration}s` }}
      >
        {row(0)}
        {row(1)}
      </div>
    </section>
  );
}
