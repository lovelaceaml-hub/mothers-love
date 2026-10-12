'use client';

import { useEffect, useMemo, useRef, useState, type ComponentProps, type ComponentType, type ReactNode } from 'react';

import { snapshotFreshnessRequired, nextPollingBoundary } from '@/lib/polling-schedule';
import { startVisiblePoll } from '@/lib/visible-poll';
import { createPortal } from 'react-dom';

import { GardenCard, GardenScene, projectGardenAggregate, projectGardenRecognition } from '@/components/display/garden';
import { MonthlyImpact, NineExpressions, SharedExpression, sharedExpressionId } from '@/components/display/insights';
import { DailyPractice, EverydayPeace, ExpressionSpotlight, OneKindWord, PeacePromise } from '@/components/display/teaching/TeachingScreens';
import * as DisplayExperienceModule from '@/components/display/DisplayExperience';
import { recognitionReadingPageCount } from '@/lib/display/coordinator';
import type { DisplayMotion, DisplayScreenId, DisplaySettings, Recognition } from '@/lib/contracts';

import {
  createSamplePreviewSnapshot,
  parsePublicPreviewSnapshot,
  previewDurationMs,
  previewEffects,
  previewMotion,
  previewTempo,
  snapshotExpiryDelayMs,
  snapshotHasExpired,
  type PreviewEmptyReason,
  type PublicPreviewSnapshot,
} from './preview-model';
import styles from './DisplayStudioPreview.module.css';

type PreviewSource = 'sample' | 'approved';

type DisplayStudioPreviewProps = {
  aggregate: { recognitions: number; expressionTotal: number } | null;
  settings: DisplaySettings;
  source: PreviewSource;
  sessionKey: string | null;
  onSourceChange: (source: PreviewSource) => void;
};

type ApprovedState = {
  identity: string;
  phase: 'loading' | 'empty' | 'ready';
  reason: PreviewEmptyReason;
  snapshot: PublicPreviewSnapshot | null;
  sessionKey: string | null;
  validatedAtMs: number | null;
};

type ScreenInfo = {
  id: DisplayScreenId;
  title: string;
  description: string;
};

const SCREEN_INFO: readonly ScreenInfo[] = [
  { id: 'garden', title: 'Recognition Garden', description: 'Living wall' },
  { id: 'featured', title: 'Featured Recognition', description: 'One full message' },
  { id: 'impact', title: 'Monthly Impact', description: 'Rainbow ribbons' },
  { id: 'expressions', title: 'Nine Expressions', description: 'Wheel to cards' },
  { id: 'shared-expression', title: 'Shared Expression', description: 'Ribbon heart' },
  { id: 'spotlight', title: 'Expression Spotlight', description: 'Teaching label' },
  { id: 'daily-practice', title: 'Daily Practice', description: 'Official checklist' },
  { id: 'one-kind-word', title: 'One Kind Word', description: 'Garden-color ripple' },
  { id: 'everyday-peace', title: 'Everyday Peace', description: 'Home, school, work' },
  { id: 'peace-promise', title: 'Peace Promise', description: 'Official signature' },
];

type TimelineProps = { elapsedMs?: number; motion?: DisplayMotion };
type TimedComponent<T> = ComponentType<T & TimelineProps>;

const PreviewGardenScene = GardenScene as unknown as TimedComponent<ComponentProps<typeof GardenScene>>;
const PreviewMonthlyImpact = MonthlyImpact as unknown as TimedComponent<ComponentProps<typeof MonthlyImpact>>;
const PreviewNineExpressions = NineExpressions as unknown as TimedComponent<ComponentProps<typeof NineExpressions>>;
const PreviewSharedExpression = SharedExpression as unknown as TimedComponent<ComponentProps<typeof SharedExpression>>;
const PreviewExpressionSpotlight = ExpressionSpotlight as unknown as TimedComponent<ComponentProps<typeof ExpressionSpotlight>>;
const PreviewDailyPractice = DailyPractice as unknown as TimedComponent<ComponentProps<typeof DailyPractice>>;
const PreviewOneKindWord = OneKindWord as unknown as TimedComponent<ComponentProps<typeof OneKindWord>>;
const PreviewEverydayPeace = EverydayPeace as unknown as TimedComponent<ComponentProps<typeof EverydayPeace>>;
const PreviewPeacePromise = PeacePromise as unknown as TimedComponent<ComponentProps<typeof PeacePromise>>;

type FeaturedPreviewProps = {
  recognition: Recognition;
  readingPageIndex?: number;
  reactionCount?: number;
  elapsedMs?: number;
  motion?: DisplayMotion;
};

