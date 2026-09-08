import type { DisplaySettings, DisplaySnapshot, Recognition } from '@/lib/contracts';

export type DisplayScreen =
  | 'garden'
  | 'featured'
  | 'cluster'
  | 'impact'
  | 'all-nine'
  | 'arrival'
  | 'milestone'
  | 'fallback'
  | 'quiet'
  | 'neutral';

export type ArrivalPhase = 'journey' | 'reading';

export interface QueueItem {
  id: string;
  publicationKey: string;
  enqueuedAtMs: number;
  version: number;
}

export interface ActiveArrival {
  id: string;
  phase: ArrivalPhase;
  grouped: boolean;
  journeyEndsAtMs: number;
  readingPageIndex: number;
  readingPageCount: number;
  readingPageDurationMs: number;
  nextPageEndsAtMs: number;
  readingEndsAtMs: number;
}

export interface PresentationState {
  paired: boolean;
  phase: 'pairing' | 'loading' | 'ready';
  snapshot: DisplaySnapshot | null;
  settings: DisplaySettings;
  serverOffsetMs: number;
  cursor: string | null;
  lastSuccessfulVerificationMs: number | null;
  nowMs: number;
  screen: DisplayScreen;
  screenStartedAtMs: number;
  nextTransitionAtMs: number | null;
  pauseStartedAtMs: number | null;
  readingPageIndex: number;
  readingPageCount: number;
  playlistIndex: number;
  gardenIds: string[];
  featuredId: string | null;
  clusterIds: string[];
  clusterExpressionId: number | null;
  queue: QueueItem[];
  activeArrival: ActiveArrival | null;
  knownPublicationKeys: string[];
  introducedPublicationKeys: string[];
  presentationHistory: Record<string, number>;
  pendingMilestone: number | null;
  celebratedMilestones: Record<string, number[]>;
  lowActivity: boolean;
  quiet: boolean;
  neutral: boolean;
  offlineSafe: boolean;
  stale: boolean;
  unauthorized: boolean;
  reducedMotion: boolean;
  lastActivityAtMs: number;
  manualFeatureId: string | null;
  operatorModeOverride: 'normal' | 'quiet' | 'neutral' | null;
  pauseRotation: boolean;
  pauseArrivals: boolean;
}

export type CoordinatorAction =
  | { type: 'PAIRING_STARTED' }
  | { type: 'PAIRING_SUCCEEDED' }
  | { type: 'PAIRING_REQUIRED' }
  | { type: 'SNAPSHOT_RECEIVED'; snapshot: DisplaySnapshot; receivedAtMs: number }
  | { type: 'SNAPSHOT_UNAVAILABLE'; receivedAtMs: number; unauthorized?: boolean }
  | { type: 'TICK'; nowMs: number }
  | { type: 'ADVANCE' }
  | { type: 'SET_OPERATOR_MODE'; mode: 'normal' | 'quiet' | 'neutral' }
  | { type: 'SET_MOTION'; motion: DisplaySettings['motion'] }
  | { type: 'SET_REDUCED_MOTION'; reduced: boolean }
  | { type: 'SET_PAUSE_ROTATION'; paused: boolean }
  | { type: 'SET_PAUSE_ARRIVALS'; paused: boolean }
  | { type: 'SET_FEATURED'; recognitionId: string | null }
  | { type: 'MARK_ACTIVITY'; nowMs: number };

const GRACE_MS = 60_000;
const JOURNEY_MS = 2_500;
const ORDINARY_GAP_MS = 8_000;
const INTRO_GROUP_AGE_MS = 2 * 60_000;
const PLAYLIST: DisplayScreen[] = ['garden', 'featured', 'garden', 'impact', 'all-nine', 'cluster'];
const MILESTONE_BASES = [50, 100, 250, 500, 1_000];
export const READING_MESSAGE_PAGE_GRAPHEMES = 180;
export const READING_MESSAGE_PAGE_LINES = 7;

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  version: 0,
  mode: 'normal',
  motion: 'standard',
  pauseArrivals: false,
  pauseRotation: false,
  collectionOpen: false,
  lowActivityMinutes: 20,
  readingSeconds: 20,
  maxBubbles: 4,
  showTrails: true,
  showConstellations: true,
};

function settingsWithDefaults(settings?: Partial<DisplaySettings>): DisplaySettings {
  return { ...DEFAULT_DISPLAY_SETTINGS, ...settings };
}

export function publicationKey(recognition: Recognition): string {
  return `${recognition.id}:${recognition.firstPublishedAt ?? recognition.createdAt}`;
}

type SnapshotArrival = {
  eventId: string;
  recognitionId: string;
  publishedAt: string;
};

