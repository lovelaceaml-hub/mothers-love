import { EXPRESSIONS, expressionById } from '@/lib/catalog';
import type { Aggregate, Recognition } from '@/lib/contracts';

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