const FeaturedRecognitionView = (DisplayExperienceModule as unknown as {
  FeaturedRecognitionView?: ComponentType<FeaturedPreviewProps>;
}).FeaturedRecognitionView;

function screenTitle(id: DisplayScreenId): string {
  return SCREEN_INFO.find((screen) => screen.id === id)?.title ?? id;
}

function emptyMessage(reason: PreviewEmptyReason): { title: string; text: string } {
  switch (reason) {
    case 'checking':
      return { title: 'Checking the approved display snapshot.', text: 'Only the public projection can appear here. This preview never reads private admin recognition fields.' };
    case 'private':
      return { title: 'Approved content is held back.', text: 'Quiet and Neutral modes clear personal display content immediately.' };
    case 'expired':
      return { title: 'Approved preview cleared.', text: 'The public recognition snapshot reached its expiry boundary. Refresh to request a current projection.' };
    case 'session':
      return { title: 'Approved preview cleared.', text: 'The admin session changed, so this preview removed its public snapshot.' };
    case 'invalid':
      return { title: 'Approved preview unavailable.', text: 'The public projection did not pass the preview validator, so no content was rendered.' };
    case 'unavailable':
    default:
      return { title: 'Approved preview unavailable.', text: 'The public display snapshot could not be read. Safe sample content remains available.' };
  }
}

