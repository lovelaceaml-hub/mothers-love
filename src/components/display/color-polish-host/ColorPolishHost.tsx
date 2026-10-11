'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchReactionCounts } from '@/components/feed/PublicFeedProvider';
import { COLOR_POLISH_PREVIEW_BUILD, ColorPolishRenderer } from '@/components/display/color-polish/renderer';
import { V6DisplayExperience } from '@/components/display/V6DisplayExperience';
import {
  COLOR_POLISH_DURATIONS,
  COLOR_POLISH_SCENES,
  type ColorPolishScene,
  type ColorPolishSnapshot,
} from '@/lib/color-polish/contracts';
import { validateColorPolishHeartbeat, validateColorPolishSnapshot } from '@/lib/color-polish/validation';
import type { DisplayMode } from '@/lib/contracts';
import { startVisiblePoll } from '@/lib/visible-poll';

// Poll frequently for prompt arrivals; unchanged responses now return a tiny heartbeat
// rather than the full recognition list. Never slow down delivery to save bandwidth.
const POLL_MS = 5_000;
const LIKES_TOTAL_REFRESH_MS = 10_000;
// Sits above POLL_MS so a healthy but slow read can still finish before it is
// treated as a failure. A poll that is already in flight is never aborted by
// the next scheduled tick (see the load function below); this timeout only
// protects against a request that never resolves at all.
const REQUEST_TIMEOUT_MS = 9_000;
const STALE_MS = 60_000;

type HostPhase = 'checking' | 'active' | 'disabled' | 'quiet' | 'neutral' | 'unavailable';
type Clock = { serverMs: number; performanceMs: number };

// One screen preview links, preview builds only.
//
// On a preview build /display?scene=<slug> holds the TV on one screen: the host
// reads the same live snapshot it always reads, then pins the renderer to that
// screen and restarts it when its dwell ends instead of advancing. The two
// arrival slugs replay an entrance over the pinned screen, using records that
// are already in the verified public snapshot. Nothing is written anywhere and
// no new data leaves the server.
//
// On a production build the gate below is false, parseScenePreviewRequest
// returns 'none' for every slug, and the plan carries no scene, no replayKey,
// no arrivals and no input hold, so the query string changes nothing at all.
export const ARRIVAL_PREVIEW_SLUG = 'arrival';
export const ARRIVAL_GROUP_PREVIEW_SLUG = 'arrival-group';
// beginEvent in public/color-polish/core/arrivals.js builds a group entrance
// only when five arrivals are queued at once, so the group link sends five.
export const ARRIVAL_GROUP_SIZE = 5;
export const ARRIVAL_PREVIEW_PERIOD_MS = 20_000;
// Well above any real event id in the public snapshot, so a replayed preview
// entrance can never collide with one the server actually sent.
const PREVIEW_EVENT_ID_BASE = 9_000_000_000;
const MIN_DWELL_SECONDS = 12;
const MAX_DWELL_SECONDS = 180;
const MAX_SEARCH_LENGTH = 512;

export type ScenePreviewRequest =
  | { kind: 'none' }
  | { kind: 'scene'; scene: ColorPolishScene }
  | { kind: 'arrival'; size: number };

export type ScenePreviewPlan = {
  scene?: ColorPolishScene;
  replayKey?: number;
  arrivals: ColorPolishSnapshot['arrivals'] | null;
  holdInput: boolean;
};

export function parseScenePreviewRequest(search: string | null | undefined, previewBuild: boolean): ScenePreviewRequest {
  if (previewBuild !== true) return { kind: 'none' };
  if (typeof search !== 'string' || search.length === 0 || search.length > MAX_SEARCH_LENGTH) return { kind: 'none' };
  let slug: string | null = null;
  try {
    slug = new URLSearchParams(search).get('scene');
  } catch {
    return { kind: 'none' };
  }
  if (!slug) return { kind: 'none' };
  if (slug === ARRIVAL_PREVIEW_SLUG) return { kind: 'arrival', size: 1 };
  if (slug === ARRIVAL_GROUP_PREVIEW_SLUG) return { kind: 'arrival', size: ARRIVAL_GROUP_SIZE };
  const scene = COLOR_POLISH_SCENES.find((entry) => entry === slug);
  return scene ? { kind: 'scene', scene } : { kind: 'none' };
}

