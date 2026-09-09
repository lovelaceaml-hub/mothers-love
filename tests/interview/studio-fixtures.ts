import {
  DISPLAY_EXTERNAL_URLS,
  DISPLAY_SCREEN_IDS,
  type DisplaySettings,
  type Recognition,
} from '@/lib/contracts';
import type { PublicPreviewSnapshot } from '@/components/display/preview';

export const STUDIO_SERVER_TIME = '2026-09-09T12:00:00.000Z';

export const studioSettings = (overrides: Partial<DisplaySettings> = {}): DisplaySettings => ({
  version: 12,
  mode: 'normal',
  motion: 'standard',
  pauseArrivals: false,
  pauseRotation: false,
  collectionOpen: true,
  lowActivityMinutes: 20,
  readingSeconds: 20,
  maxBubbles: 6,
  showTrails: true,
  showConstellations: true,
  gardenAmount: 'all-active',
  playlist: DISPLAY_SCREEN_IDS.map((id) => ({ id, enabled: true })),
  tempo: 'standard',
  durationOverrides: {},
  effects: { trails: true, constellations: true, sparkles: true, background: true },
  sound: { enabled: true, volume: 0.2, arrivalChime: true, milestoneChime: true },
  externalUrls: DISPLAY_EXTERNAL_URLS,
  ...overrides,
});

export const studioRecognition = (index = 1, options: { featured?: boolean; expiresAt?: string; message?: string } = {}): Recognition => ({
  id: `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
  recipient: `Synthetic recipient ${String.fromCharCode(64 + index)}`,
  message: options.message ?? `Synthetic appreciation message ${index}.`,
  expressionIds: [2, 8],
  createdAt: '2026-09-09T11:45:00.000Z',
  firstPublishedAt: '2026-09-09T11:46:00.000Z',
  expiresAt: options.expiresAt ?? '2026-09-16T12:00:00.000Z',
  version: 1,
  status: 'published',
  featured: options.featured ?? index === 1,
});

export function studioSnapshot(options: {
  serverTime?: string;
  expiresAt?: string;
  settings?: Partial<DisplaySettings>;
  recognitions?: Recognition[];
  revision?: number;
} = {}): PublicPreviewSnapshot {
  const serverTime = options.serverTime ?? STUDIO_SERVER_TIME;
  const recognitions = options.recognitions ?? [studioRecognition(1, { featured: true, expiresAt: options.expiresAt }), studioRecognition(2, { expiresAt: options.expiresAt })];
  const revision = options.revision ?? 12;
  return {
    serverTime,
    revision,
    recognitions,
    aggregate: {
      periodStart: '2026-09-01T07:00:00.000Z',
      periodEnd: '2026-10-01T07:00:00.000Z',
      recognitions: recognitions.length,
      expressionCounts: [recognitions.length, recognitions.length, 0, 0, 0, recognitions.length, 0, 0, 0],
      expressionTotal: recognitions.length * 3,
      revision,
    },
    settings: studioSettings(options.settings),
  };
}

export function asPublicEndpointPayload(snapshot: PublicPreviewSnapshot): Record<string, unknown> {
  return {
    ...snapshot,
    ok: true,
    submissionUrl: 'https://synthetic.invalid/recognize',
    cursor: '12.1',
    sync: 'reset',
    arrivals: [],
  };
}
