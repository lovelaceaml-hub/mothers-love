import type { Aggregate, DisplayGardenAmount, Recognition } from '@/lib/contracts';

/**
 * The Garden deliberately accepts a smaller public projection than a full
 * recognition record. Submitted names, moderation reasons, and other private
 * fields cannot be passed to these components by type.
 */
export type GardenRecognition = Pick<
  Recognition,
  'id' | 'recipient' | 'message' | 'expressionIds' | 'createdAt' | 'firstPublishedAt' | 'featured'
>;

/** Aggregate values used by the public milestone and summary scenes. */
export type GardenAggregate = Pick<Aggregate, 'periodStart' | 'periodEnd' | 'recognitions' | 'expressionCounts' | 'expressionTotal'>;

export type GardenDetailTier = 'compact' | 'standard' | 'detailed';
export type GardenEntryTreatment = 'seed' | 'ribbon' | 'bloom';
export type GardenArrivalMode = 'individual' | 'grouped';
export type GardenDecorationLevel = 'full' | 'soft' | 'minimal';
export type GardenReconnectStatus = 'connected' | 'reconnecting' | 'offline-safe';

export const GARDEN_POOL_CAP = 12;
export const GARDEN_NEWEST_WINDOW_MS = 8_000;
export const GARDEN_GROUP_ARRIVAL_THRESHOLD = 10;
export const GARDEN_MILESTONE_INTERVAL = 25;
export const GARDEN_RECONNECT_GRACE_MS = 60_000;

export interface GardenPoolState {
  activeIds: readonly string[];
  presentationHistory: Readonly<Record<string, number>>;
  rotation: number;
}

export interface GardenReconnectMemory {
  status: GardenReconnectStatus;
  records: readonly GardenRecognition[];
  lastSuccessfulAtMs: number | null;
}

export interface GardenDecoration {
  sparkles: boolean;
  background: boolean;
  trails: boolean;
  constellations: boolean;
}

export const GARDEN_ENTRY_TREATMENTS: readonly GardenEntryTreatment[] = ['seed', 'ribbon', 'bloom'];

function graphemeUnits(text: string): string[] {
  const Segmenter = (Intl as typeof Intl & {
    Segmenter?: new (
      locales?: string | string[],
      options?: { granularity: 'grapheme' },
    ) => { segment(input: string): Iterable<{ segment: string }> };
  }).Segmenter;

  if (Segmenter) {
    return Array.from(new Segmenter(undefined, { granularity: 'grapheme' }).segment(text), (part) => part.segment);
  }
  return Array.from(text);
}

function publishedTime(record: GardenRecognition): number {
  const published = Date.parse(record.firstPublishedAt ?? record.createdAt);
  return Number.isFinite(published) ? published : 0;
}

export function projectGardenRecognition(record: Recognition): GardenRecognition {
  return {
    id: record.id,
    recipient: record.recipient,
    message: record.message,
    expressionIds: [...record.expressionIds],
    createdAt: record.createdAt,
    firstPublishedAt: record.firstPublishedAt,
    featured: record.featured,
  };
}

export function projectGardenAggregate(aggregate: Aggregate): GardenAggregate {
  return {
    periodStart: aggregate.periodStart,
    periodEnd: aggregate.periodEnd,
    recognitions: aggregate.recognitions,
    expressionCounts: [...aggregate.expressionCounts],
    expressionTotal: aggregate.expressionTotal,
  };
}

/**
 * Resolve the requested amount without allocating one browser node per
 * active record. The caller may still keep a larger server-side collection.
 */
export function resolveGardenAmount(amount: DisplayGardenAmount | undefined, availableCount: number): number {
  const available = Math.max(0, Math.floor(availableCount));
  if (amount === 'all-active' || amount === undefined) return Math.min(available, GARDEN_POOL_CAP);
  if (!Number.isSafeInteger(amount) || amount < 1) return Math.min(available, GARDEN_POOL_CAP);
  return Math.min(amount, available, GARDEN_POOL_CAP);
}

