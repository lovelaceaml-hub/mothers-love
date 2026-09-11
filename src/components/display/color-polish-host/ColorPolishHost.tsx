'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchReactionCounts } from '@/components/feed/PublicFeedProvider';
import { ColorPolishRenderer } from '@/components/display/color-polish';
import { V6DisplayExperience } from '@/components/display/V6DisplayExperience';
import type { ColorPolishSnapshot } from '@/lib/color-polish/contracts';
import { validateColorPolishSnapshot } from '@/lib/color-polish/validation';
import type { DisplayMode } from '@/lib/contracts';

const POLL_MS = 5_000;
// Sits above POLL_MS so a healthy but slow read can still finish before it is
// treated as a failure. A poll that is already in flight is never aborted by
// the next scheduled tick (see the load function below); this timeout only
// protects against a request that never resolves at all.
const REQUEST_TIMEOUT_MS = 9_000;
const STALE_MS = 60_000;

type HostPhase = 'checking' | 'active' | 'disabled' | 'quiet' | 'neutral' | 'unavailable';
type Clock = { serverMs: number; performanceMs: number };

function performanceNow(): number {
  return typeof performance === 'undefined' ? 0 : performance.now();
}

function SafeDisplay({ phase }: { phase: HostPhase }) {
  const unavailable = phase === 'unavailable';
  const quiet = phase === 'quiet' || phase === 'neutral';
  return (
    <main
      data-testid="color-polish-safe-state"
      data-display-phase={phase}
      style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '5vw', background: '#fff9ed', color: '#303342', textAlign: 'center' }}
    >
      <section style={{ maxWidth: 720 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#a15b58' }}>The Words of Mother&apos;s Love</p>
        <h1 style={{ margin: '18px 0 10px', fontFamily: 'Georgia, serif', fontSize: 'clamp(2rem, 5vw, 4.5rem)', fontWeight: 500 }}>The display is {quiet ? 'taking a quiet moment.' : unavailable ? 'temporarily unavailable.' : 'connecting.'}</h1>
        <p style={{ margin: 0, fontSize: 'clamp(1rem, 2vw, 1.35rem)', color: '#6d6876' }}>{quiet ? 'Personal recognition content is hidden until the display mode returns to normal.' : 'The public campaign view will appear after a verified snapshot is available.'}</p>
      </section>
    </main>
  );
}

