import { describe, expect, it } from 'vitest';

import { EXPRESSIONS } from '@/lib/catalog';
import type { Recognition } from '@/lib/contracts';
import {
  connectedRecognitions,
  expressionCountsFor,
  formatImpactPeriod,
  safeAggregateNumber,
  sharedExpressionId,
} from '@/components/display/insights/insights-data';

function recognition(id: string, expressionIds: number[]): Recognition {
  return {
    id,
    recipient: `Synthetic recipient ${id}`,
    message: `Synthetic message ${id}`,
    expressionIds,
    createdAt: '2026-09-09T12:00:00.000Z',
    firstPublishedAt: '2026-09-09T12:00:00.000Z',
    expiresAt: '2026-09-16T12:00:00.000Z',
    version: 1,
    status: 'published',
    featured: false,
  };
}

describe('display insights selectors', () => {
  it('keeps nine aggregate positions, sanitizing missing or invalid counts', () => {
    const counts = expressionCountsFor({
      periodStart: '2026-09-01T07:00:00.000Z',
      recognitions: 4,
      expressionCounts: [3, Number.NaN, -4, 2.9],
      expressionTotal: 7,
    });

    expect(counts).toEqual([3, 0, 0, 2, 0, 0, 0, 0, 0]);
    expect(counts).toHaveLength(EXPRESSIONS.length);
  });

  it('uses an injected expression first and preserves recognition order', () => {
    const records = [recognition('first', [2, 8]), recognition('second', [2]), recognition('third', [8])];

    expect(sharedExpressionId(records, 8)).toBe(8);
    expect(connectedRecognitions(records, 8).map(({ id }) => id)).toEqual(['first', 'third']);
  });

  it('finds the first catalog-ordered shared expression without ranking people', () => {
    const records = [recognition('first', [4, 9]), recognition('second', [9, 4])];

    expect(sharedExpressionId(records)).toBe(4);
    expect(connectedRecognitions(records).map(({ id }) => id)).toEqual(['first', 'second']);
  });

  it('returns safe empty selections and a stable period label', () => {
    expect(sharedExpressionId([])).toBeNull();
    expect(connectedRecognitions(undefined)).toEqual([]);
    expect(formatImpactPeriod('bad-date')).toBe('Current month');
    expect(formatImpactPeriod('2026-09-01T07:00:00.000Z')).toBe('September 2026');
    expect(safeAggregateNumber(Number.NaN)).toBe(0);
    expect(safeAggregateNumber(4.9)).toBe(4);
  });
});
