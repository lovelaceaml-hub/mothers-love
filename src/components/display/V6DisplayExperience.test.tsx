import { describe, expect, it } from 'vitest';
import type { Recognition } from '@/lib/contracts';
import { V6_SCENES, fieldSlots, splitMessage } from './V6DisplayExperience';

function recognition(id: string, message = 'Thank you for your kindness.'): Recognition {
  return {
    id,
    recipient: `Person ${id}`,
    message,
    expressionIds: [1, 2],
    createdAt: '2026-09-10T12:00:00.000Z',
    firstPublishedAt: '2026-09-10T12:01:00.000Z',
    expiresAt: '2026-09-17T12:00:00.000Z',
    version: 1,
    status: 'published',
    featured: false,
  };
}

describe('V6 TV program', () => {
  it('uses the approved scene order and durations', () => {
    expect(V6_SCENES.map((scene) => [scene.id, scene.durationMs])).toEqual([
      ['welcome', 30_000],
      ['garden', 180_000],
      ['featured', 30_000],
      ['calendar', 30_000],
      ['peacemakers', 60_000],
      ['status', 30_000],
      ['expressions', 30_000],
      ['peace', 60_000],
      ['orbit', 30_000],
      ['milestone', 30_000],
    ]);
  });

  it('never truncates message content when it creates reading pages', () => {
    const source = Array.from({ length: 410 }, (_, index) => String(index % 10)).join('');
    const pages = splitMessage(source, 90);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.join('')).toBe(source);
    expect(pages.every((page) => Array.from(page).length <= 90)).toBe(true);
  });

  it('stages field changes one slot at a time instead of resetting the field', () => {
    const records = Array.from({ length: 12 }, (_, index) => recognition(String(index + 1)));
    const before = fieldSlots(records, 4, 7_000, 16_000, 7_500);
    const firstTransition = fieldSlots(records, 4, 7_600, 16_000, 7_500);
    expect(before).toHaveLength(4);
    expect(firstTransition.filter((slot) => slot.transitioning)).toHaveLength(1);
    expect(firstTransition.filter((slot) => slot.previous !== null)).toHaveLength(1);
  });
});
