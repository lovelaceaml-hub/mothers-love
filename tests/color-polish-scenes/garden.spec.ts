import { expect, test } from '@playwright/test';
import {
  circularity,
  noOverflow,
  openStudioScene,
  reducedMotionScene,
  studioClickDoesNotAdvance,
} from './helpers';

test('garden renders circular bubbles and no overflow at 14 s', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'garden', 14000);

  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);

  const overflow = await noOverflow(frame);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);

  const clickResult = await studioClickDoesNotAdvance(page, frame);
  expect(clickResult.before).toBe(clickResult.after);
});

test('the garden fills over a minute with one replacement at a time', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'garden', 2000);
  const flowerCounts: number[] = [];
  const gardenNextValues: number[] = [];
  let maxActors = 0;

  for (let ms = 2000; ms <= 62000; ms += 6000) {
    if (ms > 2000) {
      await frame.evaluate((stepMs) => {
        (window as any).colorPolishRuntime.step(stepMs);
        document.getAnimations().forEach((animation) => {
          animation.pause();
          animation.currentTime = (window as any).colorPolishRuntime.visualState().clock * 1000;
        });
      }, 6000);
    }

    const visual = await frame.evaluate(() => (window as any).colorPolishRuntime.visualState());
    flowerCounts.push(visual.flowers);
    gardenNextValues.push(visual.gardenNext);
    if (visual.actors.length > maxActors) {
      maxActors = visual.actors.length;
    }
  }

  expect(maxActors).toBeLessThanOrEqual(5);

  let increases = 0;
  for (let i = 1; i < flowerCounts.length; i++) {
    if (flowerCounts[i] > flowerCounts[i - 1]) {
      increases++;
    }
  }
  expect(increases).toBeGreaterThanOrEqual(2);

  expect(gardenNextValues[0]).toBe(14);
  for (let i = 1; i < gardenNextValues.length; i++) {
    const diff = gardenNextValues[i] - gardenNextValues[i - 1];
    expect([0, 7]).toContain(diff);
  }
  expect(gardenNextValues[gardenNextValues.length - 1]).toBeGreaterThanOrEqual(56);
});

test('petals are carried, not dropped', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'garden', 15000);

  const petals15 = await frame.evaluate(() => {
    const canvas = document.getElementById('living-garden') as HTMLCanvasElement;
    return Number(canvas?.dataset.petals || 0);
  });
  expect(petals15).toBeGreaterThan(0);

  await frame.evaluate(() => {
    (window as any).colorPolishRuntime.step(2000);
    document.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = 17000;
    });
  });

  const petals17 = await frame.evaluate(() => {
    const canvas = document.getElementById('living-garden') as HTMLCanvasElement;
    return Number(canvas?.dataset.petals || 0);
  });
  expect(petals17).toBeGreaterThan(0);

  await frame.evaluate(() => {
    (window as any).colorPolishRuntime.step(7000);
    document.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = 24000;
    });
  });

  const petals24 = await frame.evaluate(() => {
    const canvas = document.getElementById('living-garden') as HTMLCanvasElement;
    return Number(canvas?.dataset.petals || 0);
  });
  expect(petals24).toBeLessThan(petals17);
});

test('bubbles span two depth layers', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'garden', 14000);

  const { depths, actors } = await frame.evaluate(() => {
    const slots = Array.from(document.querySelectorAll<HTMLElement>('#stage .orb-slot'));
    const depths = slots.map((s) => s.dataset.depth).filter(Boolean);
    const visual = (window as any).colorPolishRuntime.visualState();
    const actors = (visual?.actors && visual.actors.length > 0)
      ? visual.actors
      : slots.map((s) => ({ blur: s.style.filter || '' }));
    return { depths, actors };
  });

  const distinctDepths = new Set(depths);
  expect(distinctDepths.size).toBeGreaterThanOrEqual(2);

  const parseBlur = (blur?: string): number => {
    if (!blur || blur === 'none') return 0;
    const match = blur.match(/blur\(([\d.]+)px\)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const blurredAbovePoint3 = actors.some((a: any) => parseBlur(a.blur) > 0.3);
  const hasSharp = actors.some((a: any) => parseBlur(a.blur) < 0.15);
  expect(blurredAbovePoint3).toBe(true);
  expect(hasSharp).toBe(true);
});

test('bubbles stay circular through sprout, swell and burst', async ({ page }) => {
  for (const checkpointMs of [300, 6000, 14000, 15000, 20000]) {
    const { frame } = await openStudioScene(page, 'garden', checkpointMs);
    const circleResult = await circularity(frame);
    expect(circleResult.count).toBeGreaterThan(0);
    expect(circleResult.failures).toHaveLength(0);
  }
});

test('reduced motion renders the garden still', async ({ page }) => {
  const { frame, still } = await reducedMotionScene(page, 'garden');
  expect(still).toBe(true);

  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);
});
