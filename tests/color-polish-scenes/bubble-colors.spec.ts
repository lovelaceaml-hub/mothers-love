import { expect, test } from '@playwright/test';
import { loadRenderer } from './helpers';
import { buildMediumFixture } from './text-fits';
import type { Frame } from '@playwright/test';

// Bubbles take their colour from a rotating palette, never from the first
// expression, so different recognitions on screen at one time never share a
// colour. A recognition briefly in two slots during a swap keeps its one hue.
const hues = (frame: Frame, scene: number) =>
  frame.evaluate(
    (id) =>
      [...document.querySelectorAll<HTMLElement>(`#tv .scene[data-scene="${id}"] .orb-slot .orb-breath`)]
        .filter((el) => el.getBoundingClientRect().width > 0)
        .map((el) => [el.dataset.bubbleFor ?? '', el.style.getPropertyValue('--bubble')] as const),
    scene,
  );

const expectDistinct = (pairs: ReadonlyArray<readonly [string, string]>) => {
  const byRecord = new Map(pairs);
  expect(pairs.every(([id, hue]) => id && hue && byRecord.get(id) === hue)).toBe(true);
  expect(new Set(byRecord.values()).size).toBe(byRecord.size);
};

for (const [name, scene] of [['welcome', 1], ['peacemakers', 8]] as const) {
  test(`${name} bubbles on screen each have their own colour`, async ({ page }) => {
    test.setTimeout(120_000);
    const frame = await loadRenderer(page, { scene, ms: 6000, fixture: buildMediumFixture() as any });
    const first = await hues(frame, scene);
    expect(first.length).toBeGreaterThanOrEqual(2);
    expectDistinct(first);

    // Drift replacements over the next two minutes keep the colours distinct.
    for (let step = 0; step < 8; step++) {
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(15000));
      expectDistinct(await hues(frame, scene));
    }
  });
}