function arrivalKey(arrival: SnapshotArrival): string {
  return arrival.eventId || `${arrival.recognitionId}:${arrival.publishedAt}`;
}

function periodKey(snapshot: DisplaySnapshot): string {
  return snapshot.aggregate.periodStart.slice(0, 7);
}

function isEligible(recognition: Recognition, nowServerMs: number): boolean {
  return (
    recognition.status === 'published' &&
    Date.parse(recognition.expiresAt) > nowServerMs &&
    Boolean(recognition.firstPublishedAt)
  );
}

function eligible(snapshot: DisplaySnapshot | null, nowMs: number, offsetMs: number): Recognition[] {
  if (!snapshot) return [];
  const nowServerMs = nowMs + offsetMs;
  return snapshot.recognitions.filter((recognition) => isEligible(recognition, nowServerMs));
}

function byId(items: Recognition[], id: string | null): Recognition | undefined {
  return id ? items.find((item) => item.id === id) : undefined;
}

function fairSort(items: Recognition[], history: Record<string, number>): Recognition[] {
  return [...items].sort((left, right) => {
    const leftPresented = history[left.id] ?? -1;
    const rightPresented = history[right.id] ?? -1;
    if (leftPresented !== rightPresented) return leftPresented - rightPresented;
    const leftPublished = Date.parse(left.firstPublishedAt ?? left.createdAt);
    const rightPublished = Date.parse(right.firstPublishedAt ?? right.createdAt);
    if (leftPublished !== rightPublished) return rightPublished - leftPublished;
    return left.id.localeCompare(right.id);
  });
}

function maxBubbles(settings: DisplaySettings): number {
  return Math.max(1, Math.min(6, Number.isFinite(settings.maxBubbles) ? settings.maxBubbles : 4));
}

function nextMilestone(total: number, celebrated: number[]): number | null {
  const candidates = milestoneThresholds(total);
  const crossed = candidates.filter((threshold) => threshold <= total && !celebrated.includes(threshold));
  return crossed.length ? Math.max(...crossed) : null;
}

function milestoneThresholds(total: number): number[] {
  const candidates = [...MILESTONE_BASES];
  if (total >= 1_000) {
    for (let threshold = 1_500; threshold <= total + 500; threshold += 500) candidates.push(threshold);
  }
  return candidates;
}

function durationFor(screen: DisplayScreen, selected?: Recognition): number {
  if (screen === 'garden') return 20_000;
  if (screen === 'impact') return 15_000;
  if (screen === 'all-nine') return 24_000;
  if (screen === 'cluster') return 20_000;
  if (screen === 'fallback') return 20_000;
  if (screen === 'featured') {
    return selected ? readingTotalDuration(selected) : 12_000;
  }
  return 20_000;
}

