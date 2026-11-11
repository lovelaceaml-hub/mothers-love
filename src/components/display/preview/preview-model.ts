import { durationFor } from '@/lib/display/coordinator';
import {
  DEFAULT_DISPLAY_EFFECTS,
  DEFAULT_DISPLAY_PLAYLIST,
  DEFAULT_DISPLAY_SOUND,
  DISPLAY_EXTERNAL_URLS,
  DISPLAY_SCREEN_IDS,
  type Aggregate,
  type DisplayEffects,
  type DisplayMotion,
  type DisplayPlaylistEntry,
  type DisplayScreenId,
  type DisplaySettings,
  type DisplaySnapshot,
  type DisplaySound,
  type Recognition,
} from '@/lib/contracts';
import { UUID_PATTERN } from '@/lib/uuid';

export type PublicPreviewSnapshot = Pick<DisplaySnapshot, 'serverTime' | 'revision' | 'recognitions' | 'aggregate' | 'settings'>;
export type PreviewDecoration = {
  trails: boolean;
  constellations: boolean;
  sparkles: boolean;
  background: boolean;
};

export type PreviewEmptyReason = 'checking' | 'unavailable' | 'invalid' | 'private' | 'expired' | 'session';

const MIN_DURATION_SECONDS = 12;
const MAX_DURATION_SECONDS = 120;
const MAX_RECOGNITIONS = 1_000;
const PUBLIC_RECOGNITION_KEYS = new Set([
  'id',
  'recipient',
  'message',
  'expressionIds',
  'createdAt',
  'firstPublishedAt',
  'expiresAt',
  'version',
  'status',
  'featured',
]);
const PUBLIC_SETTINGS_KEYS = new Set([
  'version',
  'mode',
  'motion',
  'pauseArrivals',
  'pauseRotation',
  'collectionOpen',
  'lowActivityMinutes',
  'readingSeconds',
  'maxBubbles',
  'gardenAmount',
  'playlist',
  'tempo',
  'durationOverrides',
  'effects',
  'sound',
  'externalUrls',
  'showTrails',
  'showConstellations',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKnownKeys(value: Record<string, unknown>, known: Set<string>): boolean {
  return Object.keys(value).every((key) => known.has(key));
}

function isSafeInteger(value: unknown, minimum = 0): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum;
}

function parsedDate(value: unknown): number | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function graphemeCount(value: string): number {
  const Segmenter = (Intl as typeof Intl & {
    Segmenter?: new (
      locales?: string | string[],
      options?: { granularity: 'grapheme' },
    ) => { segment(input: string): Iterable<unknown> };
  }).Segmenter;
  if (Segmenter) return Array.from(new Segmenter(undefined, { granularity: 'grapheme' }).segment(value)).length;
  return Array.from(value).length;
}

function parseDuration(value: unknown): number | null {
  return isSafeInteger(value, MIN_DURATION_SECONDS) && value <= MAX_DURATION_SECONDS ? value : null;
}

function parsePlaylist(value: unknown): DisplayPlaylistEntry[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > DISPLAY_SCREEN_IDS.length) return null;
  const seen = new Set<DisplayScreenId>();
  const playlist: DisplayPlaylistEntry[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const id = item.id ?? item.screenId ?? item.screen;
    if (typeof id !== 'string' || !DISPLAY_SCREEN_IDS.includes(id as DisplayScreenId) || seen.has(id as DisplayScreenId)) return null;
    if (typeof item.enabled !== 'boolean') return null;
    if (item.durationSeconds !== undefined && item.durationSeconds !== null && parseDuration(item.durationSeconds) === null) return null;
    seen.add(id as DisplayScreenId);
    playlist.push({
      id: id as DisplayScreenId,
      enabled: item.enabled,
      ...(item.durationSeconds === undefined || item.durationSeconds === null ? {} : { durationSeconds: item.durationSeconds as number }),
    });
  }
  return playlist.some((entry) => entry.enabled) ? playlist : null;
}

