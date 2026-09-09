export interface FairSelectionItem {
  id: string;
}

export type FairHistory = Readonly<Record<string, number>> | ReadonlyMap<string, number>;

export interface FairSelectionOptions<T extends FairSelectionItem> {
  limit: number;
  history?: FairHistory;
  round?: number;
  getPublishedAt?: (item: T) => number | string | null | undefined;
}

function historyValue(history: FairHistory | undefined, id: string): number {
  if (!history) return -1;
  const value = "get" in history && typeof history.get === "function"
    ? history.get(id)
    : (history as Readonly<Record<string, number>>)[id];
  return Number.isFinite(value) ? value! : -1;
}

function timestamp(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
  }
  return Number.POSITIVE_INFINITY;
}

function stableHash(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function uniqueItems<T extends FairSelectionItem>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function normalizedLimit(limit: number): number {
  return Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
}

export function selectFair<T extends FairSelectionItem>(
  items: readonly T[],
  options: FairSelectionOptions<T>,
): T[];
export function selectFair<T extends FairSelectionItem>(
  items: readonly T[],
  limit: number,
  history?: FairHistory,
  getPublishedAt?: (item: T) => number | string | null | undefined,
): T[];
export function selectFair<T extends FairSelectionItem>(
  items: readonly T[],
  optionsOrLimit: FairSelectionOptions<T> | number,
  history: FairHistory = {},
  getPublishedAt?: (item: T) => number | string | null | undefined,
): T[] {
  const options: FairSelectionOptions<T> = typeof optionsOrLimit === "number"
    ? { limit: optionsOrLimit, history, getPublishedAt }
    : optionsOrLimit;
  const unique = uniqueItems(items);
  const round = Number.isFinite(options.round) ? Math.floor(options.round!) : 0;
  const selectedLimit = Math.min(unique.length, normalizedLimit(options.limit));
  if (selectedLimit === 0) return [];

  return [...unique]
    .sort((left, right) => {
      const leftSeen = historyValue(options.history, left.id);
      const rightSeen = historyValue(options.history, right.id);
      if (leftSeen !== rightSeen) return leftSeen - rightSeen;

      const leftPublished = timestamp(options.getPublishedAt?.(left));
      const rightPublished = timestamp(options.getPublishedAt?.(right));
      if (leftPublished !== rightPublished) return leftPublished - rightPublished;

      const leftHash = stableHash(`${round}:${left.id}`);
      const rightHash = stableHash(`${round}:${right.id}`);
      if (leftHash !== rightHash) return leftHash - rightHash;
      return left.id.localeCompare(right.id);
    })
    .slice(0, selectedLimit);
}

export function recordFairSelection(
  history: FairHistory | undefined,
  selectedIds: readonly string[],
  presentedAt: number,
): Record<string, number> {
  const next: Record<string, number> = history instanceof Map ? Object.fromEntries(history.entries()) : { ...(history ?? {}) };
  for (const id of selectedIds) next[id] = presentedAt;
  return next;
}

export const selectFairRotation = selectFair;
