/** Rotation: arrivals, advancing the program and finishing an arrival. */
import type { Recognition } from '@/lib/contracts';
import type { DisplayScreen, QueueItem, ActiveArrival, PresentationState } from './coordinator-types';
import { recognitionReadingPageCount, readingPageDuration } from './coordinator-reading';
import {
  ORDINARY_GAP_MS,
  eligible,
  byId,
  fairSort,
  gardenNodeCount,
  scheduledPlaylist,
  availableProgramScreen,
  durationFor,
  chooseCluster,
  markPresented,
} from './coordinator-schedule';

const JOURNEY_MS = 2_500;
const INTRO_GROUP_AGE_MS = 2 * 60_000;

export function startArrival(state: PresentationState): PresentationState {
  if (!state.queue.length || state.pauseArrivals || state.quiet || state.neutral || state.offlineSafe) return state;
  const first = state.queue[0];
  const grouped = state.queue.length >= 10 || state.nowMs - first.enqueuedAtMs > INTRO_GROUP_AGE_MS;
  const readingSeconds = Math.max(12, state.settings.readingSeconds || 20);
  const item = state.snapshot?.recognitions.find((recognition) => recognition.id === first.id);
  const readingPageCount = item ? recognitionReadingPageCount(item) : 1;
  const readingPageDurationMs = item ? readingPageDuration(item, readingSeconds * 1_000) : readingSeconds * 1_000;
  const readingMs = readingPageDurationMs * readingPageCount;
  return {
    ...state,
    screen: 'arrival',
    screenStartedAtMs: state.nowMs,
    nextTransitionAtMs: null,
    featuredId: first.id,
    activeArrival: {
      id: first.id,
      phase: 'journey',
      grouped,
      journeyEndsAtMs: state.nowMs + JOURNEY_MS,
      readingPageIndex: 0,
      readingPageCount,
      readingPageDurationMs,
      nextPageEndsAtMs: state.nowMs + JOURNEY_MS + readingPageDurationMs,
      readingEndsAtMs: state.nowMs + JOURNEY_MS + readingMs,
    },
  };
}

export function storyIndexFor(state: PresentationState, screen: DisplayScreen): number {
  return (state.storyVisits[screen] ?? 0) % (screen === 'one-kind-word' ? 3 : 9);
}

export function advanceProgram(previous: PresentationState): PresentationState {
  const state = { ...previous, storyVisits: { ...previous.storyVisits, [previous.screen]: (previous.storyVisits[previous.screen] ?? 0) + 1 } };
  const items = eligible(state.snapshot, state.nowMs, state.serverOffsetMs);
  if (!items.length) {
    const playlist = scheduledPlaylist(state.settings);
    const nextIndex = (state.playlistIndex + 1) % playlist.length;
    const nextScreen = playlist[nextIndex] === 'featured' ? availableProgramScreen(state.settings, false) : playlist[nextIndex];
    return {
      ...state,
      screen: state.neutral ? 'neutral' : state.quiet ? 'quiet' : nextScreen,
      playlistIndex: nextIndex,
      screenStartedAtMs: state.nowMs,
      nextTransitionAtMs: state.nowMs + durationFor(nextScreen, state.settings),
      gardenIds: [],
      featuredId: null,
      clusterIds: [],
      clusterExpressionId: null,
      readingPageIndex: 0,
      readingPageCount: 1,
    };
  }
  const playlist = scheduledPlaylist(state.settings);
  const nextIndex = (state.playlistIndex + 1) % playlist.length;
  const nextScreen = playlist[nextIndex];
  const sorted = fairSort(items, state.presentationHistory);
  const garden = sorted.slice(0, gardenNodeCount(state.settings, items.length));
  const feature = byId(items, state.manualFeatureId) ?? fairSort(items, state.featuredHistory).find((item) => item.id !== state.featuredId) ?? sorted[0];
  const cluster = chooseCluster(items, state.clusterExpressionId);
  const selectedIds = nextScreen === 'garden' ? garden.map((item) => item.id) : nextScreen === 'featured' || !feature ? [] : [feature.id];
  const nextReadingPageCount = nextScreen === 'featured' && feature ? recognitionReadingPageCount(feature) : 1;
  const nextPageDuration = nextScreen === 'featured' && feature ? readingPageDuration(feature) : 0;
  return {
    ...state,
    screen: nextScreen,
    playlistIndex: nextIndex,
    screenStartedAtMs: state.nowMs,
    nextTransitionAtMs: state.nowMs + (nextScreen === 'featured' && feature ? Math.max(nextPageDuration, durationFor(nextScreen, state.settings, feature) / nextReadingPageCount) : durationFor(nextScreen, state.settings, feature)),
    readingPageIndex: 0,
    readingPageCount: nextReadingPageCount,
    gardenIds: garden.map((item) => item.id),
    featuredId: feature?.id ?? null,
    featuredHistory: nextScreen === 'featured' && feature ? { ...state.featuredHistory, [feature.id]: state.nowMs } : state.featuredHistory,
    clusterIds: nextScreen === 'cluster' ? cluster.ids : state.clusterIds,
    clusterExpressionId: nextScreen === 'cluster' ? cluster.expressionId : state.clusterExpressionId,
    presentationHistory: markPresented(state, selectedIds, state.nowMs),
    lastActivityAtMs: state.nowMs,
  };
}

export function completeArrival(state: PresentationState): PresentationState {
  const activeArrival = state.activeArrival;
  const activeId = activeArrival?.id;
  if (!activeArrival || !activeId) return state;
  const grouped = activeArrival.grouped;
  const item = state.queue[0];
  const introducedKeys = grouped
    ? state.queue.map((queued) => queued.publicationKey)
    : item?.id === activeId
      ? [item.publicationKey]
      : state.queue.filter((queued) => queued.id === activeId).map((queued) => queued.publicationKey);
  const nextQueue = grouped
    ? []
    : item?.id === activeId
      ? state.queue.slice(1)
      : state.queue.filter((queued) => queued.id !== activeId);
  const nextIntroduced = [...state.introducedPublicationKeys];
  for (const key of introducedKeys) {
    if (!nextIntroduced.includes(key)) nextIntroduced.push(key);
  }
  return {
    ...state,
    screen: 'garden',
    playlistIndex: Math.max(0, scheduledPlaylist(state.settings).indexOf('garden')),
    activeArrival: null,
    queue: nextQueue,
    introducedPublicationKeys: nextIntroduced,
    presentationHistory: grouped ? state.presentationHistory : markPresented(state, [activeId], state.nowMs),
    readingPageIndex: 0,
    readingPageCount: 1,
    screenStartedAtMs: state.nowMs,
    nextTransitionAtMs: state.nowMs + ORDINARY_GAP_MS,
  };
}

export function removeUnavailableActive(state: PresentationState, items: Recognition[]): PresentationState {
  const activeId = state.activeArrival?.id;
  if (!activeId || items.some((item) => item.id === activeId)) return state;
  return {
    ...state,
    activeArrival: null,
    queue: state.queue.filter((item) => item.id !== activeId),
    screen: availableProgramScreen(state.settings, items.length > 0),
    nextTransitionAtMs: state.nowMs + durationFor(availableProgramScreen(state.settings, items.length > 0), state.settings),
  };
}