export function ColorPolishHost() {
  const [snapshot, setSnapshot] = useState<ColorPolishSnapshot | null>(null);
  const [phase, setPhase] = useState<HostPhase>('checking');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [frameGeneration, setFrameGeneration] = useState(0);
  const [lastMode, setLastMode] = useState<DisplayMode | null>(null);
  const snapshotRef = useRef<ColorPolishSnapshot | null>(null);
  const phaseRef = useRef<HostPhase>('checking');
  const cursorRef = useRef<string | null>(null);
  const requestGenerationRef = useRef(0);
  const reactionGenerationRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const lastVerifiedRef = useRef<number | null>(null);
  const clockRef = useRef<Clock>({ serverMs: Date.now(), performanceMs: performanceNow() });
  const monotonicNowRef = useRef(Date.now());
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});

  const markUnsafe = (nextPhase: HostPhase) => {
    snapshotRef.current = null;
    setSnapshot(null);
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
    setReactionCounts({});
    setFrameGeneration((value) => value + 1);
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      // A poll already in flight is left alone so a healthy but slow read can
      // finish; the next scheduled tick simply waits its turn instead of
      // aborting good progress in favor of a fresh attempt. The aborted check
      // matters in development, where React's strict-mode double effect
      // invoke mounts this effect, cleans it up (aborting the first
      // controller) and mounts it again before that first request's own
      // `finally` has run to clear the ref: without it, the guard would see
      // a stale, already-aborted controller and skip starting a new request
      // at all, leaving the display stuck until the next scheduled tick.
      if (controllerRef.current && !controllerRef.current.signal.aborted) return;
      const generation = ++requestGenerationRef.current;
      const controller = new AbortController();
      controllerRef.current = controller;
      const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const after = cursorRef.current;
      try {
        const path = after ? `/api/display/color-polish?after=${encodeURIComponent(after)}` : '/api/display/color-polish';
        const response = await fetch(path, { method: 'GET', cache: 'no-store', credentials: 'omit', headers: { accept: 'application/json' }, signal: controller.signal });
        if (!response.ok) throw new Error(`SNAPSHOT_${response.status}`);
        const next = validateColorPolishSnapshot(await response.json());
        if (!next) throw new Error('INVALID_SNAPSHOT');
        if (!mounted || generation !== requestGenerationRef.current) return;
        if (snapshotRef.current && next.revision < snapshotRef.current.revision) return;
        const serverMs = Date.parse(next.serverTime);
        const receivedPerformanceMs = performanceNow();
        clockRef.current = { serverMs, performanceMs: receivedPerformanceMs };
        monotonicNowRef.current = Math.max(monotonicNowRef.current, serverMs);
        cursorRef.current = next.cursor;
        lastVerifiedRef.current = receivedPerformanceMs;
        setLastMode(next.settings.mode);
        if (next.settings.mode === 'quiet' || next.settings.mode === 'neutral') {
          snapshotRef.current = null;
          setSnapshot(null);
          phaseRef.current = next.settings.mode;
          setPhase(next.settings.mode);
          setReactionCounts({});
          setFrameGeneration((value) => value + 1);
          return;
        }
        snapshotRef.current = next;
        setSnapshot(next);
        const nextPhase: HostPhase = next.presentation.enabled ? 'active' : 'disabled';
        phaseRef.current = nextPhase;
        setPhase(nextPhase);
      } catch {
        if (!mounted || generation !== requestGenerationRef.current) return;
        if (!snapshotRef.current) {
          phaseRef.current = 'unavailable';
          setPhase('unavailable');
        }
      } finally {
        window.clearTimeout(timeout);
        if (controllerRef.current === controller) controllerRef.current = null;
      }
    };

    void load();
    const poll = window.setInterval(() => void load(), POLL_MS);
    const visibility = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      mounted = false;
      ++requestGenerationRef.current;
      controllerRef.current?.abort();
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  useEffect(() => {
    const tick = () => {
      const next = Math.max(monotonicNowRef.current, clockRef.current.serverMs + Math.max(0, performanceNow() - clockRef.current.performanceMs));
      monotonicNowRef.current = next;
      setNowMs(next);
      const verifiedAt = lastVerifiedRef.current;
      if (verifiedAt !== null && performanceNow() - verifiedAt >= STALE_MS && snapshotRef.current) {
        cursorRef.current = null;
        markUnsafe('unavailable');
      }
    };
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, []);

  const eligibleIds = useMemo(() => {
    if (phase !== 'active' || !snapshot) return [];
    return snapshot.recognitions.filter((record) => Date.parse(record.expiresAt) > nowMs).map((record) => record.id);
  }, [nowMs, phase, snapshot]);
  const reactionSignature = eligibleIds.join('\u001f');

  useEffect(() => {
    const ids = reactionSignature ? reactionSignature.split('\u001f') : [];
    const generation = ++reactionGenerationRef.current;
    const controller = new AbortController();
    if (!ids.length) {
      setReactionCounts({});
      return () => controller.abort();
    }
    const load = async () => {
      try {
        const chunks = Array.from({ length: Math.ceil(ids.length / 30) }, (_, index) => ids.slice(index * 30, index * 30 + 30));
        const responses = await Promise.all(chunks.map((chunk) => fetchReactionCounts(chunk, controller.signal)));
        if (generation !== reactionGenerationRef.current) return;
        const next: Record<string, number> = {};
        for (const response of responses) for (const [id, item] of response) next[id] = item.count;
        setReactionCounts(next);
      } catch {
        if (generation === reactionGenerationRef.current) setReactionCounts({});
      }
    };
    void load();
    return () => controller.abort();
  }, [reactionSignature]);

  if (phase === 'active' && snapshot) {
    return <div data-testid="color-polish-display" data-display-phase={phase} style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#fff9ed' }}><ColorPolishRenderer key={`active-${frameGeneration}`} snapshot={snapshot} nowMs={nowMs} status="ready" source="live" reactionCounts={reactionCounts} /></div>;
  }
  if (phase === 'disabled' && snapshot) return <div data-testid="color-polish-display" data-display-phase={phase} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}><V6DisplayExperience /></div>;
  if (phase === 'unavailable' && lastMode !== 'quiet' && lastMode !== 'neutral') {
    return <div data-testid="color-polish-display" data-display-phase={phase} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}><V6DisplayExperience /></div>;
  }
  return <SafeDisplay phase={phase} />;
}

export default ColorPolishHost;