/** Fair ordering favors records shown least often, then newest records. */
export function fairGardenOrder(
  records: readonly GardenRecognition[],
  presentationHistory: Readonly<Record<string, number>> = {},
): GardenRecognition[] {
  return [...records].sort((left, right) => {
    const leftPresented = presentationHistory[left.id] ?? -1;
    const rightPresented = presentationHistory[right.id] ?? -1;
    if (leftPresented !== rightPresented) return leftPresented - rightPresented;
    const publishedDifference = publishedTime(right) - publishedTime(left);
    if (publishedDifference !== 0) return publishedDifference;
    return left.id.localeCompare(right.id);
  });
}

function uniqueRecords(records: readonly GardenRecognition[]): GardenRecognition[] {
  const seen = new Set<string>();
  return records.filter((record) => {
    if (seen.has(record.id)) return false;
    seen.add(record.id);
    return true;
  });
}

/** Choose a bounded, fair Garden pool for a display transition. */
export function selectFairGarden(
  records: readonly GardenRecognition[],
  amount: DisplayGardenAmount | undefined = 'all-active',
  presentationHistory: Readonly<Record<string, number>> = {},
): GardenRecognition[] {
  const unique = uniqueRecords(records);
  return fairGardenOrder(unique, presentationHistory).slice(0, resolveGardenAmount(amount, unique.length));
}

/**
 * Advance one fair rotation. Unseen records have priority, then records with
 * the oldest presentation timestamp. This is deterministic and testable.
 */
export function rotateGardenPool(
  state: GardenPoolState,
  records: readonly GardenRecognition[],
  amount: DisplayGardenAmount | undefined,
  nowMs: number,
): GardenPoolState {
  const unique = uniqueRecords(records);
  const limit = resolveGardenAmount(amount, unique.length);
  const ordered = fairGardenOrder(unique, state.presentationHistory);
  const activeIds = ordered.slice(0, limit).map((record) => record.id);
  const presentationHistory = { ...state.presentationHistory };
  for (const id of activeIds) presentationHistory[id] = nowMs;
  return {
    activeIds,
    presentationHistory,
    rotation: state.rotation + 1,
  };
}

/** Retain valid cards and fill newly available slots without retiring content. */
export function reconcileGardenPool(
  state: GardenPoolState,
  records: readonly GardenRecognition[],
  amount: DisplayGardenAmount | undefined,
): GardenPoolState {
  const unique = uniqueRecords(records);
  const byId = new Map(unique.map((record) => [record.id, record]));
  const limit = resolveGardenAmount(amount, unique.length);
  const retained = state.activeIds.filter((id) => byId.has(id)).slice(0, limit);
  const retainedSet = new Set(retained);
  const replacements = fairGardenOrder(unique, state.presentationHistory)
    .filter((record) => !retainedSet.has(record.id))
    .slice(0, Math.max(0, limit - retained.length))
    .map((record) => record.id);
  return { ...state, activeIds: [...retained, ...replacements] };
}

export function createGardenPoolState(): GardenPoolState {
  return { activeIds: [], presentationHistory: {}, rotation: 0 };
}

export function detailTierFor(record: GardenRecognition): GardenDetailTier {
  const length = graphemeUnits(record.message).length;
  if (length <= 120) return 'compact';
  if (length <= 300) return 'standard';
  return 'detailed';
}

export function gardenMessagePreview(record: GardenRecognition, tier = detailTierFor(record)): string {
  const limits: Record<GardenDetailTier, number> = { compact: 90, standard: 180, detailed: 280 };
  const units = graphemeUnits(record.message);
  const limit = limits[tier];
  if (units.length <= limit) return record.message;
  return `${units.slice(0, limit).join('').trimEnd()}...`;
}

export function newestGardenId(records: readonly GardenRecognition[]): string | null {
  return records.reduce<string | null>((newest, record) => {
    if (!newest) return record.id;
    const current = records.find((candidate) => candidate.id === newest);
    if (!current) return record.id;
    const difference = publishedTime(record) - publishedTime(current);
    return difference > 0 || (difference === 0 && record.id.localeCompare(current.id) > 0) ? record.id : newest;
  }, null);
}

export function isNewestGardenCard(
  record: GardenRecognition,
  records: readonly GardenRecognition[],
  nowMs: number,
): boolean {
  const newestId = newestGardenId(records);
  const age = nowMs - publishedTime(record);
  return record.id === newestId && age >= 0 && age <= GARDEN_NEWEST_WINDOW_MS;
}

