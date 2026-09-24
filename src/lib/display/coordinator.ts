import type { DisplaySettings, Recognition } from '@/lib/contracts';
import type { QueueItem, ActiveArrival, PresentationState, CoordinatorAction } from './coordinator-types';
import { readingPageDuration } from './coordinator-reading';
import {
  settingsWithDefaults,
  periodKey,
  eligible,
  byId,
  milestoneThresholds,
  scheduledPlaylist,
  availableProgramScreen,
  durationFor,
  recognitionForCluster,
  markPresented,
} from './coordinator-schedule';
import { clearPersonal, shiftPresentationTimers, rebuildVisibleState } from './coordinator-snapshot';
import {
  startArrival,
  advanceProgram,
  completeArrival,
  removeUnavailableActive,
} from './coordinator-rotation';

export type {
  DisplayScreen,
  ArrivalPhase,
  QueueItem,
  ActiveArrival,
  PresentationState,
  CoordinatorAction,
} from './coordinator-types';
export {
  READING_MESSAGE_PAGE_GRAPHEMES,
  READING_MESSAGE_PAGE_LINES,
  splitVerbatimMessage,
  recognitionReadingPageCount,
} from './coordinator-reading';
export { DEFAULT_DISPLAY_SETTINGS, publicationKey, durationFor } from './coordinator-schedule';
export { storyIndexFor } from './coordinator-rotation';

const GRACE_MS = 60_000;

function currentMode(state: PresentationState): 'normal' | 'quiet' | 'neutral' {
  if (state.neutral) return 'neutral';
  if (state.quiet) return 'quiet';
  return 'normal';
}

export function createInitialState(settings?: Partial<DisplaySettings>): PresentationState {
  const defaults = settingsWithDefaults(settings);
  return {
    paired: false,
    phase: 'pairing',
    snapshot: null,
    settings: defaults,
    serverOffsetMs: 0,
    cursor: null,
    lastSuccessfulVerificationMs: null,
    nowMs: 0,
    screen: 'quiet',
    screenStartedAtMs: 0,
    nextTransitionAtMs: null,
    pauseStartedAtMs: null,
    readingPageIndex: 0,
    readingPageCount: 1,
    playlistIndex: 0,
    storyVisits: {},
    featuredHistory: {},
    gardenIntroducedAt: {},
    gardenIds: [],
    featuredId: null,
    clusterIds: [],
    clusterExpressionId: null,
    queue: [],
    activeArrival: null,
    knownPublicationKeys: [],
    introducedPublicationKeys: [],
    presentationHistory: {},
    pendingMilestone: null,
    celebratedMilestones: {},
    lowActivity: false,
    quiet: false,
    neutral: false,
    offlineSafe: false,
    stale: false,
    unauthorized: false,
    reducedMotion: false,
    lastActivityAtMs: 0,
    manualFeatureId: null,
    operatorModeOverride: null,
    pauseRotation: defaults.pauseRotation,
    pauseArrivals: defaults.pauseArrivals,
  };
}

