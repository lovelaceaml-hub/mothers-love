import { expect, test, type Frame } from '@playwright/test';
import { buildActiveDisplayFixture, loadRenderer } from './helpers';

// Welcome (scene 1) and Garden (scene 2) draw only from the newest 20 records,
// least shown first, so they rotate through them (Anthony, 2026-10-17). Every other scene keeps the
// whole pool. Thirty synthetic records: number 30 is the newest.
const TOTAL = 30;
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const recognitions = Array.from({ length: TOTAL }, (_, i) => {
  const n = i + 1;
  const at = new Date(Date.parse('2026-09-10T15:00:00Z') + n * 60000).toISOString();
  return {
    id: id(n),
    recipient: `Synthetic Friend ${n}`,
    message: `Thank you for helping today, number ${n}.`,
    expressionIds: [(n % 9) + 1],
    createdAt: at,
    firstPublishedAt: at,
    expiresAt: '2026-09-17T17:00:00Z',
    version: 1,
    status: 'published',
    featured: false,
  };
});
const newest = new Set(recognitions.slice(TOTAL - 20).map((r) => r.id));

// Every record id seen on screen while the scene runs for `seconds`.
async function seenOver(frame: Frame, seconds: number): Promise<string[]> {
  return frame.evaluate((total) => {
    const runtime = (window as any).colorPolishRuntime;
    const seen = new Set<string>();
    const look = () => document.querySelectorAll('[data-record-id]').forEach((el) => seen.add((el as HTMLElement).dataset.recordId!));
    look();
    for (let t = 0; t < total; t++) {
      runtime.step(1000);
      look();
    }
    return [...seen];
  }, seconds);
}

for (const [name, scene, seconds, least] of [['welcome', 1, 29, 7], ['garden', 2, 175, 15]] as const) {
  test(`${name} shows only the newest 20 and rotates through them`, async ({ page }) => {
    const frame = await loadRenderer(page, { scene, fixture: buildActiveDisplayFixture({ recognitions }) });
    const seen = await seenOver(frame, seconds);
    expect(await frame.evaluate(() => (window as any).colorPolishRuntime.getState().scene)).toBe(scene);
    expect(seen.filter((x) => !newest.has(x))).toEqual([]);
    // The least shown come first, so one pass reaches many of the twenty.
    expect(seen.length).toBeGreaterThanOrEqual(least);
  });
}

test('other scenes still draw from the whole pool', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 4, fixture: buildActiveDisplayFixture({ recognitions }) });
  const picks: string[] = await frame.evaluate(() => {
    const w = window as any;
    return Array.from({ length: 60 }, () => w.chooseRandom([])?.id ?? '');
  });
  expect(picks.some((x) => x && !newest.has(x))).toBe(true);
});