export function sceneDwellSeconds(snapshot: ColorPolishSnapshot | null, scene: ColorPolishScene): number {
  const entry = snapshot?.presentation?.playlist?.find((item) => item.id === scene);
  const seconds = entry && Number.isFinite(entry.durationSeconds) ? Math.floor(entry.durationSeconds) : COLOR_POLISH_DURATIONS[scene];
  return Math.max(MIN_DWELL_SECONDS, Math.min(MAX_DWELL_SECONDS, seconds));
}

export function scenePreviewStepMs(request: ScenePreviewRequest, snapshot: ColorPolishSnapshot | null): number {
  if (request.kind === 'scene') return sceneDwellSeconds(snapshot, request.scene) * 1_000;
  return ARRIVAL_PREVIEW_PERIOD_MS;
}

export function scenePreviewCycle(elapsedMs: number, stepMs: number): number {
  const step = Number.isFinite(stepMs) && stepMs >= 1_000 ? Math.floor(stepMs) : ARRIVAL_PREVIEW_PERIOD_MS;
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return Math.floor(elapsedMs / step);
}

export function previewBaseScene(snapshot: ColorPolishSnapshot | null): ColorPolishScene {
  return snapshot?.presentation?.playlist?.find((item) => item.enabled)?.id ?? COLOR_POLISH_SCENES[0];
}

export function buildPreviewArrivals(snapshot: ColorPolishSnapshot | null, cycle: number, size: number): ColorPolishSnapshot['arrivals'] {
  if (!snapshot || !Array.isArray(snapshot.recognitions) || !Number.isSafeInteger(size) || size < 1) return [];
  // The owner's pause and the quiet and neutral modes win over a preview link.
  // The renderer and the host phase already enforce both; this is a second stop.
  if (snapshot.settings?.pauseArrivals === true || snapshot.settings?.mode !== 'normal') return [];
  const serverMs = Date.parse(snapshot.serverTime);
  if (!Number.isFinite(serverMs)) return [];
  // Only records the verified public snapshot already carries, still published
  // and not yet expired at the snapshot's own server time. Nothing is invented.
  const usable = snapshot.recognitions.flatMap((record) => {
    const expires = Date.parse(record.expiresAt);
    const publishedAt = record.firstPublishedAt;
    if (record.status !== 'published' || typeof publishedAt !== 'string' || publishedAt.length === 0) return [];
    return Number.isFinite(expires) && expires > serverMs ? [{ id: record.id, publishedAt }] : [];
  });
  if (usable.length < size) return [];
  const safeCycle = Number.isFinite(cycle) ? Math.max(0, Math.floor(cycle)) : 0;
  // Digits only, matching the shape the public snapshot uses for a real event id,
  // and distinct on every replay so the renderer treats each wave as new.
  return usable.slice(0, size).map((record, index) => ({
    eventId: String(PREVIEW_EVENT_ID_BASE + safeCycle * ARRIVAL_GROUP_SIZE + index),
    recognitionId: record.id,
    publishedAt: record.publishedAt,
  }));
}

export function planScenePreview(request: ScenePreviewRequest, snapshot: ColorPolishSnapshot | null, elapsedMs: number): ScenePreviewPlan {
  if (request.kind === 'none') return { arrivals: null, holdInput: false };
  const cycle = scenePreviewCycle(elapsedMs, scenePreviewStepMs(request, snapshot));
  if (request.kind === 'scene') {
    return { scene: request.scene, replayKey: cycle, arrivals: null, holdInput: true };
  }
  const replayed = buildPreviewArrivals(snapshot, cycle, request.size);
  // With nothing to replay the plan carries no arrivals at all, so the arrivals
  // the server sent are passed through exactly as they came.
  return { scene: previewBaseScene(snapshot), arrivals: replayed.length > 0 ? replayed : null, holdInput: true };
}