export function displayReducer(state: PresentationState, action: CoordinatorAction): PresentationState {
  switch (action.type) {
    case 'PAIRING_STARTED':
      return { ...state, phase: 'loading' };
    case 'PAIRING_SUCCEEDED':
      return { ...state, paired: true, phase: state.phase === 'ready' ? 'ready' : 'loading', unauthorized: false, operatorModeOverride: null };
    case 'PAIRING_REQUIRED':
      return clearPersonal(state, true, false);
    case 'SNAPSHOT_RECEIVED': {
      if (state.snapshot && action.snapshot.revision < state.snapshot.revision) return state;
      const next = rebuildVisibleState(state, action.snapshot, action.receivedAtMs);
      if (next.neutral || next.quiet) return next;
      const month = periodKey(action.snapshot);
      const celebrated = next.celebratedMilestones[month] ?? [];
      if (!state.snapshot) {
        const initialThresholds = milestoneThresholds(action.snapshot.aggregate.recognitions)
          .filter((threshold) => threshold <= action.snapshot.aggregate.recognitions);
        return {
          ...next,
          celebratedMilestones: initialThresholds.length
            ? { ...next.celebratedMilestones, [month]: initialThresholds }
            : next.celebratedMilestones,
        };
      }
      return next.pendingMilestone && !celebrated.includes(next.pendingMilestone)
        ? next
        : { ...next, pendingMilestone: null };
    }
    case 'SNAPSHOT_UNAVAILABLE': {
      if (action.unauthorized) return clearPersonal(state, true, false);
      const lastVerified = state.lastSuccessfulVerificationMs;
      if (lastVerified !== null && action.receivedAtMs - lastVerified >= GRACE_MS) return clearPersonal(state, false, true);
      if (state.snapshot) {
        return {
          ...state,
          nowMs: action.receivedAtMs,
          stale: true,
          offlineSafe: false,
          unauthorized: false,
        };
      }
      return {
        ...state,
        paired: true,
        phase: 'ready',
        nowMs: action.receivedAtMs,
        cursor: null,
        stale: true,
        quiet: true,
        neutral: false,
        activeArrival: null,
        screen: 'quiet',
        nextTransitionAtMs: null,
      };
    }
    case 'TICK': {
      let next = { ...state, nowMs: action.nowMs };
      if (
        next.lastSuccessfulVerificationMs !== null &&
        next.stale && action.nowMs - next.lastSuccessfulVerificationMs >= GRACE_MS
      ) {
        next = clearPersonal(next, false, true);
      }
      const items = eligible(next.snapshot, action.nowMs, next.serverOffsetMs);
      next = removeUnavailableActive(
        {
          ...next,
          gardenIds: next.gardenIds.filter((id) => items.some((item) => item.id === id)),
          queue: next.queue.filter((queued) => items.some((item) => item.id === queued.id)),
        },
        items,
      );
      if (next.screen === 'featured' && next.featuredId && !items.some((item) => item.id === next.featuredId)) {
        next = {
          ...next,
          screen: availableProgramScreen(next.settings, items.length > 0),
          featuredId: null,
          readingPageIndex: 0,
          readingPageCount: 1,
          screenStartedAtMs: action.nowMs,
          nextTransitionAtMs: action.nowMs + durationFor(availableProgramScreen(next.settings, items.length > 0), next.settings),
        };
      }
      if (next.neutral || next.quiet || next.offlineSafe || next.phase !== 'ready') return next;
      if (next.lowActivity && next.queue.length) next = { ...next, lowActivity: false };
      if (!next.lowActivity && next.settings.lowActivityMinutes > 0 && action.nowMs - next.lastActivityAtMs >= next.settings.lowActivityMinutes * 60_000) {
        next = { ...next, lowActivity: true };
      }
      if (next.activeArrival) {
        if (next.pauseRotation) return next;
        if (next.activeArrival.phase === 'journey' && action.nowMs >= next.activeArrival.journeyEndsAtMs) {
          next = { ...next, activeArrival: { ...next.activeArrival, phase: 'reading' } };
        }
        if (
          next.activeArrival
          && action.nowMs >= next.activeArrival.readingEndsAtMs
          && next.activeArrival.readingPageIndex >= next.activeArrival.readingPageCount - 1
        ) {
          next = completeArrival(next);
        } else if (
          next.activeArrival?.phase === 'reading'
          && action.nowMs >= next.activeArrival.nextPageEndsAtMs
          && next.activeArrival.readingPageIndex < next.activeArrival.readingPageCount - 1
        ) {
          next = {
            ...next,
            activeArrival: {
              ...next.activeArrival,
              readingPageIndex: next.activeArrival.readingPageIndex + 1,
              nextPageEndsAtMs: next.activeArrival.nextPageEndsAtMs + next.activeArrival.readingPageDurationMs,
            },
          };
        }
        return next;
      }
      if (next.pauseRotation) return next;
      const due = next.nextTransitionAtMs !== null && action.nowMs >= next.nextTransitionAtMs;
      if (due && next.screen === 'featured') {
        if (next.pauseRotation) return next;
        if (next.readingPageIndex < next.readingPageCount - 1) {
          const feature = byId(items, next.featuredId);
          const nextPageDuration = feature ? readingPageDuration(feature) : 12_000;
          return {
            ...next,
            readingPageIndex: next.readingPageIndex + 1,
            screenStartedAtMs: action.nowMs,
            nextTransitionAtMs: action.nowMs + nextPageDuration,
          };
        }
        if (next.featuredId) next = { ...next, presentationHistory: markPresented(next, [next.featuredId], action.nowMs) };
      }
      if (next.screen === 'milestone' && next.nextTransitionAtMs !== null && action.nowMs >= next.nextTransitionAtMs) {
        const period = next.snapshot ? periodKey(next.snapshot) : '';
        const threshold = next.pendingMilestone;
        return {
          ...next,
          screen: availableProgramScreen(next.settings, items.length > 0),
          playlistIndex: Math.max(0, scheduledPlaylist(next.settings).indexOf(availableProgramScreen(next.settings, items.length > 0))),
          screenStartedAtMs: action.nowMs,
          nextTransitionAtMs: action.nowMs + durationFor(availableProgramScreen(next.settings, items.length > 0), next.settings),
          pendingMilestone: null,
          celebratedMilestones: threshold && period
            ? { ...next.celebratedMilestones, [period]: [...(next.celebratedMilestones[period] ?? []), threshold] }
            : next.celebratedMilestones,
        };
      }
      if (due && next.pendingMilestone !== null) {
        return { ...next, screen: 'milestone', nextTransitionAtMs: action.nowMs + 8_000, screenStartedAtMs: action.nowMs };
      }
      if (due && next.queue.length && !next.pauseArrivals) return startArrival(next);
      if (due && !next.pauseRotation) return advanceProgram(next);
      return next;
    }
    case 'ADVANCE': {
      if (state.activeArrival || state.quiet || state.neutral || state.pauseRotation) return state;
      return advanceProgram({ ...state, nowMs: state.nowMs, nextTransitionAtMs: state.nowMs });
    }
    case 'SET_OPERATOR_MODE': {
      if (action.mode === 'quiet') return { ...state, operatorModeOverride: 'quiet', quiet: true, neutral: false, screen: 'quiet', activeArrival: null, nextTransitionAtMs: null };
      if (action.mode === 'neutral') return { ...state, operatorModeOverride: 'neutral', neutral: true, quiet: false, screen: 'neutral', activeArrival: null, nextTransitionAtMs: null };
      const items = eligible(state.snapshot, state.nowMs, state.serverOffsetMs);
      return {
        ...state,
        operatorModeOverride: 'normal',
        quiet: false,
        neutral: false,
        offlineSafe: false,
        screen: availableProgramScreen(state.settings, items.length > 0),
        screenStartedAtMs: state.nowMs,
        nextTransitionAtMs: state.nowMs + durationFor(availableProgramScreen(state.settings, items.length > 0), state.settings),
      };
    }
    case 'SET_MOTION':
      return { ...state, settings: { ...state.settings, motion: action.motion } };
    case 'SET_REDUCED_MOTION':
      return { ...state, reducedMotion: action.reduced };
    case 'SET_PAUSE_ROTATION': {
      if (action.paused === state.pauseRotation) return state;
      if (action.paused) return { ...state, pauseRotation: true, pauseStartedAtMs: state.nowMs };
      const elapsedMs = state.pauseStartedAtMs === null ? 0 : Math.max(0, state.nowMs - state.pauseStartedAtMs);
      return { ...shiftPresentationTimers(state, elapsedMs), pauseRotation: false, pauseStartedAtMs: null };
    }
    case 'SET_PAUSE_ARRIVALS':
      return { ...state, pauseArrivals: action.paused };
    case 'SET_FEATURED':
      return { ...state, manualFeatureId: action.recognitionId };
    case 'MARK_ACTIVITY':
      return { ...state, lastActivityAtMs: action.nowMs, lowActivity: false };
    default:
      return state;
  }
}

export function selectEligible(state: PresentationState): Recognition[] {
  return eligible(state.snapshot, state.nowMs, state.serverOffsetMs);
}

export function selectGarden(state: PresentationState): Recognition[] {
  const items = selectEligible(state);
  return state.gardenIds.map((id) => byId(items, id)).filter((item): item is Recognition => Boolean(item));
}

export function selectFeatured(state: PresentationState): Recognition | null {
  return byId(selectEligible(state), state.featuredId) ?? null;
}

export function selectCluster(state: PresentationState): Recognition[] {
  if (!state.clusterExpressionId) return [];
  return recognitionForCluster(selectEligible(state), state.clusterExpressionId).filter((item) => state.clusterIds.includes(item.id));
}

export function isGroupedArrival(state: PresentationState): boolean {
  return Boolean(state.activeArrival?.grouped);
}

export function effectiveMotion(state: PresentationState): DisplaySettings['motion'] {
  // A deliberate Lively setting is the owner-approved TV broadcast override.
  // Other settings retain the browser's reduced-motion equivalent.
  if (state.reducedMotion && state.settings.motion !== 'lively') return 'still';
  return state.settings.motion;
}
