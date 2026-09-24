/** Snapshot bridging: turning a verified snapshot into visible state, and clearing it. */
import type { DisplaySnapshot, Recognition } from '@/lib/contracts';
import type { QueueItem, ActiveArrival, PresentationState } from './coordinator-types';
import { recognitionReadingPageCount } from './coordinator-reading';
import {
  ORDINARY_GAP_MS,
  settingsWithDefaults,
  periodKey,
  eligible,
  byId,
  fairSort,
  gardenNodeCount,
  nextMilestone,
  hasModernPlaylist,
  scheduledPlaylist,
  availableProgramScreen,
  durationFor,
  chooseCluster,
  markPresented,
} from './coordinator-schedule';

type SnapshotArrival = {
  eventId: string;
  recognitionId: string;
  publishedAt: string;
};

function arrivalKey(arrival: SnapshotArrival): string {
  return arrival.eventId || `${arrival.recognitionId}:${arrival.publishedAt}`;
}

export function clearPersonal(state: PresentationState, unauthorized: boolean, offlineSafe: boolean): PresentationState {
  return {
    ...state,
    snapshot: null,
    queue: [],
    activeArrival: null,
    gardenIds: [],
    gardenIntroducedAt: {},
    featuredHistory: {},
    presentationHistory: {},
    featuredId: null,
    clusterIds: [],
    clusterExpressionId: null,
    knownPublicationKeys: [],
    introducedPublicationKeys: [],
    pendingMilestone: null,
    phase: unauthorized ? 'pairing' : 'ready',
    paired: !unauthorized,
    screen: unauthorized ? 'quiet' : 'neutral',
    nextTransitionAtMs: null,
    pauseStartedAtMs: null,
    readingPageIndex: 0,
    readingPageCount: 1,
    neutral: !unauthorized,
    quiet: false,
    offlineSafe,
    stale: false,
    unauthorized,
    cursor: null,
    operatorModeOverride: unauthorized ? null : state.operatorModeOverride,
  };
}

export function shiftPresentationTimers(state: PresentationState, elapsedMs: number): PresentationState {
  if (elapsedMs <= 0) return state;
  return {
    ...state,
    screenStartedAtMs: state.screenStartedAtMs + elapsedMs,
    nextTransitionAtMs: state.nextTransitionAtMs === null ? null : state.nextTransitionAtMs + elapsedMs,
    activeArrival: state.activeArrival
      ? {
        ...state.activeArrival,
        journeyEndsAtMs: state.activeArrival.journeyEndsAtMs + elapsedMs,
        nextPageEndsAtMs: state.activeArrival.nextPageEndsAtMs + elapsedMs,
        readingEndsAtMs: state.activeArrival.readingEndsAtMs + elapsedMs,
      }
      : null,
  };
}

