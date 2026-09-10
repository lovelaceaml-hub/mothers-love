import { describe, expect, it } from 'vitest';
import { projectPublicDisplayDailyAggregates } from './public-display-daily';

describe('projectPublicDisplayDailyAggregates', () => {
  it('accepts ordered anonymous daily aggregates', () => {
    expect(projectPublicDisplayDailyAggregates([
      { date: '2026-09-01', recognitions: 2, expressionCounts: [1,0,0,0,0,0,0,1,0], expressionTotal: 2 },
      { date: '2026-09-02', recognitions: 1, expressionCounts: [0,1,0,0,0,0,0,0,1], expressionTotal: 2 },
    ])).toEqual([
      { date: '2026-09-01', recognitions: 2, expressionCounts: [1,0,0,0,0,0,0,1,0], expressionTotal: 2 },
      { date: '2026-09-02', recognitions: 1, expressionCounts: [0,1,0,0,0,0,0,0,1], expressionTotal: 2 },
    ]);
  });

  it('rejects unordered, malformed, or negative rows', () => {
    expect(projectPublicDisplayDailyAggregates([
      { date: '2026-09-02', recognitions: 1, expressionCounts: Array(9).fill(0), expressionTotal: 0 },
      { date: '2026-09-01', recognitions: 1, expressionCounts: Array(9).fill(0), expressionTotal: 0 },
    ])).toBeNull();
    expect(projectPublicDisplayDailyAggregates([
      { date: '2026-09-01', recognitions: -1, expressionCounts: Array(9).fill(0), expressionTotal: 0 },
    ])).toBeNull();
    expect(projectPublicDisplayDailyAggregates([
      { date: 'bad', recognitions: 1, expressionCounts: Array(9).fill(0), expressionTotal: 0 },
    ])).toBeNull();
  });
});
