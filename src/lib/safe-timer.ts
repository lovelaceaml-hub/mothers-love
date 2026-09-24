export const SAFE_TIMER_MAX_DELAY_MS = 7 * 24 * 60 * 60 * 1_000;

export type SafeTimerHandle = {
  cancel: () => void;
};

export function setSafeTimeout(callback: () => void, delayMs: number): SafeTimerHandle {
  const normalizedDelay = Number.isFinite(delayMs) ? Math.max(0, delayMs) : SAFE_TIMER_MAX_DELAY_MS;
  const deadline = Date.now() + normalizedDelay;
  let cancelled = false;
  let timer: ReturnType<typeof globalThis.setTimeout> | undefined;

  const fire = () => {
    if (!cancelled) callback();
  };
  const schedule = () => {
    if (cancelled) return;
    const remaining = Math.max(0, deadline - Date.now());
    timer = remaining <= SAFE_TIMER_MAX_DELAY_MS
      ? globalThis.setTimeout(fire, remaining)
      : globalThis.setTimeout(schedule, SAFE_TIMER_MAX_DELAY_MS);
  };

  schedule();

  return {
    cancel: () => {
      cancelled = true;
      if (timer !== undefined) globalThis.clearTimeout(timer);
      timer = undefined;
    },
  };
}

export function clearSafeTimeout(handle: SafeTimerHandle | null | undefined): void {
  handle?.cancel();
}