/**
 * The snapshot the renderer receives while a preview link is held. It is always
 * the fetched snapshot itself (same object) when no link is held, which is every
 * request on a production build. Otherwise it is a shallow copy that differs in
 * two places only, and the fetched object is never mutated:
 *
 * 1. A held screen is switched on in the copy's playlist, or added to it, so the
 *    link can show a screen the saved playlist has disabled or does not list yet.
 *    The renderer falls back to the first enabled screen for anything that is
 *    not an enabled playlist entry, and the owner uses these links to judge every
 *    screen, including a new one. Every screen draws from the same verified
 *    public snapshot, so this shows nothing the enabled screens could not show.
 * 2. Replayed entrances are added after the arrivals the server sent, so real
 *    entrances still play and the renderer's record of seen events stays whole.
 */
export function scenePreviewSnapshot(request: ScenePreviewRequest, plan: ScenePreviewPlan, snapshot: ColorPolishSnapshot | null): ColorPolishSnapshot | null {
  if (!snapshot || request.kind === 'none') return snapshot;
  let next = snapshot;
  if (request.kind === 'scene') {
    const held = request.scene;
    const playlist = Array.isArray(snapshot.presentation?.playlist) ? snapshot.presentation.playlist : [];
    const listed = playlist.find((entry) => entry.id === held);
    if (!listed || listed.enabled !== true) {
      const entry = { id: held, enabled: true, durationSeconds: sceneDwellSeconds(snapshot, held) };
      const others = playlist.filter((item) => item.id !== held);
      // First, so the bridge's playlist length cap can never cut it off. Order
      // does not matter while a screen is held, because nothing advances.
      next = { ...next, presentation: { ...snapshot.presentation, playlist: [entry, ...others] } };
    }
  }
  if (plan.arrivals && plan.arrivals.length > 0) {
    const sent = Array.isArray(snapshot.arrivals) ? snapshot.arrivals : [];
    next = { ...next, arrivals: [...sent, ...plan.arrivals] };
  }
  return next;
}

function performanceNow(): number {
  return typeof performance === 'undefined' ? 0 : performance.now();
}

