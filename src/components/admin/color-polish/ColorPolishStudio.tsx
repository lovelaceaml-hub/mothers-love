'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  COLOR_POLISH_DURATIONS,
  COLOR_POLISH_SCENES,
  type ColorPolishScene,
} from '@/lib/color-polish/contracts';
import {
  ColorPolishRenderer,
  buildColorPolishSampleSnapshot,
} from '@/components/display/color-polish';

const SCENE_LABELS: Record<ColorPolishScene, string> = {
  welcome: 'Welcome',
  garden: 'Garden',
  featured: 'Featured',
  calendar: 'Calendar',
  peacemakers: 'Peacemakers',
  status: 'Status',
  expressions: 'Expressions',
  'peace-in-practice': 'Peace in practice',
  orbit: 'Orbit',
  milestone: 'Milestone',
  'live-feed': 'Live Recognitions',
};

export function ColorPolishStudio() {
  const snapshot = useMemo(() => buildColorPolishSampleSnapshot(), []);
  const [scene, setScene] = useState<ColorPolishScene>('welcome');
  const [playing, setPlaying] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [replayKey, setReplayKey] = useState(0);
  const durationMs = COLOR_POLISH_DURATIONS[scene] * 1000;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setElapsedMs((value) => Math.min(value + 100, durationMs));
    }, 100);
    return () => window.clearInterval(timer);
  }, [durationMs, playing]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the preview stops itself when its clock reaches the end
    if (elapsedMs >= durationMs && playing) setPlaying(false);
  }, [durationMs, elapsedMs, playing]);

  const selectScene = (nextScene: ColorPolishScene) => {
    setScene(nextScene);
    setElapsedMs(0);
    setPlaying(true);
    setReplayKey((value) => value + 1);
  };

  const replay = () => {
    setElapsedMs(0);
    setPlaying(true);
    setReplayKey((value) => value + 1);
  };

  return (
    <section
      data-testid="color-polish-studio"
      style={{ marginBottom: 28, border: '1px solid #e8dfd2', borderRadius: 24, padding: 20, background: '#fffaf2' }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
        <div>
          <p style={{ margin: 0, color: '#a15b58', fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Color Polish preview</p>
          <h2 style={{ margin: '7px 0 4px', color: '#303342', fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 500 }}>Sample scenes</h2>
          <p style={{ margin: 0, color: '#6d6876', fontSize: 14 }}>Preview the production renderer with fictional sample content.</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 10 }}>
          <label style={{ display: 'grid', gap: 5, color: '#6d6876', fontSize: 12, fontWeight: 700 }}>
            Scene
            <select
              aria-label="Color Polish preview scene"
              value={scene}
              onChange={(event) => selectScene(event.target.value as ColorPolishScene)}
              style={{ minWidth: 190, border: '1px solid #d9cdbd', borderRadius: 10, padding: '9px 11px', background: '#fff', color: '#303342', font: 'inherit' }}
            >
              {COLOR_POLISH_SCENES.map((id) => <option key={id} value={id}>{SCENE_LABELS[id]}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setPlaying((value) => !value)} style={{ border: '1px solid #b96c62', borderRadius: 10, padding: '10px 14px', background: '#b96c62', color: '#fff', font: 'inherit', fontWeight: 700 }}>
            {playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" onClick={replay} style={{ border: '1px solid #d9cdbd', borderRadius: 10, padding: '10px 14px', background: '#fff', color: '#303342', font: 'inherit', fontWeight: 700 }}>
            Replay
          </button>
        </div>
      </div>
      <div style={{ overflow: 'hidden', aspectRatio: '16 / 9', minHeight: 360, borderRadius: 16, background: '#fff9ed' }}>
        <ColorPolishRenderer
          key={`${scene}-${replayKey}`}
          snapshot={snapshot}
          nowMs={Date.parse(snapshot.serverTime) + elapsedMs}
          status="ready"
          source="sample"
          scene={scene}
          replayKey={replayKey}
          playing={playing}
          elapsedMs={elapsedMs}
        />
      </div>
      <p style={{ margin: '10px 0 0', color: '#6d6876', fontSize: 12 }}>
        {SCENE_LABELS[scene]} scene, {Math.floor(elapsedMs / 1000)} of {COLOR_POLISH_DURATIONS[scene]} seconds
      </p>
    </section>
  );
}

export default ColorPolishStudio;
