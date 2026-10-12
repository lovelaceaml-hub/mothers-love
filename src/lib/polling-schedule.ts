/** Campaign network schedule in Las Vegas/Pacific time, independent of device timezone. */
export const POLLING_TIME_ZONE = 'America/Los_Angeles';
export const SLOW_POLL_MS = 10 * 60_000;
export type PollingMode = 'fast' | 'slow' | 'paused';

const pacificClock = new Intl.DateTimeFormat('en-US', {
  timeZone: POLLING_TIME_ZONE, weekday: 'short', hour: '2-digit', hourCycle: 'h23',
});

export function pollingMode(nowMs = Date.now()): PollingMode {
  const parts = pacificClock.formatToParts(nowMs);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const day = parts.find((part) => part.type === 'weekday')?.value;
  if (hour < 7) return 'paused';
  if ((day === 'Sat' && hour >= 9 && hour < 22) || (day === 'Tue' && hour >= 18 && hour < 22)) return 'fast';
  return 'slow';
}

export function pollingInterval(fastIntervalMs: number, nowMs = Date.now()): number | null {
  const mode = pollingMode(nowMs);
  return mode === 'paused' ? null : mode === 'fast' ? fastIntervalMs : SLOW_POLL_MS;
}

/** Pacific boundaries fall on UTC hours; scanning absolute hours handles both DST changes. */
export function nextPollingBoundary(nowMs = Date.now()): number {
  const mode = pollingMode(nowMs);
  const nextHour = (Math.floor(nowMs / 3_600_000) + 1) * 3_600_000;
  for (let hour = nextHour; hour <= nextHour + 26 * 3_600_000; hour += 3_600_000) {
    if (pollingMode(hour) !== mode) return hour;
  }
  throw new Error('Polling schedule has no next boundary');
}

export type PollingState = { lastStartedAt: number | null; initialPending: boolean; mode: PollingMode | null };
export const createPollingState = (): PollingState => ({ lastStartedAt: null, initialPending: true, mode: null });

/** One initial, user-opened page read is allowed even overnight; recurring attempts are gated. */
export function claimPollingRead(state: PollingState, fastIntervalMs: number, nowMs = Date.now(), initial = true): boolean {
  const mode = pollingMode(nowMs);
  const previousMode = state.mode;
  state.mode = mode;
  if (state.initialPending) {
    state.initialPending = false;
    state.lastStartedAt = nowMs;
    return initial;
  }
  const interval = pollingInterval(fastIntervalMs, nowMs);
  if (interval === null) return false;
  const enteringWindow = previousMode !== null && previousMode !== mode && (mode === 'fast' || previousMode === 'paused');
  if (state.lastStartedAt !== null && state.lastStartedAt > nowMs) state.lastStartedAt = nowMs;
  if (!enteringWindow && state.lastStartedAt !== null && nowMs - state.lastStartedAt < interval) return false;
  state.lastStartedAt = nowMs;
  return true;
}

/** Planned slow/overnight pauses retain the last snapshot; failures keep the freshness limit. */
export function snapshotFreshnessRequired(failed = false, nowMs = Date.now()): boolean {
  return failed || pollingMode(nowMs) === 'fast';
}
