import {
  DISPLAY_EXTERNAL_URLS,
  DISPLAY_SCREEN_IDS,
  type DisplaySettings,
  type DisplaySnapshot,
} from '@/lib/contracts';

export const SYNTHETIC_SERVER_TIME = '2026-09-08T12:00:00.000Z';

export const PLAN08_SCREEN_LABELS = {
  garden: 'Recognition Garden',
  featured: 'Featured Recognition',
  impact: 'Monthly Impact',
  expressions: 'Nine Expressions',
  'shared-expression': 'Shared Expression',
  spotlight: 'Expression Spotlight',
  'daily-practice': 'Daily Practice',
  'one-kind-word': 'One Kind Word',
  'everyday-peace': 'Everyday Peace',
  'peace-promise': 'Peace Promise',
} as const;

const BASE_SETTINGS: DisplaySettings = {
  version: 8,
  mode: 'normal',
  motion: 'still',
  pauseArrivals: false,
  pauseRotation: false,
  collectionOpen: true,
  lowActivityMinutes: 20,
  readingSeconds: 20,
  maxBubbles: 6,
  showTrails: true,
  showConstellations: true,
};

export function modernDisplaySettings(overrides: Partial<DisplaySettings> = {}): DisplaySettings {
  return {
    ...BASE_SETTINGS,
    gardenAmount: 'all-active',
    playlist: DISPLAY_SCREEN_IDS.map((id) => ({ id, enabled: true })),
    tempo: 'standard',
    durationOverrides: {},
    effects: { trails: true, constellations: true, sparkles: true, background: true },
    sound: { enabled: true, volume: 0.2, arrivalChime: true, milestoneChime: true },
    externalUrls: DISPLAY_EXTERNAL_URLS,
    ...overrides,
  };
}

export function syntheticRecognition(id: number, options: { longMessage?: boolean } = {}) {
  return {
    id: `synthetic-plan08-${id}`,
    recipient: `Synthetic recipient ${id}`,
    message: options.longMessage
      ? Array.from({ length: 28 }, (_, line) => `Long message line ${line + 1} remains readable.\n`).join('').slice(0, 500)
      : `Synthetic appreciation message ${id}.`,
    expressionIds: [1, 2, 6],
    createdAt: SYNTHETIC_SERVER_TIME,
    firstPublishedAt: new Date(Date.parse(SYNTHETIC_SERVER_TIME) + id * 1_000).toISOString(),
    expiresAt: '2026-09-15T12:00:00.000Z',
    version: 1,
    status: 'published' as const,
    featured: false,
  };
}

export function syntheticSnapshot(options: {
  count?: number;
  settings?: Partial<DisplaySettings>;
  submissionUrl?: string;
  longMessage?: boolean;
  revision?: number;
} = {}): DisplaySnapshot {
  const count = options.count ?? 2;
  const revision = options.revision ?? 1;
  const recognitions = Array.from({ length: count }, (_, index) => syntheticRecognition(index + 1, { longMessage: options.longMessage }));
  return {
    serverTime: SYNTHETIC_SERVER_TIME,
    revision,
    recognitions,
    aggregate: {
      periodStart: '2026-09-01T07:00:00.000Z',
      periodEnd: '2026-10-01T07:00:00.000Z',
      recognitions: count,
      expressionCounts: [count, count, 0, 0, 0, count, 0, 0, 0],
      expressionTotal: count * 3,
      revision,
    },
    settings: modernDisplaySettings(options.settings),
    submissionUrl: options.submissionUrl ?? 'https://synthetic.invalid/recognize',
    cursor: `synthetic-plan08-${revision}`,
    sync: 'reset',
    arrivals: [],
  };
}

export function snapshotWithLargeActiveSet(count = 96): DisplaySnapshot {
  return syntheticSnapshot({
    count,
    settings: { gardenAmount: 999, maxBubbles: 6 },
  });
}
