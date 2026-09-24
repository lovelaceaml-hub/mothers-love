/** The TV coordinator's state and actions, shared by the reducer and its helpers. */
import type { DisplaySettings, DisplaySnapshot } from '@/lib/contracts';

export type DisplayScreen =
  | 'garden'
  | 'featured'
  | 'cluster'
  | 'impact'
  | 'all-nine'
  | 'spotlight'
  | 'daily-practice'
  | 'one-kind-word'
  | 'everyday-peace'
  | 'peace-promise'
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
  storyVisits: Partial<Record<DisplayScreen, number>>;
  featuredHistory: Record<string, number>;
  gardenIntroducedAt: Record<string, number>;
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
