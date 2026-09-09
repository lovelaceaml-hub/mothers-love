import { EXPRESSIONS, expressionById } from '@/lib/catalog';
import type { Aggregate, DisplayMotion, Recognition } from '@/lib/contracts';

export const INSIGHT_STORY_TIMINGS = {
  nine: {
    petalWaveMs: 2_800,
    cardsOpenMs: 3_400,
    settledMs: 7_000,
  },
  shared: {
    recognitionMs: 0,
    weaveMs: 3_200,
    revealMs: 6_100,
    settledMs: 8_400,
  },
  impact: {
    totalMs: 0,
    ribbonsMs: 1_450,
    settledMs: 5_800,
  },
} as const;

export type InsightStory = keyof typeof INSIGHT_STORY_TIMINGS;
export type InsightStoryPhase = 'opening' | 'weaving' | 'revealing' | 'settled';

export function normalizeElapsedMs(elapsedMs?: number): number {
  return typeof elapsedMs === 'number' && Number.isFinite(elapsedMs) && elapsedMs >= 0
    ? Math.floor(elapsedMs)
    : 0;
}

/**
 * Maps the parent display clock to a stable visual phase. The insight views
 * never create their own timers, so browser checks can seek the same scene
 * with an injected elapsed value.
 */
export function insightStoryPhaseAt(story: InsightStory, elapsedMs?: number): InsightStoryPhase {
  const elapsed = normalizeElapsedMs(elapsedMs);
  if (story === 'impact') {
    const timing = INSIGHT_STORY_TIMINGS.impact;
    return elapsed < timing.ribbonsMs ? 'opening' : elapsed < timing.settledMs ? 'revealing' : 'settled';
  }
  if (story === 'nine') {
    const timing = INSIGHT_STORY_TIMINGS.nine;
    return elapsed < timing.cardsOpenMs ? 'opening' : elapsed < timing.settledMs ? 'revealing' : 'settled';
  }
  const timing = INSIGHT_STORY_TIMINGS.shared;
  if (elapsed < timing.weaveMs) return 'opening';
  if (elapsed < timing.revealMs) return 'weaving';
  if (elapsed < timing.settledMs) return 'revealing';
  return 'settled';
}

export const INSIGHT_MOTION_CLASSES: Record<DisplayMotion, string> = {
  calm: 'motionCalm',
  standard: 'motionStandard',
  lively: 'motionLively',
  still: 'motionStill',
};

export type ImpactAggregate = Pick<Aggregate, 'periodStart' | 'recognitions' | 'expressionCounts' | 'expressionTotal'>;

/**
 * Keep the nine positions safe when a compatible older snapshot omits a count.
 * The component never creates totals from personal records, it only reads the
 * anonymous aggregate that the display snapshot provides.
 */
export function expressionCountsFor(aggregate: ImpactAggregate | null | undefined): number[] {
  const rawCounts = aggregate?.expressionCounts;
  return EXPRESSIONS.map((_, index) => {
    const count = Array.isArray(rawCounts) ? rawCounts[index] : undefined;
    return typeof count === 'number' && Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
  });
}

export function safeAggregateNumber(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

export function sharedExpressionId(
  recognitions: readonly Recognition[] | null | undefined,
  requestedId?: number | null,
): number | null {
  if (requestedId != null && expressionById(requestedId)) return requestedId;
  if (!recognitions?.length) return null;

  // The catalog order is the only tie-breaker. This keeps the selector stable
  // without sorting people or ranking recognitions.
  return EXPRESSIONS.find((item) => {
    const connected = recognitions.filter((recognition) => Array.isArray(recognition.expressionIds) && recognition.expressionIds.includes(item.id));
    return connected.length > 1;
  })?.id ?? null;
}

export function connectedRecognitions(
  recognitions: readonly Recognition[] | null | undefined,
  requestedId?: number | null,
): Recognition[] {
  const id = sharedExpressionId(recognitions, requestedId);
  if (id == null || !recognitions) return [];
  return recognitions.filter((recognition) => Array.isArray(recognition.expressionIds) && recognition.expressionIds.includes(id));
}

export function formatImpactPeriod(periodStart?: string): string {
  if (!periodStart) return 'Current month';
  const date = new Date(periodStart);
  if (Number.isNaN(date.valueOf())) return 'Current month';
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date);
}

export function expressionColor(id: number): string {
  return expressionById(id)?.color ?? EXPRESSIONS[0].color;
}