function graphemes(text: string): string[] {
  const segmenter = (Intl as typeof Intl & {
    Segmenter?: new (locales?: string | string[], options?: { granularity: 'grapheme' }) => { segment(input: string): Iterable<{ segment: string }> };
  }).Segmenter;
  if (segmenter) return [...new segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map((part) => part.segment);
  return Array.from(text);
}

export function splitVerbatimMessage(message: string): string[] {
  const units = graphemes(message);
  if (!units.length) return [''];
  const pages: string[] = [];
  let cursor = 0;
  while (cursor < units.length) {
    let end = cursor;
    let newlineCount = 0;
    while (end < units.length && end - cursor < READING_MESSAGE_PAGE_GRAPHEMES) {
      const unit = units[end];
      if (unit === '\n' && newlineCount >= READING_MESSAGE_PAGE_LINES) break;
      end += 1;
      if (unit === '\n') newlineCount += 1;
      if (newlineCount >= READING_MESSAGE_PAGE_LINES) break;
    }
    if (end === cursor) end += 1;
    if (end < units.length && newlineCount < READING_MESSAGE_PAGE_LINES) {
      const whitespace = units.slice(cursor, end).reduce((last, unit, index) => /\s/u.test(unit) ? cursor + index : last, -1);
      if (whitespace > cursor + Math.floor(READING_MESSAGE_PAGE_GRAPHEMES * 0.55)) end = whitespace + 1;
    }
    pages.push(units.slice(cursor, end).join(''));
    cursor = end;
  }
  return pages;
}

export function recognitionReadingPageCount(recognition: Recognition): number {
  const messagePages = splitVerbatimMessage(recognition.message).length;
  return messagePages + (messagePages > 1 || recognition.expressionIds.length > 4 ? 1 : 0);
}

function readingTotalDuration(recognition: Recognition, minimumMs = 12_000): number {
  const expressionWeight = recognition.expressionIds.length * 350;
  return Math.max(minimumMs, Math.min(120_000, 12_000 + graphemes(recognition.message).length * 30 + expressionWeight));
}

function readingPageDuration(recognition: Recognition, minimumMs = 12_000): number {
  return Math.ceil(readingTotalDuration(recognition, minimumMs) / recognitionReadingPageCount(recognition));
}

function recognitionForCluster(items: Recognition[], expressionId: number): Recognition[] {
  return items.filter((item) => item.expressionIds.includes(expressionId));
}

function chooseCluster(items: Recognition[], previousExpressionId: number | null): { expressionId: number | null; ids: string[] } {
  const counts = new Map<number, Recognition[]>();
  for (const item of items) {
    for (const expressionId of item.expressionIds) {
      const current = counts.get(expressionId) ?? [];
      if (!current.some((candidate) => candidate.id === item.id)) current.push(item);
      counts.set(expressionId, current);
    }
  }
  const options = [...counts.entries()]
    .filter(([, matches]) => matches.length >= 1)
    .sort((left, right) => {
      const leftDistance = previousExpressionId === left[0] ? 1 : 0;
      const rightDistance = previousExpressionId === right[0] ? 1 : 0;
      if (leftDistance !== rightDistance) return leftDistance - rightDistance;
      return left[0] - right[0];
    });
  if (!options.length) return { expressionId: null, ids: [] };
  const [expressionId, matches] = options[0];
  return { expressionId, ids: matches.slice(0, 4).map((match) => match.id) };
}

function markPresented(state: PresentationState, ids: string[], atMs: number): Record<string, number> {
  const history = { ...state.presentationHistory };
  for (const id of ids) history[id] = atMs;
  return history;
}

function currentMode(state: PresentationState): 'normal' | 'quiet' | 'neutral' {
  if (state.neutral) return 'neutral';
  if (state.quiet) return 'quiet';
  return 'normal';
}

function clearPersonal(state: PresentationState, unauthorized: boolean, offlineSafe: boolean): PresentationState {
  return {
    ...state,
    snapshot: null,
    queue: [],
    activeArrival: null,
    gardenIds: [],
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

function shiftPresentationTimers(state: PresentationState, elapsedMs: number): PresentationState {
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

function rebuildVisibleState(
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
  const threshold = reset ? null : nextMilestone(snapshot.aggregate.expressionTotal, celebrated);
  const currentScreenIsValid =
    state.screen === 'featured' ? Boolean(byId(items, state.featuredId)) : state.screen !== 'arrival' || Boolean(state.activeArrival);
  const activeArrivalIsValid = !state.activeArrival || items.some((item) => item.id === state.activeArrival?.id);
  const mode = settings.mode;
  const quiet = mode === 'quiet' || state.operatorModeOverride === 'quiet';
  const neutral = mode === 'neutral' || state.operatorModeOverride === 'neutral';
  const wakeForPublication = newArrivals.length > 0 && !quiet && !neutral;
  const sorted = fairSort(items, state.presentationHistory);
  const gardenIds = currentScreenIsValid && state.gardenIds.length
    ? state.gardenIds.filter((id) => items.some((item) => item.id === id))
    : sorted.slice(0, maxBubbles(settings)).map((item) => item.id);
  const featuredId = byId(items, state.manualFeatureId)?.id ?? byId(items, state.featuredId)?.id ?? sorted[0]?.id ?? null;
  const cluster = chooseCluster(items, state.clusterExpressionId);
  const fallbackScreen: DisplayScreen = items.length ? 'garden' : 'fallback';
  const screen = neutral
    ? 'neutral'
    : quiet
      ? 'quiet'
      : reset || wakeForPublication || !currentScreenIsValid || !activeArrivalIsValid
        ? fallbackScreen
        : state.screen;
  const shouldStartClock = reset || wakeForPublication || !currentScreenIsValid || !activeArrivalIsValid || !state.nextTransitionAtMs;
  const baseScreenStartedAtMs = shouldStartClock ? receivedAtMs : state.screenStartedAtMs;
  const baseNextTransitionAtMs = shouldStartClock ? receivedAtMs + durationFor(fallbackScreen, byId(items, featuredId)) : state.nextTransitionAtMs;
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
    featuredId,
    clusterIds: cluster.ids,
    clusterExpressionId: cluster.expressionId,
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

function startArrival(state: PresentationState): PresentationState {
  if (!state.queue.length || state.pauseArrivals || state.quiet || state.neutral || state.offlineSafe) return state;
  const first = state.queue[0];
  const grouped = state.queue.length > 10 || state.nowMs - first.enqueuedAtMs > INTRO_GROUP_AGE_MS;
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

function advanceProgram(state: PresentationState): PresentationState {
  const items = eligible(state.snapshot, state.nowMs, state.serverOffsetMs);
  if (!items.length) {
    return {
      ...state,
      screen: state.neutral ? 'neutral' : state.quiet ? 'quiet' : 'fallback',
      nextTransitionAtMs: state.nowMs + durationFor('fallback'),
      gardenIds: [],
      featuredId: null,
      clusterIds: [],
      clusterExpressionId: null,
      readingPageIndex: 0,
      readingPageCount: 1,
    };
  }
  const nextIndex = (state.playlistIndex + 1) % PLAYLIST.length;
  const nextScreen = PLAYLIST[nextIndex];
  const sorted = fairSort(items, state.presentationHistory);
  const garden = sorted.slice(0, maxBubbles(state.settings));
  const feature = byId(items, state.manualFeatureId) ?? byId(items, state.featuredId) ?? sorted[0];
  const cluster = chooseCluster(items, state.clusterExpressionId);
  const selectedIds = nextScreen === 'garden' ? garden.map((item) => item.id) : nextScreen === 'featured' || !feature ? [] : [feature.id];
  const nextReadingPageCount = nextScreen === 'featured' && feature ? recognitionReadingPageCount(feature) : 1;
  const nextPageDuration = nextScreen === 'featured' && feature ? readingPageDuration(feature) : 0;
  return {
    ...state,
    screen: nextScreen,
    playlistIndex: nextIndex,
    screenStartedAtMs: state.nowMs,
    nextTransitionAtMs: state.nowMs + (nextScreen === 'featured' && feature ? nextPageDuration : durationFor(nextScreen, feature)),
    readingPageIndex: 0,
    readingPageCount: nextReadingPageCount,
    gardenIds: garden.map((item) => item.id),
    featuredId: feature?.id ?? null,
    clusterIds: cluster.ids,
    clusterExpressionId: cluster.expressionId,
    presentationHistory: markPresented(state, selectedIds, state.nowMs),
    lastActivityAtMs: state.nowMs,
  };
}

function completeArrival(state: PresentationState): PresentationState {
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

function removeUnavailableActive(state: PresentationState, items: Recognition[]): PresentationState {
  const activeId = state.activeArrival?.id;
  if (!activeId || items.some((item) => item.id === activeId)) return state;
  return {
    ...state,
    activeArrival: null,
    queue: state.queue.filter((item) => item.id !== activeId),
    screen: items.length ? 'garden' : 'fallback',
    nextTransitionAtMs: state.nowMs + durationFor(items.length ? 'garden' : 'fallback'),
  };
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
      return { ...state, paired: true, phase: 'loading', unauthorized: false, operatorModeOverride: null };
    case 'PAIRING_REQUIRED':
      return clearPersonal(state, true, false);
    case 'SNAPSHOT_RECEIVED': {
      if (state.snapshot && action.snapshot.revision < state.snapshot.revision) return state;
      const next = rebuildVisibleState(state, action.snapshot, action.receivedAtMs);
      if (next.neutral || next.quiet) return next;
      const month = periodKey(action.snapshot);
      const celebrated = next.celebratedMilestones[month] ?? [];
      if (!state.snapshot) {
        const initialThresholds = milestoneThresholds(action.snapshot.aggregate.expressionTotal)
          .filter((threshold) => threshold <= action.snapshot.aggregate.expressionTotal);
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
      return {
        ...state,
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
        action.nowMs - next.lastSuccessfulVerificationMs >= GRACE_MS &&
        !next.snapshot
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
          screen: items.length ? 'garden' : 'fallback',
          featuredId: null,
          readingPageIndex: 0,
          readingPageCount: 1,
          screenStartedAtMs: action.nowMs,
          nextTransitionAtMs: action.nowMs + durationFor(items.length ? 'garden' : 'fallback'),
        };
      }
      if (next.neutral || next.quiet || next.offlineSafe || next.phase !== 'ready') return next;
      if (!items.length && !next.activeArrival) {
        return {
          ...next,
          screen: 'fallback',
          nextTransitionAtMs: action.nowMs + durationFor('fallback'),
          gardenIds: [],
          featuredId: null,
          clusterIds: [],
          clusterExpressionId: null,
          readingPageIndex: 0,
          readingPageCount: 1,
        };
      }
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
          screen: items.length ? 'garden' : 'fallback',
          nextTransitionAtMs: action.nowMs + durationFor(items.length ? 'garden' : 'fallback'),
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
        screen: items.length ? 'garden' : 'fallback',
        screenStartedAtMs: state.nowMs,
        nextTransitionAtMs: state.nowMs + durationFor(items.length ? 'garden' : 'fallback'),
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
  if (state.reducedMotion) return 'still';
  return state.settings.motion;
}
