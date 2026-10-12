import { claimPollingRead, createPollingState, nextPollingBoundary, pollingInterval, type PollingState } from './polling-schedule';

/** Scheduled, visible reads. Late timers/wake events perform at most one catch-up attempt. */
export function startVisiblePoll(
  load: (initialRead: boolean) => void,
  fastIntervalMs: number,
  beforeResume?: () => void,
  options: { initial?: boolean; state?: PollingState } = {},
): () => void {
  const state = options.state ?? createPollingState();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  let boundary = nextPollingBoundary();
  let lastClock = Date.now();
  const hidden = () => document.hidden || document.visibilityState === 'hidden';
  const clear = () => { if (timer !== null) clearTimeout(timer); timer = null; };
  const run = () => {
    clear();
    if (stopped || hidden()) return;
    const now = Date.now();
    const previousMode = state.mode;
    const initialRead = state.initialPending && options.initial !== false;
    if (claimPollingRead(state, fastIntervalMs, now, options.initial !== false)) load(initialRead);
    if (stopped) return;
    if (now >= boundary || now < lastClock || previousMode !== state.mode) boundary = nextPollingBoundary(now);
    lastClock = now;
    const interval = pollingInterval(fastIntervalMs, now);
    const next = Math.min(boundary, interval === null ? Infinity : (state.lastStartedAt ?? now) + interval);
    timer = setTimeout(run, Math.max(1, next - Date.now()));
  };
  const resume = () => {
    if (!hidden()) beforeResume?.();
    run();
  };
  document.addEventListener('visibilitychange', resume);
  const page = typeof window === 'undefined' ? undefined : window;
  page?.addEventListener?.('pageshow', resume);
  page?.addEventListener?.('focus', resume);
  resume();
  return () => {
    stopped = true;
    clear();
    document.removeEventListener('visibilitychange', resume);
    page?.removeEventListener?.('pageshow', resume);
    page?.removeEventListener?.('focus', resume);
  };
}