function parseDurationOverrides(value: unknown): Partial<Record<DisplayScreenId, number>> | null {
  if (!isRecord(value)) return null;
  const result: Partial<Record<DisplayScreenId, number>> = {};
  for (const key of Object.keys(value)) {
    if (!DISPLAY_SCREEN_IDS.includes(key as DisplayScreenId)) return null;
    const duration = value[key];
    if (duration === null) continue;
    const parsed = parseDuration(duration);
    if (parsed === null) return null;
    result[key as DisplayScreenId] = parsed;
  }
  return result;
}

function parseEffects(value: unknown): DisplayEffects | null {
  if (!isRecord(value)) return null;
  const keys = new Set(['trails', 'constellations', 'sparkles', 'background']);
  if (!hasOnlyKnownKeys(value, keys)) return null;
  const result: Partial<DisplayEffects> = {};
  for (const key of keys) {
    if (value[key] !== undefined && typeof value[key] !== 'boolean') return null;
    if (value[key] !== undefined) result[key as keyof DisplayEffects] = value[key] as never;
  }
  return Object.keys(result).length ? result as DisplayEffects : null;
}

function parseSound(value: unknown): DisplaySound | null {
  if (!isRecord(value) || !hasOnlyKnownKeys(value, new Set(['enabled', 'volume', 'arrivalChime', 'milestoneChime']))) return null;
  if (typeof value.enabled !== 'boolean' || typeof value.volume !== 'number' || !Number.isFinite(value.volume) || value.volume < 0 || value.volume > 0.4) return null;
  if (typeof value.arrivalChime !== 'boolean' || typeof value.milestoneChime !== 'boolean') return null;
  return {
    enabled: value.enabled,
    volume: value.volume,
    arrivalChime: value.arrivalChime,
    milestoneChime: value.milestoneChime,
  };
}

function parseSettings(value: unknown): DisplaySettings | null {
  if (!isRecord(value) || !hasOnlyKnownKeys(value, PUBLIC_SETTINGS_KEYS)) return null;
  if (!isSafeInteger(value.version, 1)) return null;
  if (value.mode !== 'normal' && value.mode !== 'quiet' && value.mode !== 'neutral') return null;
  if (value.motion !== 'calm' && value.motion !== 'standard' && value.motion !== 'lively' && value.motion !== 'still') return null;
  if (typeof value.pauseArrivals !== 'boolean' || typeof value.pauseRotation !== 'boolean' || typeof value.collectionOpen !== 'boolean') return null;
  if (!isSafeInteger(value.lowActivityMinutes, 1) || value.lowActivityMinutes > 180) return null;
  if (!isSafeInteger(value.readingSeconds, 8) || value.readingSeconds > 60) return null;
  if (typeof value.showTrails !== 'boolean' || typeof value.showConstellations !== 'boolean') return null;

  const gardenAmount = value.gardenAmount === undefined
    ? 'all-active'
    : value.gardenAmount === 'all-active'
      ? value.gardenAmount
      : isSafeInteger(value.gardenAmount, 1)
        ? value.gardenAmount
        : null;
  if (gardenAmount === null) return null;

  const playlist = value.playlist === undefined ? DEFAULT_DISPLAY_PLAYLIST.map((entry) => ({ ...entry })) : parsePlaylist(value.playlist);
  if (!playlist) return null;
  const tempo = value.tempo === undefined ? 'standard' : value.tempo;
  if (tempo !== 'slow' && tempo !== 'standard' && tempo !== 'fast' && tempo !== 'calm' && tempo !== 'gentle' && tempo !== 'lively') return null;
  let durationOverrides: DisplaySettings['durationOverrides'];
  if (value.durationOverrides !== undefined) {
    const parsedDurationOverrides = parseDurationOverrides(value.durationOverrides);
    if (parsedDurationOverrides === null) return null;
    durationOverrides = parsedDurationOverrides;
  }
  let effects: DisplayEffects | undefined;
  if (value.effects !== undefined) {
    const parsedEffects = parseEffects(value.effects);
    if (parsedEffects === null) return null;
    effects = parsedEffects;
  }
  let sound: DisplaySound | undefined;
  if (value.sound !== undefined) {
    const parsedSound = parseSound(value.sound);
    if (parsedSound === null) return null;
    sound = parsedSound;
  }
  if (value.externalUrls !== undefined) {
    if (!isRecord(value.externalUrls) || value.externalUrls.dailyPractice !== DISPLAY_EXTERNAL_URLS.dailyPractice || value.externalUrls.peacePromise !== DISPLAY_EXTERNAL_URLS.peacePromise) return null;
  }
  if (value.maxBubbles !== undefined && !isSafeInteger(value.maxBubbles, 1)) return null;

  return {
    version: value.version,
    mode: value.mode,
    motion: value.motion,
    pauseArrivals: value.pauseArrivals,
    pauseRotation: value.pauseRotation,
    collectionOpen: value.collectionOpen,
    lowActivityMinutes: value.lowActivityMinutes,
    readingSeconds: value.readingSeconds,
    maxBubbles: value.maxBubbles === undefined ? 4 : value.maxBubbles,
    showTrails: value.showTrails,
    showConstellations: value.showConstellations,
    gardenAmount,
    playlist,
    tempo,
    ...(durationOverrides === undefined ? {} : { durationOverrides }),
    ...(effects === undefined ? {} : { effects }),
    ...(sound === undefined ? {} : { sound }),
    ...(value.externalUrls === undefined ? {} : { externalUrls: DISPLAY_EXTERNAL_URLS }),
  };
}

