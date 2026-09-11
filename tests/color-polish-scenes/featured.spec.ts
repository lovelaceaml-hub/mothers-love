import { expect, test } from '@playwright/test';
import {
  circularity,
  noOverflow,
  openStudioScene,
  reducedMotionScene,
  studioClickDoesNotAdvance,
} from './helpers';

test('featured renders circular bubbles and no overflow at 14 s', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'featured', 14000);
  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);

  const overflow = await noOverflow(frame);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);

  const clickResult = await studioClickDoesNotAdvance(page, frame);
  expect(clickResult.before).toBe(clickResult.after);
});

test('the scene stays populated and replaces one bubble at a time', async ({ page }) => {
  test.setTimeout(60000);
  const checkpoints = [2000, 8000, 14000, 20000, 26000];
  for (const ms of checkpoints) {
    const { frame } = await openStudioScene(page, 'featured', ms);
    const visual = await frame.evaluate(() => (window as any).colorPolishRuntime.visualState());
    expect(visual.actors.length).toBeGreaterThanOrEqual(3);
    const exitingActors = visual.actors.filter((a: any) => a.life === 'exiting');
    expect(exitingActors.length).toBeLessThanOrEqual(1);
  }
});

test('bubbles span two depth layers', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'featured', 14000);

  const depths = await frame.evaluate(() => {
    const slots = Array.from(document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="4"] .orb-slot'));
    return slots.map((el) => el.dataset.depth);
  });
  const uniqueDepths = new Set(depths.filter(Boolean));
  expect(uniqueDepths.size).toBeGreaterThanOrEqual(2);

  const visual = await frame.evaluate(() => (window as any).colorPolishRuntime.visualState());
  const blurs = visual.actors.map((a: any) => {
    const match = (a.blur || '').match(/blur\(([\d.]+)px\)/);
    return match ? parseFloat(match[1]) : 0;
  });

  expect(blurs.some((b: number) => b >= 0.3)).toBe(true);
  expect(blurs.some((b: number) => b === 0)).toBe(true);
});

test('bubbles stay circular during an exit', async ({ page }) => {
  test.setTimeout(60000);
  const checkpoints = [300, 6000, 14000, 20000];
  for (const ms of checkpoints) {
    const { frame } = await openStudioScene(page, 'featured', ms);
    const circleResult = await circularity(frame);
    expect(circleResult.count).toBeGreaterThan(0);
    expect(circleResult.failures).toHaveLength(0);
  }
});

test('reduced motion renders the featured scene still', async ({ page }) => {
  const { frame, still } = await reducedMotionScene(page, 'featured');
  expect(still).toBe(true);

  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);
});
