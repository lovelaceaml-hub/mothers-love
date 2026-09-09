export interface ReconnectCacheEntry<T> {
  value: T;
  storedAtMs: number;
  expiresAtMs: number;
}

export interface VolatileReconnectCache<T> {
  readonly hasValue: boolean;
  readonly expiresAtMs: number | null;
  set(value: T, storedAtMs: number, expiresAtMs?: number): void;
  write(value: T, storedAtMs: number, expiresAtMs?: number): void;
  get(nowMs: number): T | null;
  read(nowMs: number): T | null;
  getEntry(nowMs: number): ReconnectCacheEntry<T> | null;
  isFresh(nowMs: number): boolean;
  clear(): void;
}

export const DEFAULT_RECONNECT_CACHE_MAX_AGE_MS = 60_000;

export interface VolatileReconnectCacheOptions<T> {
  maxAgeMs?: number;
  clone?: (value: T) => T;
}

function finiteMs(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function maxAge(value: number | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_RECONNECT_CACHE_MAX_AGE_MS;
  return Math.max(0, Math.floor(value!));
}

export function createVolatileReconnectCache<T>(options: VolatileReconnectCacheOptions<T> = {}): VolatileReconnectCache<T> {
  const cacheMaxAgeMs = maxAge(options.maxAgeMs);
  const clone = options.clone ?? ((value: T): T => value);
  let entry: ReconnectCacheEntry<T> | null = null;

  const clearIfExpired = (nowMs: number): void => {
    if (entry && finiteMs(nowMs) >= entry.expiresAtMs) entry = null;
  };

  const set = (value: T, storedAtMs: number, expiresAtMs?: number): void => {
    const stored = finiteMs(storedAtMs);
    const maximumExpiry = stored + cacheMaxAgeMs;
    const requestedExpiry = expiresAtMs === undefined ? maximumExpiry : finiteMs(expiresAtMs);
    entry = {
      value: clone(value),
      storedAtMs: stored,
      expiresAtMs: Math.min(maximumExpiry, requestedExpiry),
    };
  };

  const getEntry = (nowMs: number): ReconnectCacheEntry<T> | null => {
    clearIfExpired(nowMs);
    return entry ? { ...entry, value: clone(entry.value) } : null;
  };

  return {
    get hasValue() {
      return entry !== null;
    },
    get expiresAtMs() {
      return entry?.expiresAtMs ?? null;
    },
    set,
    write: set,
    get(nowMs: number) {
      return getEntry(nowMs)?.value ?? null;
    },
    read(nowMs: number) {
      return getEntry(nowMs)?.value ?? null;
    },
    getEntry,
    isFresh(nowMs: number) {
      return getEntry(nowMs) !== null;
    },
    clear() {
      entry = null;
    },
  };
}

export const createSessionReconnectCache = createVolatileReconnectCache;