function parseRecognition(value: unknown, serverTimeMs: number): Recognition | null {
  if (!isRecord(value) || !hasOnlyKnownKeys(value, PUBLIC_RECOGNITION_KEYS)) return null;
  if (Object.prototype.hasOwnProperty.call(value, 'submittedName') || Object.prototype.hasOwnProperty.call(value, 'reason')) return null;
  if (typeof value.id !== 'string' || value.id.length === 0 || value.id.length > 128 || !UUID_PATTERN.test(value.id)) return null;
  if (typeof value.recipient !== 'string' || value.recipient.trim().length === 0 || graphemeCount(value.recipient) > 80) return null;
  if (typeof value.message !== 'string' || value.message.length === 0 || graphemeCount(value.message) > 500) return null;
  if (!Array.isArray(value.expressionIds) || value.expressionIds.length < 1 || value.expressionIds.length > 9) return null;
  if (!value.expressionIds.every((id): id is number => isSafeInteger(id, 1) && id <= 9)) return null;
  if (value.expressionIds.some((id, index, ids) => index > 0 && id <= ids[index - 1])) return null;
  const createdAt = parsedDate(value.createdAt);
  const firstPublishedAt = parsedDate(value.firstPublishedAt);
  const expiresAt = parsedDate(value.expiresAt);
  if (createdAt === null || firstPublishedAt === null || expiresAt === null) return null;
  if (createdAt > serverTimeMs || firstPublishedAt > serverTimeMs || firstPublishedAt < createdAt || expiresAt <= serverTimeMs || expiresAt <= firstPublishedAt) return null;
  if (!isSafeInteger(value.version, 1) || value.status !== 'published' || typeof value.featured !== 'boolean') return null;
  return {
    id: value.id,
    recipient: value.recipient,
    message: value.message,
    expressionIds: [...value.expressionIds],
    createdAt: value.createdAt as string,
    firstPublishedAt: value.firstPublishedAt as string,
    expiresAt: value.expiresAt as string,
    version: value.version,
    status: 'published',
    featured: value.featured,
  };
}

function parseAggregate(value: unknown): Aggregate | null {
  if (!isRecord(value)) return null;
  if (typeof value.periodStart !== 'string' || parsedDate(value.periodStart) === null) return null;
  if (typeof value.periodEnd !== 'string' || parsedDate(value.periodEnd) === null || value.periodEnd < value.periodStart) return null;
  if (!isSafeInteger(value.recognitions) || !Array.isArray(value.expressionCounts) || value.expressionCounts.length !== 9) return null;
  if (!value.expressionCounts.every((count) => isSafeInteger(count))) return null;
  if (!isSafeInteger(value.expressionTotal) || !isSafeInteger(value.revision)) return null;
  return {
    periodStart: value.periodStart,
    periodEnd: value.periodEnd,
    recognitions: value.recognitions,
    expressionCounts: [...value.expressionCounts] as number[],
    expressionTotal: value.expressionTotal,
    revision: value.revision,
  };
}

