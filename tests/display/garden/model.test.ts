import { describe, expect, it } from 'vitest';

import {
  adaptGardenDecoration,
  arrivalModeFor,
  createGardenPoolState,
  createGardenReconnectMemory,
  detailTierFor,
  entryTreatmentFor,
  fairGardenOrder,
  gardenReconnectUnavailable,
  gardenReconnectSucceeded,
  isNewestGardenCard,
  milestoneThresholdsThrough,
  nextCollectiveMilestone,
  reconcileGardenPool,
  resolveGardenAmount,
  rotateGardenPool,
  selectFairGarden,
  splitGardenMessage,
  type GardenRecognition,
} from '@/components/display/garden';

const origin = Date.parse('2026-09-09T12:00:00.000Z');

function record(id: string, message = `A kind message for ${id}.`, publishedOffset = 0): GardenRecognition {
  const publishedAt = new Date(origin + publishedOffset).toISOString();
  return {
    id,
    recipient: `Synthetic recipient ${id}`,
    message,
    expressionIds: [1, 8],
    createdAt: publishedAt,
    firstPublishedAt: publishedAt,
    featured: false,
  };
}

describe('Garden model', () => {
  it('bounds all-active and custom amounts without allocating the requested count', () => {
    expect(resolveGardenAmount('all-active', 100)).toBe(12);
    expect(resolveGardenAmount(100, 100)).toBe(12);
    expect(resolveGardenAmount(5, 100)).toBe(5);
    expect(resolveGardenAmount(5, 2)).toBe(2);
  });

  it('uses least-presented records first and preserves valid pool cards while filling slots', () => {
    const records = [record('one', 'one', 1), record('two', 'two', 2), record('three', 'three', 3), record('four', 'four', 4)];
    const order = fairGardenOrder(records, { one: 4, two: 0, three: 0, four: 3 });
    expect(order.map((item) => item.id)).toEqual(['three', 'two', 'four', 'one']);

    const first = rotateGardenPool(createGardenPoolState(), records, 2, origin);
    expect(first.activeIds).toEqual(['four', 'three']);
    const second = rotateGardenPool(first, records, 2, origin + 1_000);
    expect(second.activeIds).toEqual(['two', 'one']);

    const reconciled = reconcileGardenPool(second, [...records, record('five', 'five', 5)], 3);
    expect(reconciled.activeIds).toEqual(['two', 'one', 'five']);
    expect(reconciled.activeIds.length).toBeLessThanOrEqual(12);
  });

  it('provides detail tiers and enlarges only the newest card for eight seconds', () => {
    const compact = record('compact', 'short');
    const standard = record('standard', 'x'.repeat(121));
    const detailed = record('detailed', 'x'.repeat(301), 1_000);
    expect(detailTierFor(compact)).toBe('compact');
    expect(detailTierFor(standard)).toBe('standard');
    expect(detailTierFor(detailed)).toBe('detailed');
    expect(isNewestGardenCard(detailed, [compact, detailed], origin + 9_001)).toBe(false);
    expect(isNewestGardenCard(detailed, [compact, detailed], origin + 8_000)).toBe(true);
  });

  it('rotates the three entry treatments', () => {
    expect([0, 1, 2, 3, 4, 5].map((index) => entryTreatmentFor(index))).toEqual([
      'seed',
      'ribbon',
      'bloom',
      'seed',
      'ribbon',
      'bloom',
    ]);
    expect(entryTreatmentFor(0, 1)).toBe('ribbon');
  });

  it('groups ten or more arrivals and keeps smaller bursts individual', () => {
    expect(arrivalModeFor(9)).toBe('individual');
    expect(arrivalModeFor(10)).toBe('grouped');
    expect(arrivalModeFor(100)).toBe('grouped');
  });

  it('emits a collective flower threshold every 25 approvals', () => {
    expect(milestoneThresholdsThrough(74)).toEqual([25, 50]);
    expect(nextCollectiveMilestone(24)).toBeNull();
    expect(nextCollectiveMilestone(25)).toBe(25);
    expect(nextCollectiveMilestone(75, [25, 50])).toBe(75);
  });

  it('reduces sparkles before background while preserving content effects', () => {
    const full = { sparkles: true, background: true, trails: true, constellations: true } as const;
    expect(adaptGardenDecoration('full', full)).toEqual(full);
    expect(adaptGardenDecoration('soft', full)).toEqual({ sparkles: false, background: true, trails: true, constellations: true });
    expect(adaptGardenDecoration('minimal', full)).toEqual({ sparkles: false, background: false, trails: true, constellations: true });
  });

  it('keeps long messages verbatim across grapheme-safe pages', () => {
    const message = `🙂 ${'word '.repeat(90)}\nA second line.`;
    const pages = splitGardenMessage(message, 40, 7);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.join('')).toBe(message);
    expect(pages.join('').includes('🙂')).toBe(true);
  });

  it('keeps reconnect content in RAM during grace and clears it after grace', () => {
    const records = [record('one')];
    const memory = createGardenReconnectMemory(records, origin);
    const reconnecting = gardenReconnectUnavailable(memory, origin + 59_999);
    expect(reconnecting.status).toBe('reconnecting');
    expect(reconnecting.records).toEqual(records);

    const cleared = gardenReconnectUnavailable(reconnecting, origin + 60_000);
    expect(cleared.status).toBe('offline-safe');
    expect(cleared.records).toEqual([]);

    const recovered = gardenReconnectSucceeded(cleared, records, origin + 61_000);
    expect(recovered.status).toBe('connected');
    expect(recovered.records).toEqual(records);
  });

  it('does not include private recognition fields in the Garden projection', async () => {
    const { projectGardenRecognition } = await import('@/components/display/garden');
    const source = {
      ...record('private-check'),
      submittedName: 'Synthetic sender only',
      reason: 'synthetic reason',
      status: 'published' as const,
      version: 1,
      expiresAt: new Date(origin + 168 * 60 * 60 * 1000).toISOString(),
    };
    const projected = projectGardenRecognition(source);
    expect(projected).not.toHaveProperty('submittedName');
    expect(projected).not.toHaveProperty('reason');
    expect(projected).not.toHaveProperty('expiresAt');
  });

  it('limits fair selection to the bounded visual pool', () => {
    const records = Array.from({ length: 40 }, (_, index) => record(String(index), `message ${index}`, index));
    expect(selectFairGarden(records, 'all-active')).toHaveLength(12);
    expect(selectFairGarden(records, 18)).toHaveLength(12);
  });
});
