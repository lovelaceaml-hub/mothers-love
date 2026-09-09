export type AdaptiveQualityLevel = "full" | "smooth" | "minimal";

export interface AdaptiveQualityEffects {
  background: boolean;
  sparkles: boolean;
  trails: boolean;
  constellations: boolean;
}

export interface AdaptiveQualityState {
  level: AdaptiveQualityLevel;
  frameBudgetMs: number;
  degradeAfterFrames: number;
  recoverAfterFrames: number;
  overBudgetFrames: number;
  goodFrameStreak: number;
  lastFrameDurationMs: number | null;
  lastUpdatedAtMs: number | null;
  effects: AdaptiveQualityEffects;
  contentEnabled: true;
  coreTransitionsEnabled: true;
  smoothMode: boolean;
}

export interface AdaptiveQualityOptions {
  frameBudgetMs?: number;
  degradeAfterFrames?: number;
  recoverAfterFrames?: number;
  initialLevel?: AdaptiveQualityLevel;
}

const DEFAULT_FRAME_BUDGET_MS = 16.67;
const DEFAULT_DEGRADE_AFTER_FRAMES = 3;
const DEFAULT_RECOVER_AFTER_FRAMES = 24;

export function effectsForQuality(level: AdaptiveQualityLevel): AdaptiveQualityEffects {
  if (level === "minimal") {
    return { background: false, sparkles: false, trails: false, constellations: false };
  }
  if (level === "smooth") {
    return { background: false, sparkles: false, trails: false, constellations: true };
  }
  return { background: true, sparkles: true, trails: true, constellations: true };
}

function positive(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.floor(value!));
}

function budget(value: number | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_FRAME_BUDGET_MS;
  return Math.max(1, value!);
}

function stateFor(level: AdaptiveQualityLevel, options: AdaptiveQualityOptions): AdaptiveQualityState {
  return {
    level,
    frameBudgetMs: budget(options.frameBudgetMs),
    degradeAfterFrames: positive(options.degradeAfterFrames, DEFAULT_DEGRADE_AFTER_FRAMES),
    recoverAfterFrames: positive(options.recoverAfterFrames, DEFAULT_RECOVER_AFTER_FRAMES),
    overBudgetFrames: 0,
    goodFrameStreak: 0,
    lastFrameDurationMs: null,
    lastUpdatedAtMs: null,
    effects: effectsForQuality(level),
    contentEnabled: true,
    coreTransitionsEnabled: true,
    smoothMode: level !== "full",
  };
}

export function createAdaptiveQualityState(options: AdaptiveQualityOptions = {}): AdaptiveQualityState {
  return stateFor(options.initialLevel ?? "full", options);
}

function levelAfterDegrade(level: AdaptiveQualityLevel): AdaptiveQualityLevel {
  return level === "full" ? "smooth" : "minimal";
}

function levelAfterRecovery(level: AdaptiveQualityLevel): AdaptiveQualityLevel {
  return level === "minimal" ? "smooth" : "full";
}

function withLevel(state: AdaptiveQualityState, level: AdaptiveQualityLevel): AdaptiveQualityState {
  return { ...state, level, effects: effectsForQuality(level), smoothMode: level !== "full" };
}

export function setAdaptiveQuality(state: AdaptiveQualityState, level: AdaptiveQualityLevel): AdaptiveQualityState {
  return withLevel({ ...state, overBudgetFrames: 0, goodFrameStreak: 0 }, level);
}

export function observeFrame(
  state: AdaptiveQualityState,
  frameDurationMs: number,
  nowMs?: number,
): AdaptiveQualityState {
  const duration = Number.isFinite(frameDurationMs) ? Math.max(0, frameDurationMs) : state.frameBudgetMs;
  const isOverBudget = duration > state.frameBudgetMs * 1.25;
  const isGood = duration <= state.frameBudgetMs;
  let next: AdaptiveQualityState = {
    ...state,
    lastFrameDurationMs: duration,
    lastUpdatedAtMs: nowMs === undefined || !Number.isFinite(nowMs) ? state.lastUpdatedAtMs : nowMs,
    overBudgetFrames: isOverBudget ? state.overBudgetFrames + 1 : Math.max(0, state.overBudgetFrames - 1),
    goodFrameStreak: isGood ? state.goodFrameStreak + 1 : 0,
  };

  if (next.overBudgetFrames >= state.degradeAfterFrames && state.level !== "minimal") {
    next = withLevel({ ...next, overBudgetFrames: 0, goodFrameStreak: 0 }, levelAfterDegrade(state.level));
  } else if (next.goodFrameStreak >= state.recoverAfterFrames && state.level !== "full") {
    next = withLevel({ ...next, overBudgetFrames: 0, goodFrameStreak: 0 }, levelAfterRecovery(state.level));
  }
  return next;
}

export const updateAdaptiveQuality = observeFrame;