export function rebuildVisibleState(
  state: PresentationState,
  snapshot: DisplaySnapshot,
  receivedAtMs: number,
): PresentationState {
  const offset = Date.parse(snapshot.serverTime) - receivedAtMs;
  const items = eligible(snapshot, receivedAtMs, offset);
  const reset = snapshot.sync === 'reset' || !state.snapshot;
  const arrivals: SnapshotArrival[] = snapshot.arrivals ?? [];
  const knownKeys = new Set(state.knownPublicationKeys);
  const newArrivals = reset
    ? []
    : arrivals.filter((arrival) => {
      const key = arrivalKey(arrival);
      if (knownKeys.has(key)) return false;
      knownKeys.add(key);
      return true;
    });
  const queuedKeys = new Set(state.queue.map((item) => item.publicationKey));
  const nextQueue = state.queue
    .filter((item) => items.some((candidate) => candidate.id === item.id))
    .concat(
      newArrivals
        .filter((arrival) => !queuedKeys.has(arrivalKey(arrival)))
        .map((arrival) => ({
          id: arrival.recognitionId,
          publicationKey: arrivalKey(arrival),
          enqueuedAtMs: receivedAtMs,
          version: items.find((item) => item.id === arrival.recognitionId)?.version ?? 0,
        })),
    );
  const settings = settingsWithDefaults(snapshot.settings);
  const celebrated = state.celebratedMilestones[periodKey(snapshot)] ?? [];
  const threshold = reset ? null : nextMilestone(snapshot.aggregate.recognitions, celebrated);
  const currentScreenIsValid = !(state.quiet || state.neutral) && (!hasModernPlaylist(settings) || ['arrival', 'milestone'].includes(state.screen) || scheduledPlaylist(settings).includes(state.screen)) && (
    state.screen === 'featured' ? Boolean(byId(items, state.featuredId)) : state.screen !== 'arrival' || Boolean(state.activeArrival));
  const activeArrivalIsValid = !state.activeArrival || items.some((item) => item.id === state.activeArrival?.id);
  const mode = settings.mode;
  const quiet = mode === 'quiet' || state.operatorModeOverride === 'quiet';
  const neutral = mode === 'neutral' || state.operatorModeOverride === 'neutral';
  const wakeForPublication = newArrivals.length > 0 && !quiet && !neutral;
  const sorted = fairSort(items, state.presentationHistory);
  const gardenLimit = gardenNodeCount(settings, items.length);
  const previousEligibleIds = state.snapshot
    ? new Set(eligible(state.snapshot, state.nowMs, state.serverOffsetMs).map((item) => item.id))
    : null;
  const newlyEligible = previousEligibleIds
    ? fairSort(items.filter((item) => !previousEligibleIds.has(item.id)), state.presentationHistory)
    : [];
  const newlyEligibleIds = new Set(newlyEligible.map((item) => item.id));
  const retainedGardenIds = currentScreenIsValid
    ? [...new Set(state.gardenIds.filter((id) => items.some((item) => item.id === id && !newlyEligibleIds.has(id))))].slice(0, gardenLimit)
    : [];
  const retainedSet = new Set(retainedGardenIds);
  const gardenIds = newlyEligible
    .concat(retainedGardenIds.map((id) => items.find((item) => item.id === id)).filter((item): item is Recognition => Boolean(item)))
    .concat(sorted.filter((item) => !newlyEligibleIds.has(item.id) && !retainedSet.has(item.id)))
    .slice(0, gardenLimit)
    .map((item) => item.id);
  const featuredId = byId(items, state.manualFeatureId)?.id ?? byId(items, state.featuredId)?.id ?? sorted[0]?.id ?? null;
  const cluster = chooseCluster(items, state.clusterExpressionId);
  const fallbackScreen = availableProgramScreen(settings, items.length > 0);
  const startsGardenPresentation = (reset || !currentScreenIsValid || !activeArrivalIsValid) && fallbackScreen === 'garden';
  const screen = neutral
    ? 'neutral'
    : quiet
      ? 'quiet'
      : reset || !currentScreenIsValid || !activeArrivalIsValid
        ? fallbackScreen
        : state.screen;
  const shouldStartClock = reset || !currentScreenIsValid || !activeArrivalIsValid || !state.nextTransitionAtMs;
  const baseScreenStartedAtMs = shouldStartClock ? receivedAtMs : state.screenStartedAtMs;
  const baseNextTransitionAtMs = shouldStartClock ? receivedAtMs + durationFor(fallbackScreen, settings, byId(items, featuredId)) : wakeForPublication && state.screen === 'garden' ? Math.min(state.nextTransitionAtMs ?? Infinity, receivedAtMs + ORDINARY_GAP_MS) : state.nextTransitionAtMs;
  const pauseResumed = !reset && !settings.pauseRotation && state.pauseRotation && state.pauseStartedAtMs !== null;
  const pauseElapsedMs = pauseResumed ? Math.max(0, receivedAtMs - state.pauseStartedAtMs!) : 0;
  const timedState = shiftPresentationTimers(
    {
      ...state,
      screenStartedAtMs: baseScreenStartedAtMs,
      nextTransitionAtMs: baseNextTransitionAtMs,
      activeArrival: activeArrivalIsValid ? state.activeArrival : null,
    },
    pauseElapsedMs,
  );
  return {
    ...timedState,
    paired: true,
    phase: 'ready',
    snapshot,
    settings,
    serverOffsetMs: offset,
    lastSuccessfulVerificationMs: receivedAtMs,
    nowMs: receivedAtMs,
    screen,
    screenStartedAtMs: timedState.screenStartedAtMs,
    nextTransitionAtMs: timedState.nextTransitionAtMs,
    readingPageIndex: screen === 'featured' ? Math.min(state.readingPageIndex, Math.max(0, (byId(items, featuredId) ? recognitionReadingPageCount(byId(items, featuredId)!) : 1) - 1)) : 0,
    readingPageCount: screen === 'featured' && byId(items, featuredId) ? recognitionReadingPageCount(byId(items, featuredId)!) : 1,
    gardenIds,
    gardenIntroducedAt: Object.fromEntries(items.map(item => [item.id, newlyEligibleIds.has(item.id) ? receivedAtMs + offset : state.gardenIntroducedAt[item.id] ?? Date.parse(item.firstPublishedAt ?? item.createdAt)])),
    playlistIndex: shouldStartClock ? Math.max(0, scheduledPlaylist(settings).indexOf(screen)) : state.playlistIndex,
    presentationHistory: startsGardenPresentation ? markPresented(state, gardenIds, receivedAtMs) : state.presentationHistory,
    featuredId,
    featuredHistory: screen === 'featured' && shouldStartClock && featuredId ? { ...state.featuredHistory, [featuredId]: receivedAtMs } : state.featuredHistory,
    clusterIds: !shouldStartClock && state.clusterExpressionId !== null ? items.filter(item => item.expressionIds.includes(state.clusterExpressionId!)).slice(0, 4).map(item => item.id) : cluster.ids,
    clusterExpressionId: !shouldStartClock && state.clusterExpressionId !== null ? state.clusterExpressionId : cluster.expressionId,
    queue: nextQueue,
    activeArrival: timedState.activeArrival,
    knownPublicationKeys: reset
      ? arrivals.map(arrivalKey)
      : [...state.knownPublicationKeys, ...newArrivals.map(arrivalKey)],
    pendingMilestone: threshold,
    lowActivity: wakeForPublication ? false : state.lowActivity,
    quiet,
    neutral,
    offlineSafe: false,
    stale: false,
    unauthorized: false,
    pauseRotation: settings.pauseRotation,
    pauseStartedAtMs: settings.pauseRotation
      ? (state.pauseRotation ? state.pauseStartedAtMs ?? receivedAtMs : receivedAtMs)
      : null,
    pauseArrivals: settings.pauseArrivals,
    lastActivityAtMs: wakeForPublication ? receivedAtMs : state.lastActivityAtMs,
    cursor: snapshot.cursor,
  };
}