function useApprovedSnapshot(settings: DisplaySettings, source: PreviewSource, sessionKey: string | null): ApprovedState {
  const identity = `${source}:${sessionKey ?? ''}:${settings.mode}`;
  const [identityCycle, setIdentityCycle] = useState({ identity, cycle: 0 });
  if (identityCycle.identity !== identity) {
    setIdentityCycle({ identity, cycle: identityCycle.cycle + 1 });
  }
  const requestIdentity = `${identity}:${identityCycle.cycle}`;
  const [state, setState] = useState<ApprovedState>({ identity: '', phase: 'empty', reason: 'session', snapshot: null, sessionKey, validatedAtMs: null });
  const generation = useRef(0);
  const lastVerifiedWallMs = useRef<number | null>(null);

  useEffect(() => {
    const requestGeneration = generation.current + 1;
    generation.current = requestGeneration;
    const controller = new AbortController();

    if (source !== 'approved') {
      return () => controller.abort();
    }
    if (!sessionKey) {
      return () => controller.abort();
    }
    if (settings.mode !== 'normal') {
      return () => controller.abort();
    }

    let reading = false;
    const readSnapshot = async () => {
      if (reading || document.hidden) return;
      reading = true;
      try {
        const response = await fetch('/api/display/snapshot', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('UNAVAILABLE');
        const raw = await response.json() as unknown;
        if (generation.current !== requestGeneration) return;
        const snapshot = parsePublicPreviewSnapshot(raw);
        if (!snapshot) {
          setState({ identity: requestIdentity, phase: 'empty', reason: 'invalid', snapshot: null, sessionKey, validatedAtMs: null });
          return;
        }
        if (snapshot.settings.mode !== 'normal' || snapshotHasExpired(snapshot)) {
          setState({ identity: requestIdentity, phase: 'empty', reason: snapshot.settings.mode === 'normal' ? 'expired' : 'private', snapshot: null, sessionKey, validatedAtMs: null });
          return;
        }
        lastVerifiedWallMs.current = Date.now();
        setState({ identity: requestIdentity, phase: 'ready', reason: 'checking', snapshot, sessionKey, validatedAtMs: Date.now() });
      } catch (error: unknown) {
        if (controller.signal.aborted || generation.current !== requestGeneration) return;
        setState({ identity: requestIdentity, phase: 'empty', reason: error instanceof Error && error.message === 'INVALID' ? 'invalid' : 'unavailable', snapshot: null, sessionKey, validatedAtMs: null });
      } finally { reading = false; }
    };

    const stopPolling = startVisiblePoll(() => { void readSnapshot(); }, 7_500, () => {
      if (snapshotFreshnessRequired() && lastVerifiedWallMs.current !== null && Date.now() - lastVerifiedWallMs.current >= 60_000) {
        setState({ identity: requestIdentity, phase: 'empty', reason: 'unavailable', snapshot: null, sessionKey, validatedAtMs: null });
      }
    });
    return () => {
      controller.abort();
      stopPolling();
    };
  }, [requestIdentity, sessionKey, settings.mode, source]);

  useEffect(() => {
    if (source !== 'approved' || state.identity !== requestIdentity || state.phase !== 'ready' || !state.snapshot || state.sessionKey !== sessionKey || state.validatedAtMs === null) return undefined;
    let timer: number;
    const check = () => {
      const expiryWindow = snapshotExpiryDelayMs(state.snapshot!);
      const expiryDelay = expiryWindow === null ? null : expiryWindow - (Date.now() - state.validatedAtMs!);
      const age = Date.now() - state.validatedAtMs!;
      if ((expiryDelay !== null && expiryDelay <= 0) || (snapshotFreshnessRequired() && age >= 60_000)) {
        if (generation.current > 0) setState({ identity: requestIdentity, phase: 'empty', reason: expiryDelay !== null && expiryDelay <= 0 ? 'expired' : 'unavailable', snapshot: null, sessionKey, validatedAtMs: null });
        return;
      }
      const freshnessDelay = snapshotFreshnessRequired() ? Math.max(1, 60_000 - age) : Infinity;
      timer = window.setTimeout(check, Math.max(1, Math.min(expiryDelay ?? Infinity, freshnessDelay, nextPollingBoundary() - Date.now())));
    };
    check();
    return () => window.clearTimeout(timer);
  }, [requestIdentity, sessionKey, source, state.identity, state.phase, state.sessionKey, state.snapshot, state.validatedAtMs]);

  if (state.identity === requestIdentity) return state;
  if (source !== 'approved' || !sessionKey) return { identity: requestIdentity, phase: 'empty', reason: 'session', snapshot: null, sessionKey, validatedAtMs: null };
  if (settings.mode !== 'normal') return { identity: requestIdentity, phase: 'empty', reason: 'private', snapshot: null, sessionKey, validatedAtMs: null };
  return { identity: requestIdentity, phase: 'loading', reason: 'checking', snapshot: null, sessionKey, validatedAtMs: null };
}

function ActualPreviewScreen({ screen, snapshot, settings, elapsedMs }: { screen: DisplayScreenId; snapshot: PublicPreviewSnapshot; settings: DisplaySettings; elapsedMs: number }) {
  const records = useMemo(() => snapshot.recognitions.map(projectGardenRecognition), [snapshot.recognitions]);
  const aggregate = useMemo(() => projectGardenAggregate(snapshot.aggregate), [snapshot.aggregate]);
  const effects = previewEffects(settings);
  const tempo = previewTempo(settings);
  const motion = previewMotion(settings);
  const reducedMotion = motion === 'still';
  const nowMs = Date.parse(snapshot.serverTime) + elapsedMs;
  const sharedId = sharedExpressionId(snapshot.recognitions);
  const featured = snapshot.recognitions.find((record) => record.featured) ?? snapshot.recognitions[0];
  const featuredPageCount = featured ? recognitionReadingPageCount(featured) : 1;
  const featuredPageDurationMs = Math.max(12_000, previewDurationMs('featured', settings, snapshot) / featuredPageCount);
  const featuredPageIndex = Math.min(featuredPageCount - 1, Math.floor(elapsedMs / featuredPageDurationMs));

  switch (screen) {
    case 'garden':
      return <PreviewGardenScene records={records} amount={settings.gardenAmount ?? 'all-active'} nowMs={nowMs} decoration="full" tempo={tempo} motion={motion} requestedDecoration={effects} reducedMotion={reducedMotion} elapsedMs={elapsedMs} />;
    case 'featured':
      return featured && FeaturedRecognitionView ? <FeaturedRecognitionView recognition={featured} readingPageIndex={featuredPageIndex} /> : null;
    case 'impact':
      return <PreviewMonthlyImpact aggregate={aggregate} elapsedMs={elapsedMs} motion={motion} />;
    case 'expressions':
      return <PreviewNineExpressions elapsedMs={elapsedMs} motion={motion} />;
    case 'shared-expression':
      return <PreviewSharedExpression recognitions={snapshot.recognitions} expressionId={sharedId} elapsedMs={elapsedMs} motion={motion} />;
    case 'spotlight':
      return <PreviewExpressionSpotlight expressionIndex={0} motion={motion} elapsedMs={elapsedMs} />;
    case 'daily-practice':
      return <PreviewDailyPractice expressionIndex={0} motion={motion} elapsedMs={elapsedMs} />;
    case 'one-kind-word':
      return <PreviewOneKindWord wordIndex={0} motion={motion} elapsedMs={elapsedMs} />;
    case 'everyday-peace':
      return <PreviewEverydayPeace motion={motion} elapsedMs={elapsedMs} />;
    case 'peace-promise':
      return <PreviewPeacePromise motion={motion} elapsedMs={elapsedMs} />;
    default:
      return null;
  }
}

function ScaledTvCanvas({ children, paused }: { children: ReactNode; paused: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(entries => setScale(entries[0].contentRect.width / 1920));
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={host} style={{ width: '100%', height: '100%' }}><iframe tabIndex={-1} title="TV screen preview" srcDoc="<!doctype html><html><head></head><body></body></html>" style={{ width: 1920, height: 1080, border: 0, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }} onLoad={event => {
    const doc = event.currentTarget.contentDocument;
    if (!doc) return;
    doc.head.replaceChildren(...Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]')).map(node => node.cloneNode(true)));
    doc.body.className = document.body.className;
    doc.body.style.cssText = 'margin:0;width:1920px;height:1080px;overflow:hidden;background:#fffdf6';
    setTarget(doc.body);
  }} />{target ? createPortal(<div style={{ width: '100%', height: '100%' }}><style>{paused ? '* , *::before, *::after {animation-play-state:paused!important}' : ''}</style>{children}</div>, target) : null}</div>;
}

export function DisplayStudioPreview({ settings, source, sessionKey, onSourceChange }: DisplayStudioPreviewProps) {
  const sampleSnapshot = useMemo(() => createSamplePreviewSnapshot(), []);
  const approvedState = useApprovedSnapshot(settings, source, sessionKey);
  const [selectedScreen, setSelectedScreen] = useState<DisplayScreenId>('garden');
  const timelineKey = `${selectedScreen}:${source}:${sessionKey ?? ''}`;
  const [timeline, setTimeline] = useState({ key: 'garden:sample:', elapsedMs: 0, playing: true, replayKey: 0 });
  const elapsedMs = timeline.key === timelineKey ? timeline.elapsedMs : 0;
  const playing = timeline.key === timelineKey ? timeline.playing : true;
  const replayKey = timeline.key === timelineKey ? timeline.replayKey : 0;
  const elapsedRef = useRef(0);
  const snapshot = source === 'sample'
    ? sampleSnapshot
    : approvedState.phase === 'ready' && approvedState.sessionKey === sessionKey && approvedState.snapshot && settings.mode === 'normal' && !snapshotHasExpired(approvedState.snapshot)
      ? approvedState.snapshot
      : null;
  const durationMs = previewDurationMs(selectedScreen, settings, snapshot ?? sampleSnapshot);
  const included = settings.playlist?.some((entry) => entry.id === selectedScreen && entry.enabled) ?? true;
  const sourceReady = source === 'sample' || Boolean(snapshot);
  const displayAggregate = snapshot?.aggregate ?? (source === 'sample' ? sampleSnapshot.aggregate : null);

  useEffect(() => {
    elapsedRef.current = elapsedMs;
  }, [elapsedMs]);

  useEffect(() => {
    if (!playing || !sourceReady) return undefined;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const next = Math.min(durationMs, elapsedRef.current + Math.max(0, now - previous));
      previous = now;
      elapsedRef.current = next;
      setTimeline(current => ({ ...current, key: timelineKey, elapsedMs: next, playing: next < durationMs, replayKey }));
    }, 100);
    return () => window.clearInterval(timer);
  }, [durationMs, playing, replayKey, sourceReady, timelineKey]);

  const setScreen = (screen: DisplayScreenId) => {
    setSelectedScreen(screen);
    elapsedRef.current = 0;
    setTimeline((current) => ({ key: `${screen}:${source}:${sessionKey ?? ''}`, elapsedMs: 0, playing: true, replayKey: current.replayKey + 1 }));
  };

  const replay = () => {
    elapsedRef.current = 0;
    setTimeline((current) => ({ key: timelineKey, elapsedMs: 0, playing: sourceReady, replayKey: current.replayKey + 1 }));
  };

  const togglePlayback = () => {
    if (!sourceReady) return;
    setTimeline((current) => {
      const active = current.key === timelineKey ? current : { key: timelineKey, elapsedMs: 0, playing: false, replayKey: current.replayKey };
      if (active.elapsedMs >= durationMs) {
        elapsedRef.current = 0;
        return { ...active, elapsedMs: 0, playing: true, replayKey: active.replayKey + 1 };
      }
      return { ...active, playing: !active.playing };
    });
  };

  const status = source === 'sample'
    ? { label: 'Safe sample', badge: 'Private sample' }
    : approvedState.phase === 'ready' && snapshot
      ? { label: 'Validated public projection', badge: 'Approved state' }
      : { label: 'Current approved live state', badge: 'Read only' };
  const empty = source === 'approved' && !snapshot ? emptyMessage(approvedState.reason) : null;

  return (
    <div className={styles.shell} data-testid="display-studio-preview" data-preview-source={source} data-preview-state={snapshot ? 'ready' : source === 'sample' ? 'sample' : approvedState.phase}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Studio preview</p>
          <h3 className={styles.title}>{status.label}</h3>
          <p className={styles.hint}>Preview every approved screen with safe fictional content or the current public projection. Changes here never submit, update, seed, or play audio.</p>
        </div>
        <span className={source === 'sample' ? styles.sourceBadge : styles.validationBadge}>{status.badge}</span>
      </div>

      <div className={styles.controlHeader}>
        <div className={styles.controlGroup} role="group" aria-label="Preview source" data-testid="preview-source">
          <p className={styles.controlLabel}>Preview source</p>
          <div className={styles.sourceButtons}>
            <button type="button" className={source === 'sample' ? styles.sourceButtonActive : styles.sourceButton} aria-pressed={source === 'sample'} onClick={() => onSourceChange('sample')}>Safe sample</button>
            <button type="button" className={source === 'approved' ? styles.sourceButtonActive : styles.sourceButton} aria-pressed={source === 'approved'} onClick={() => onSourceChange('approved')}>Current approved</button>
          </div>
        </div>
        <div className={styles.controlGroup} role="group" aria-label="Preview playback">
          <p className={styles.controlLabel}>Playback</p>
          <div className={styles.playbackControls}>
            <button type="button" className={styles.controlButton} data-testid="preview-playback" onClick={togglePlayback} disabled={!sourceReady}>{playing ? 'Pause' : 'Play'}</button>
            <button type="button" className={styles.sourceButton} data-testid="preview-replay" onClick={replay} disabled={!sourceReady}>Replay screen</button>
          </div>
        </div>
      </div>

      <div className={styles.controlGroup} role="tablist" aria-label="Preview screens" data-testid="preview-screen-select">
        <p className={styles.controlLabel}>Choose a screen, including removed screens</p>
        <div className={styles.screenTabs}>
          {SCREEN_INFO.map((screen) => {
            const active = selectedScreen === screen.id;
            const isIncluded = settings.playlist?.some((entry) => entry.id === screen.id && entry.enabled) ?? true;
            return (
              <button key={screen.id} type="button" role="tab" aria-selected={active} className={active ? styles.screenTabActive : styles.screenTab} onClick={() => setScreen(screen.id)}>
                <span>{screen.title}</span>
                <small>{screen.description} · {isIncluded ? 'Included' : 'Removed from playlist'}</small>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.canvasHeader}>
        <p className={styles.canvasKicker}>{screenTitle(selectedScreen)} · 16:9 canvas</p>
        <span className={included ? styles.includedBadge : styles.removedBadge}>{included ? 'Included in playlist' : 'Preview only, removed from playlist'}</span>
      </div>
      <div className={styles.canvasFrame}>
        <div className={styles.canvasViewport} data-testid="preview-canvas" aria-label={`${screenTitle(selectedScreen)} preview canvas`}>
          <div className={styles.canvasContent} key={`${selectedScreen}-${replayKey}`} data-testid="preview-screen" data-screen-id={selectedScreen}>
            {snapshot ? <ScaledTvCanvas paused={!playing}><ActualPreviewScreen screen={selectedScreen} snapshot={snapshot} settings={settings} elapsedMs={elapsedMs} /></ScaledTvCanvas> : empty ? <div className={styles.emptyStage} data-testid="preview-empty-state"><h3>{empty.title}</h3><p className={styles.emptyText}>{empty.text}</p></div> : null}
          </div>
        </div>
      </div>
      <div className={styles.stageDetails}>
        <p className={styles.stageHint}>{source === 'sample' ? 'Fictional sample records are local to this browser view.' : 'Only validated recipient, message, expression, aggregate, and display settings fields can enter the canvas.'}</p>
        <p className={styles.timeText} aria-live="polite">{Math.round(elapsedMs / 1_000)}s / {Math.round(durationMs / 1_000)}s</p>
      </div>
      {displayAggregate ? <p className={styles.screenMeta} data-testid="preview-aggregate">{displayAggregate.recognitions} approved recognitions · {displayAggregate.expressionTotal} expressions in the projected month</p> : null}
    </div>
  );
}