export function parsePublicPreviewSnapshot(value: unknown): PublicPreviewSnapshot | null {
  if (!isRecord(value)) return null;
  const serverTimeMs = parsedDate(value.serverTime);
  if (serverTimeMs === null || !isSafeInteger(value.revision, 1) || !Array.isArray(value.recognitions) || value.recognitions.length > MAX_RECOGNITIONS) return null;
  const settings = parseSettings(value.settings);
  const aggregate = parseAggregate(value.aggregate);
  if (!settings || !aggregate) return null;
  const recognitions: Recognition[] = [];
  const ids = new Set<string>();
  for (const rawRecognition of value.recognitions) {
    const recognition = parseRecognition(rawRecognition, serverTimeMs);
    if (!recognition || ids.has(recognition.id.toLowerCase())) return null;
    ids.add(recognition.id.toLowerCase());
    recognitions.push(recognition);
  }
  return {
    serverTime: value.serverTime as string,
    revision: value.revision,
    recognitions,
    aggregate,
    settings,
  };
}

export function snapshotExpiryDelayMs(snapshot: PublicPreviewSnapshot): number | null {
  if (!snapshot.recognitions.length) return null;
  const serverTimeMs = Date.parse(snapshot.serverTime);
  const earliestExpiry = Math.min(...snapshot.recognitions.map((recognition) => Date.parse(recognition.expiresAt)));
  if (!Number.isFinite(serverTimeMs) || !Number.isFinite(earliestExpiry)) return null;
  return Math.max(0, earliestExpiry - serverTimeMs);
}

export function snapshotHasExpired(snapshot: PublicPreviewSnapshot, nowMs = Date.now()): boolean {
  const serverTimeMs = Date.parse(snapshot.serverTime);
  const delay = snapshotExpiryDelayMs(snapshot);
  if (delay === null) return false;
  return nowMs >= serverTimeMs + delay;
}

export function previewEffects(settings: DisplaySettings): PreviewDecoration {
  return {
    trails: settings.effects?.trails ?? settings.showTrails,
    constellations: settings.effects?.constellations ?? settings.showConstellations,
    sparkles: settings.effects?.sparkles ?? DEFAULT_DISPLAY_EFFECTS.sparkles ?? true,
    background: settings.effects?.background ?? DEFAULT_DISPLAY_EFFECTS.background ?? true,
  };
}

export function previewSound(settings: DisplaySettings): DisplaySound {
  return { ...DEFAULT_DISPLAY_SOUND, ...(settings.sound ?? {}) };
}

export function previewTempo(settings: DisplaySettings): 'calm' | 'standard' | 'lively' {
  if (settings.tempo === 'calm' || settings.tempo === 'slow' || settings.tempo === 'gentle') return 'calm';
  if (settings.tempo === 'lively' || settings.tempo === 'fast') return 'lively';
  return 'standard';
}

export function previewMotion(settings: DisplaySettings): DisplayMotion {
  if (settings.motion === 'still') return 'still';
  return previewTempo(settings);
}

function tempoMultiplier(tempo: 'calm' | 'standard' | 'lively'): number {
  if (tempo === 'calm') return 1.25;
  if (tempo === 'lively') return 0.85;
  return 1;
}

function graphemeLength(value: string): number {
  return graphemeCount(value);
}

export function previewDurationMs(screen: DisplayScreenId, settings: DisplaySettings, snapshot: PublicPreviewSnapshot | null): number {
  const featured = snapshot?.recognitions.find(item => item.featured) ?? snapshot?.recognitions[0];
  return durationFor(screen === 'expressions' ? 'all-nine' : screen === 'shared-expression' ? 'cluster' : screen, settings, featured);
}