function readLikesTotal(response: Response): number | null {
  const raw = response.headers.get('x-likes-total');
  if (!raw || !/^(0|[1-9][0-9]*)$/.test(raw)) return null;
  const total = Number(raw);
  return Number.isSafeInteger(total) ? total : null;
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
  const snapshotHashRef = useRef<string | null>(null);
  const requestGenerationRef = useRef(0);
  const reactionGenerationRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const lastVerifiedRef = useRef<number | null>(null);
  const clockRef = useRef<Clock>({ serverMs: Date.now(), performanceMs: performanceNow() });
  const monotonicNowRef = useRef(Date.now());
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  // Every like campaign wide, for the header. Summing reactionCounts would only
  // cover the latest 100 recognitions the snapshot carries.
  const [reactionTotal, setReactionTotal] = useState<number | null>(null);
  const lastLikesTotalRequestAtRef = useRef<number | null>(null);
  const forceLikesTotalRequestRef = useRef(false);

  const markUnsafe = (nextPhase: HostPhase) => {
    snapshotRef.current = null;
    snapshotHashRef.current = null;
    setSnapshot(null);
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
    setReactionCounts({});
    setReactionTotal(null);
    lastLikesTotalRequestAtRef.current = null;
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
      const requestStartedAt = performanceNow();
      const phaseMayShowLikes = phaseRef.current === 'checking' || phaseRef.current === 'active';
      const previousLikesRequestAt = lastLikesTotalRequestAtRef.current;
      const includeLikesTotal = phaseMayShowLikes && (
        forceLikesTotalRequestRef.current ||
        previousLikesRequestAt === null ||
        requestStartedAt - previousLikesRequestAt >= LIKES_TOTAL_REFRESH_MS
      );
      if (includeLikesTotal) {
        forceLikesTotalRequestRef.current = false;
        lastLikesTotalRequestAtRef.current = requestStartedAt;
      }
      try {
        const query = new URLSearchParams();
        if (after) query.set('after', after);
        if (includeLikesTotal) query.set('includeLikesTotal', '1');
        const queryString = query.toString();
        const path = queryString ? `/api/display/color-polish?${queryString}` : '/api/display/color-polish';
        // Keep the Vercel test-preview access cookie for the public snapshot read.
        const headers: Record<string, string> = { accept: 'application/json' };
        if (snapshotRef.current && snapshotHashRef.current)
          headers['If-None-Match'] = `"${snapshotHashRef.current}"`;
        const response = await fetch(path, { method: 'GET', cache: 'no-store', credentials: 'same-origin', headers, signal: controller.signal });
        if (!response.ok) throw new Error(`SNAPSHOT_${response.status}`);
        const payload: unknown = await response.json();
        if (!mounted || generation !== requestGenerationRef.current) return;
        const heartbeat = validateColorPolishHeartbeat(payload);
        if (heartbeat) {
          if (!snapshotRef.current || !snapshotHashRef.current) throw new Error('MISSING_SNAPSHOT');
          if (includeLikesTotal && phaseRef.current === 'active') {
            const total = readLikesTotal(response);
            if (total !== null) setReactionTotal(total);
          }
          const serverMs = Date.parse(heartbeat.serverTime);
          const receivedPerformanceMs = performanceNow();
          clockRef.current = { serverMs, performanceMs: receivedPerformanceMs };
          monotonicNowRef.current = Math.max(monotonicNowRef.current, serverMs);
          lastVerifiedRef.current = receivedPerformanceMs;
          return;
        }
        const next = validateColorPolishSnapshot(payload);
        if (!next) throw new Error('INVALID_SNAPSHOT');
        if (snapshotRef.current && next.revision < snapshotRef.current.revision) return;
        const serverMs = Date.parse(next.serverTime);
        const receivedPerformanceMs = performanceNow();
        clockRef.current = { serverMs, performanceMs: receivedPerformanceMs };
        monotonicNowRef.current = Math.max(monotonicNowRef.current, serverMs);
        cursorRef.current = next.cursor;
        const tag = /^"([a-f0-9]{32})"$/.exec(response.headers.get('etag') ?? '');
        snapshotHashRef.current = tag?.[1] ?? null;
        lastVerifiedRef.current = receivedPerformanceMs;
        setLastMode(next.settings.mode);
        if (next.settings.mode === 'quiet' || next.settings.mode === 'neutral') {
          snapshotRef.current = null;
          snapshotHashRef.current = null;
          setSnapshot(null);
          phaseRef.current = next.settings.mode;
          setPhase(next.settings.mode);
          setReactionCounts({});
          setReactionTotal(null);
          lastLikesTotalRequestAtRef.current = null;
          setFrameGeneration((value) => value + 1);
          return;
        }
        snapshotRef.current = next;
        setSnapshot(next);
        const nextPhase: HostPhase = next.presentation.enabled ? 'active' : 'disabled';
        phaseRef.current = nextPhase;
        setPhase(nextPhase);
        if (nextPhase === 'active') {
          if (includeLikesTotal) {
            const total = readLikesTotal(response);
            if (total !== null) setReactionTotal(total);
          }
        } else {
          setReactionTotal(null);
          lastLikesTotalRequestAtRef.current = null;
        }
      } catch {
        if (!mounted || generation !== requestGenerationRef.current) return;
        if (!snapshotRef.current) {
          snapshotHashRef.current = null;
          phaseRef.current = 'unavailable';
          setPhase('unavailable');
        }
      } finally {
        window.clearTimeout(timeout);
        if (controllerRef.current === controller) controllerRef.current = null;
      }
    };

    const stopPolling = startVisiblePoll(() => void load(), POLL_MS, () => {
      forceLikesTotalRequestRef.current = true;
      const verifiedAt = lastVerifiedRef.current;
      if (verifiedAt !== null && performanceNow() - verifiedAt >= STALE_MS && snapshotRef.current) markUnsafe('unavailable');
    });
    return () => {
      mounted = false;
      ++requestGenerationRef.current;
      controllerRef.current?.abort();
      stopPolling();
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

  // The query string is read after mount so the server rendered markup and the
  // first client render stay identical.
  const [previewSearch, setPreviewSearch] = useState<string | null>(null);
  const [previewElapsedMs, setPreviewElapsedMs] = useState(0);

  useEffect(() => {
    // Build time constant. On a production build this effect does nothing: the
    // query string is never read and no state is set.
    if (!COLOR_POLISH_PREVIEW_BUILD) return;
    setPreviewSearch(typeof window === 'undefined' ? null : window.location.search);
  }, []);

  const previewRequest = useMemo(
    () => parseScenePreviewRequest(previewSearch, COLOR_POLISH_PREVIEW_BUILD),
    [previewSearch],
  );

  // The hold and the replay run on this browser's own monotonic clock, not on
  // nowMs. nowMs follows the server time in the snapshot, so it only moves when
  // the server's clock moves; the preview cadence must not depend on that. The
  // interval only exists while a preview link is held on an active display, so
  // a production build never starts it.
  const previewActive = previewRequest.kind !== 'none' && phase === 'active';
  useEffect(() => {
    if (!previewActive) return;
    const startedAt = performanceNow();
    const tick = () => setPreviewElapsedMs(Math.max(0, performanceNow() - startedAt));
    tick();
    const timer = window.setInterval(tick, 500);
    return () => window.clearInterval(timer);
  }, [previewActive]);

  // Quantized to the hold step so the plan, and with it the renderer snapshot,
  // keeps a stable identity between restarts instead of changing every tick.
  const previewQuantizedMs = previewRequest.kind === 'none'
    ? 0
    : scenePreviewCycle(previewElapsedMs, scenePreviewStepMs(previewRequest, snapshot)) * scenePreviewStepMs(previewRequest, snapshot);
  const previewPlan = useMemo(
    () => planScenePreview(previewRequest, snapshot, previewQuantizedMs),
    [previewQuantizedMs, previewRequest, snapshot],
  );
  const previewSnapshot = useMemo(
    () => scenePreviewSnapshot(previewRequest, previewPlan, snapshot),
    [previewPlan, previewRequest, snapshot],
  );

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
      if (document.hidden) return;
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
    const visible = () => { if (!document.hidden) void load(); };
    document.addEventListener('visibilitychange', visible);
    return () => { controller.abort(); document.removeEventListener('visibilitychange', visible); };
  }, [reactionSignature]);

  if (phase === 'active' && snapshot) {
    return (
      <div
        data-testid="color-polish-display"
        data-display-phase={phase}
        {...(previewPlan.scene === undefined ? {} : { 'data-scene-hold': previewPlan.scene })}
        style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#fff9ed' }}
      >
        <ColorPolishRenderer
          key={`active-${frameGeneration}`}
          snapshot={previewSnapshot ?? snapshot}
          nowMs={nowMs}
          status="ready"
          source="live"
          reactionCounts={reactionCounts}
          reactionTotal={reactionTotal}
          {...(previewPlan.holdInput ? { holdInput: true } : {})}
          {...(previewPlan.scene === undefined ? {} : { scene: previewPlan.scene })}
          {...(previewPlan.replayKey === undefined ? {} : { replayKey: previewPlan.replayKey })}
        />
      </div>
    );
  }
  if (phase === 'disabled' && snapshot) return <div data-testid="color-polish-display" data-display-phase={phase} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}><V6DisplayExperience /></div>;
  if (phase === 'unavailable' && lastMode !== 'quiet' && lastMode !== 'neutral') {
    return <div data-testid="color-polish-display" data-display-phase={phase} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}><V6DisplayExperience /></div>;
  }
  return <SafeDisplay phase={phase} />;
}

export default ColorPolishHost;
