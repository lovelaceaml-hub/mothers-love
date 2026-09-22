'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ColorPolishRenderer } from '../color-polish/renderer';
import { buildColorPolishSampleSnapshot } from '../color-polish/sample';
import styles from './TvPearlStudy.module.css';

const START = Date.parse('2026-09-09T17:24:00Z');
const PEOPLE = [
  { name: 'Alex', message: 'Thank you for noticing I needed a hand and staying to help. Your kindness made the whole day brighter.', ids: [2, 8, 9] },
  { name: 'Jordan', message: 'You listened with patience and made me feel understood. Thank you for making room for my thoughts.', ids: [6, 4] },
  { name: 'Taylor', message: 'Your encouragement helped me try again. Thank you for believing in me.', ids: [7, 9] },
];

export function TvPearlStudy() {
  const [mode, setMode] = useState<'design' | 'compare' | 'current'>('compare');
  const [playing, setPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [arrival, setArrival] = useState(0);
  const [replay, setReplay] = useState(0);
  const [capture, setCapture] = useState(false);
  const [ready, setReady] = useState(false);
  const elapsedRef = useRef(0);
  const lastRef = useRef(0);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('view') === 'design' || query.get('view') === 'current') setMode(query.get('view') as 'design' | 'current');
    setCapture(query.get('capture') === '1');
  }, []);
  useEffect(() => {
    lastRef.current = performance.now();
    if (!playing) return;
    const timer = window.setInterval(() => {
      const now = performance.now();
      if (!document.hidden) elapsedRef.current += now - lastRef.current;
      lastRef.current = now;
      setElapsed(elapsedRef.current);
    }, 100);
    return () => window.clearInterval(timer);
  }, [playing]);
  const snapshot = useMemo(() => {
    const s = buildColorPolishSampleSnapshot(START);
    s.recognitions = PEOPLE.map((p, i) => ({ ...s.recognitions[i], id: `tv-study-${i}`, recipient: p.name, message: p.message, expressionIds: p.ids, expiresAt: new Date(START + 86400000).toISOString() }));
    s.presentation.playlist = s.presentation.playlist.map(p => ({ ...p, enabled: p.id === 'garden' }));
    if (arrival) {
      const r = { ...s.recognitions[0], id: `tv-study-arrival-${arrival}`, recipient: 'Morgan', message: 'You made time to welcome me and helped me feel at home. Thank you for the warmth and kindness you shared.', expressionIds: [1, 2, 8] };
      s.recognitions.push(r);
      s.arrivals = [{ eventId: `tv-study-event-${arrival}`, recognitionId: r.id, publishedAt: new Date(START).toISOString() }];
    }
    return s;
  }, [arrival]);
  function reset() { setArrival(0); setReplay(v => v + 1); }
  return <main className={`${styles.page} ${capture ? styles.capture : ''}`}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>THE WORDS OF MOTHER'S LOVE</p><h1>A garden of gratitude.</h1><p>Live TV design study · Fictional recognitions · For your review</p></div>
      <a href="https://mothers-love.vercel.app/display" target="_blank" rel="noreferrer">Open live TV ↗</a>
    </header>
    <nav className={styles.controls} aria-label="Design review controls">
      <div className={styles.tabs}>{([['compare', 'Side by side'], ['design', 'Pearl Garden'], ['current', 'Current TV style']] as const).map(([id, label]) => <button key={id} aria-pressed={mode === id} onClick={() => setMode(id)}>{label}</button>)}</div>
      <div className={styles.actions}>
        <button disabled={!ready || arrival > 0} onClick={() => { setMode('design'); setPlaying(true); setArrival(v => v + 1); }}>Preview arrival</button>
        <button onClick={() => setPlaying(v => !v)}>{playing ? 'Pause motion' : 'Resume motion'}</button>
        <button onClick={reset}>Reset study</button>
        <button onClick={() => { if (mode === 'compare') setMode('design'); void panel.current?.requestFullscreen(); }}>Fullscreen</button>
      </div>
    </nav>
    <div ref={panel} className={`${styles.panels} ${mode === 'compare' ? styles.comparison : ''}`} data-ready={ready}>
      {mode !== 'design' && <section className={styles.panel}><p className={styles.panelLabel}>01 · CURRENT TV STYLE <span>Production source with fictional records</span></p><div className={styles.screen}><ColorPolishRenderer snapshot={snapshot} nowMs={START + elapsed} elapsedMs={elapsed} status="ready" source="sample" scene="garden" playing={playing} replayKey={replay} onReady={() => setReady(true)} /></div></section>}
      {mode !== 'current' && <section className={styles.panel}><p className={styles.panelLabel}>02 · PEARL GARDEN <span>Blender scenery · Live-rendered words</span></p><div className={styles.screen}><ColorPolishRenderer snapshot={snapshot} nowMs={START + elapsed} elapsedMs={elapsed} status="ready" source="sample" scene="garden" playing={playing} replayKey={replay} designStudy onReady={() => setReady(true)} /></div></section>}
    </div>
    <footer className={styles.notes}><p><strong>The same recognitions. A new atmosphere.</strong> Rounded ivory terraces, dimensional blossoms, fine champagne details and luminous recognition pearls.</p><p>Thank you stays at the top. The existing TV renderer handles messages, reading and arrivals. This study does not change the live TV.</p></footer>
  </main>;
}
