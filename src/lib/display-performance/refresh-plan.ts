export type RefreshVisibility = "visible" | "hidden";

export type RefreshPlanReason =
  | "initial"
  | "forced"
  | "became-visible"
  | "interval"
  | "hidden"
  | "in-flight"
  | "not-due";

export interface RefreshPlanInput {
  nowMs: number;
  visibility: RefreshVisibility;
  lastAttemptAtMs: number | null;
  inFlight?: boolean;
  force?: boolean;
  visibilityChanged?: boolean;
  pauseWhenHidden?: boolean;
  visibleIntervalMs?: number;
  hiddenIntervalMs?: number;
}

export interface RefreshPlan {
  shouldRefresh: boolean;
  reason: RefreshPlanReason;
  delayMs: number | null;
  nextDueAtMs: number | null;
}

export const DEFAULT_VISIBLE_REFRESH_INTERVAL_MS = 5_000;
export const DEFAULT_HIDDEN_REFRESH_INTERVAL_MS = 30_000;

function interval(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(250, Math.floor(value!));
}

function now(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function planDisplayRefresh(input: RefreshPlanInput): RefreshPlan {
  const nowMs = now(input.nowMs);
  const visibleIntervalMs = interval(input.visibleIntervalMs, DEFAULT_VISIBLE_REFRESH_INTERVAL_MS);
  const hiddenIntervalMs = interval(input.hiddenIntervalMs, DEFAULT_HIDDEN_REFRESH_INTERVAL_MS);
  const pauseWhenHidden = input.pauseWhenHidden ?? true;
  const activeIntervalMs = input.visibility === "visible" ? visibleIntervalMs : hiddenIntervalMs;
  const lastAttemptAtMs = input.lastAttemptAtMs === null ? null : now(input.lastAttemptAtMs);

  if (input.inFlight) {
    return { shouldRefresh: false, reason: "in-flight", delayMs: activeIntervalMs, nextDueAtMs: null };
  }
  if (input.force) {
    return { shouldRefresh: true, reason: "forced", delayMs: 0, nextDueAtMs: nowMs };
  }
  if (input.visibility === "hidden" && pauseWhenHidden) {
    return { shouldRefresh: false, reason: "hidden", delayMs: null, nextDueAtMs: null };
  }
  if (input.visibilityChanged && input.visibility === "visible") {
    return { shouldRefresh: true, reason: "became-visible", delayMs: 0, nextDueAtMs: nowMs };
  }
  if (lastAttemptAtMs === null) {
    return { shouldRefresh: true, reason: "initial", delayMs: 0, nextDueAtMs: nowMs };
  }

  const nextDueAtMs = lastAttemptAtMs + activeIntervalMs;
  const delayMs = Math.max(0, nextDueAtMs - nowMs);
  if (delayMs === 0) return { shouldRefresh: true, reason: "interval", delayMs, nextDueAtMs };
  return { shouldRefresh: false, reason: "not-due", delayMs, nextDueAtMs };
}

export const getDisplayRefreshPlan = planDisplayRefresh;