const SAMPLE_SETTINGS: DisplaySettings = {
  version: 1,
  mode: 'normal',
  motion: 'standard',
  pauseArrivals: false,
  pauseRotation: false,
  collectionOpen: true,
  lowActivityMinutes: 20,
  readingSeconds: 20,
  maxBubbles: 6,
  gardenAmount: 'all-active',
  playlist: DISPLAY_SCREEN_IDS.map((id) => ({ id, enabled: true })),
  tempo: 'standard',
  durationOverrides: {},
  effects: {
    trails: DEFAULT_DISPLAY_EFFECTS.trails,
    constellations: DEFAULT_DISPLAY_EFFECTS.constellations,
    sparkles: DEFAULT_DISPLAY_EFFECTS.sparkles,
    background: DEFAULT_DISPLAY_EFFECTS.background,
  },
  sound: {
    enabled: DEFAULT_DISPLAY_SOUND.enabled,
    volume: DEFAULT_DISPLAY_SOUND.volume,
    arrivalChime: DEFAULT_DISPLAY_SOUND.arrivalChime,
    milestoneChime: DEFAULT_DISPLAY_SOUND.milestoneChime,
  },
  externalUrls: DISPLAY_EXTERNAL_URLS,
  showTrails: true,
  showConstellations: true,
};

const SAMPLE_RECOGNITIONS: Recognition[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    recipient: 'Sample recipient A',
    message: 'Thank you for making room for a kinder day.',
    expressionIds: [2, 8],
    createdAt: '2026-09-09T11:54:00.000Z',
    firstPublishedAt: '2026-09-09T11:55:00.000Z',
    expiresAt: '2026-09-16T12:00:00.000Z',
    version: 1,
    status: 'published',
    featured: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    recipient: 'Sample recipient B',
    message: 'Your patient listening helped a hard moment feel lighter.',
    expressionIds: [1, 6],
    createdAt: '2026-09-09T11:50:00.000Z',
    firstPublishedAt: '2026-09-09T11:51:00.000Z',
    expiresAt: '2026-09-16T12:00:00.000Z',
    version: 1,
    status: 'published',
    featured: false,
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    recipient: 'Sample recipient C',
    message: 'You noticed what was needed and offered a hand.',
    expressionIds: [7, 8],
    createdAt: '2026-09-09T11:46:00.000Z',
    firstPublishedAt: '2026-09-09T11:47:00.000Z',
    expiresAt: '2026-09-16T12:00:00.000Z',
    version: 1,
    status: 'published',
    featured: false,
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    recipient: 'Sample recipient D',
    message: 'A simple thank you brought warmth to the room.',
    expressionIds: [2, 9],
    createdAt: '2026-09-09T11:42:00.000Z',
    firstPublishedAt: '2026-09-09T11:43:00.000Z',
    expiresAt: '2026-09-16T12:00:00.000Z',
    version: 1,
    status: 'published',
    featured: false,
  },
];

export function createSamplePreviewSnapshot(): PublicPreviewSnapshot {
  return {
    serverTime: '2026-09-09T12:00:00.000Z',
    revision: 1,
    recognitions: SAMPLE_RECOGNITIONS.map((recognition) => ({ ...recognition, expressionIds: [...recognition.expressionIds] })),
    aggregate: {
      periodStart: '2026-09-01T07:00:00.000Z',
      periodEnd: '2026-10-01T07:00:00.000Z',
      recognitions: SAMPLE_RECOGNITIONS.length,
      expressionCounts: [1, 2, 1, 0, 0, 1, 1, 2, 1],
      expressionTotal: 9,
      revision: 1,
    },
    settings: {
      ...SAMPLE_SETTINGS,
      playlist: SAMPLE_SETTINGS.playlist?.map((entry) => ({ ...entry })),
      durationOverrides: {},
      effects: SAMPLE_SETTINGS.effects ? {
        trails: SAMPLE_SETTINGS.effects.trails,
        constellations: SAMPLE_SETTINGS.effects.constellations,
        sparkles: SAMPLE_SETTINGS.effects.sparkles,
        background: SAMPLE_SETTINGS.effects.background,
      } : undefined,
      sound: SAMPLE_SETTINGS.sound ? {
        enabled: SAMPLE_SETTINGS.sound.enabled,
        volume: SAMPLE_SETTINGS.sound.volume,
        arrivalChime: SAMPLE_SETTINGS.sound.arrivalChime,
        milestoneChime: SAMPLE_SETTINGS.sound.milestoneChime,
      } : undefined,
    },
  };
}