export function entryTreatmentFor(index: number, rotation = 0): GardenEntryTreatment {
  const safeIndex = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;
  const safeRotation = Number.isFinite(rotation) ? Math.max(0, Math.floor(rotation)) : 0;
  return GARDEN_ENTRY_TREATMENTS[(safeIndex + safeRotation) % GARDEN_ENTRY_TREATMENTS.length];
}

export function arrivalModeFor(count: number): GardenArrivalMode {
  return count >= GARDEN_GROUP_ARRIVAL_THRESHOLD ? 'grouped' : 'individual';
}

export function milestoneThresholdsThrough(approvalTotal: number): number[] {
  const total = Math.max(0, Math.floor(approvalTotal));
  const thresholds: number[] = [];
  for (let threshold = GARDEN_MILESTONE_INTERVAL; threshold <= total; threshold += GARDEN_MILESTONE_INTERVAL) {
    thresholds.push(threshold);
  }
  return thresholds;
}

export function nextCollectiveMilestone(approvalTotal: number, celebrated: readonly number[] = []): number | null {
  const celebratedSet = new Set(celebrated);
  const pending = milestoneThresholdsThrough(approvalTotal).filter((threshold) => !celebratedSet.has(threshold));
  return pending.length ? pending[pending.length - 1] : null;
}

/** Disable decoration in a content-preserving order when the frame budget tightens. */
export function adaptGardenDecoration(
  level: GardenDecorationLevel,
  requested: GardenDecoration = { sparkles: true, background: true, trails: true, constellations: true },
): GardenDecoration {
  if (level === 'minimal') return { ...requested, sparkles: false, background: false };
  if (level === 'soft') return { ...requested, sparkles: false };
  return { ...requested };
}

export function splitGardenMessage(message: string, maxGraphemes = 180, maxLines = 7): string[] {
  const units = graphemeUnits(message);
  if (!units.length) return [''];
  const pages: string[] = [];
  let cursor = 0;
  const safeGraphemes = Math.max(1, Math.floor(maxGraphemes));
  const safeLines = Math.max(1, Math.floor(maxLines));
  while (cursor < units.length) {
    let end = cursor;
    let newlineCount = 0;
    while (end < units.length && end - cursor < safeGraphemes) {
      const unit = units[end];
      if (unit === '\n' && newlineCount >= safeLines) break;
      end += 1;
      if (unit === '\n') newlineCount += 1;
      if (newlineCount >= safeLines) break;
    }
    if (end === cursor) end += 1;
    if (end < units.length && newlineCount < safeLines) {
      const whitespace = units.slice(cursor, end).reduce(
        (last, unit, index) => (/\s/u.test(unit) ? cursor + index : last),
        -1,
      );
      if (whitespace > cursor + Math.floor(safeGraphemes * 0.55)) end = whitespace + 1;
    }
    pages.push(units.slice(cursor, end).join(''));
    cursor = end;
  }
  return pages;
}

export function createGardenReconnectMemory(records: readonly GardenRecognition[] = [], nowMs: number | null = null): GardenReconnectMemory {
  return { status: 'connected', records: [...records], lastSuccessfulAtMs: nowMs };
}

export function gardenReconnectSucceeded(
  memory: GardenReconnectMemory,
  records: readonly GardenRecognition[],
  nowMs: number,
): GardenReconnectMemory {
  return { status: 'connected', records: [...records], lastSuccessfulAtMs: nowMs };
}

/**
 * Reconnect memory is intentionally RAM-only. It keeps the last safe public
 * projection during the short grace interval, then clears it.
 */
export function gardenReconnectUnavailable(
  memory: GardenReconnectMemory,
  nowMs: number,
  graceMs = GARDEN_RECONNECT_GRACE_MS,
): GardenReconnectMemory {
  const lastSuccessfulAtMs = memory.lastSuccessfulAtMs;
  const withinGrace = lastSuccessfulAtMs !== null && nowMs - lastSuccessfulAtMs < Math.max(0, graceMs);
  return {
    status: withinGrace ? 'reconnecting' : 'offline-safe',
    records: withinGrace ? memory.records : [],
    lastSuccessfulAtMs,
  };
}
