import { expect, test } from '@playwright/test';
import {
  circularity,
  noOverflow,
  openStudioScene,
  reducedMotionScene,
  studioClickDoesNotAdvance,
} from './helpers';

test('welcome renders circular bubbles and no overflow at 14 s', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'welcome', 14000);
  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);

  const overflow = await noOverflow(frame);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);

  const clickResult = await studioClickDoesNotAdvance(page, frame);
  expect(clickResult.before).toBe(clickResult.after);
});

test('bubbles differ in speed and span two depth layers', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'welcome', 14000);
  const state = await frame.evaluate(() => (window as any).colorPolishRuntime.visualState());
  const actors = state.actors;

  expect(actors.length).toBeGreaterThanOrEqual(3);

  const speeds = actors.map((a: any) => Math.hypot(a.vx, a.vy));
  let pairDiff30Count = 0;
  for (let i = 0; i < speeds.length; i++) {
    for (let j = i + 1; j < speeds.length; j++) {
      const min = Math.min(speeds[i], speeds[j]);
      const max = Math.max(speeds[i], speeds[j]);
      if (min > 0 && (max - min) / min >= 0.3) {
        pairDiff30Count++;
      }
    }
  }
  expect(pairDiff30Count).toBeGreaterThanOrEqual(3);

  const parseBlur = (filterStr: string): number => {
    if (!filterStr || filterStr === 'none') return 0;
    const match = filterStr.match(/blur\(([\d.]+)px\)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const hasBlurAbove03 = actors.some((a: any) => parseBlur(a.blur) > 0.3);
  const hasBlurNoneOrZero = actors.some((a: any) => !a.blur || a.blur === 'none' || parseBlur(a.blur) === 0);
  expect(hasBlurAbove03).toBe(true);
  expect(hasBlurNoneOrZero).toBe(true);

  const depthValues = await frame.evaluate(() => {
    const slots = Array.from(document.querySelectorAll<HTMLElement>('.orb-slot'));
    return slots.map((el) => el.dataset.depth).filter(Boolean);
  });
  const distinctDepths = new Set(depthValues);
  expect(distinctDepths.size).toBeGreaterThanOrEqual(2);
});

test('at least one bubble changes heading between 6 and 14 s', async ({ page }) => {
  const { frame: frame6 } = await openStudioScene(page, 'welcome', 6000);
  const state6 = await frame6.evaluate(() => (window as any).colorPolishRuntime.visualState());

  const freshPage = await page.context().newPage();
  const { frame: frame14 } = await openStudioScene(freshPage, 'welcome', 14000);
  const state14 = await frame14.evaluate(() => (window as any).colorPolishRuntime.visualState());

  const actors6 = state6.actors;
  const actors14 = state14.actors;

  let maxAngleDeg = 0;
  for (const a6 of actors6) {
    const a14 = actors14.find((a: any) => a.id === a6.id);
    if (!a14) continue;

    const dot = a6.vx * a14.vx + a6.vy * a14.vy;
    const mag6 = Math.hypot(a6.vx, a6.vy);
    const mag14 = Math.hypot(a14.vx, a14.vy);
    if (mag6 === 0 || mag14 === 0) continue;

    const cosTheta = Math.max(-1, Math.min(1, dot / (mag6 * mag14)));
    const angleDeg = (Math.acos(cosTheta) * 180) / Math.PI;
    if (angleDeg > maxAngleDeg) {
      maxAngleDeg = angleDeg;
    }
  }

  expect(maxAngleDeg).toBeGreaterThan(20);
  await freshPage.close();
});

test('bubbles stay circular through motion', async ({ page }) => {
  for (const ms of [300, 6000, 14000]) {
    const freshPage = await page.context().newPage();
    const { frame } = await openStudioScene(freshPage, 'welcome', ms);
    const circleResult = await circularity(frame);
    expect(circleResult.count).toBeGreaterThan(0);
    expect(circleResult.failures).toHaveLength(0);
    await freshPage.close();
  }

  const { frame, page: studioPage } = await openStudioScene(page, 'welcome', 14000);
  const replayButton = studioPage.getByTestId('color-polish-studio').getByRole('button', { name: 'Replay' });
  await replayButton.click();

  await expect.poll(() => studioPage.frames().some((f) => f.url().endsWith('/color-polish/renderer.html') && !f.isDetached())).toBe(true);
  const activeFrame = studioPage.frames().reverse().find((f) => f.url().endsWith('/color-polish/renderer.html') && !f.isDetached())!;

  await activeFrame.waitForFunction(() => {
    const runtime = (window as any).colorPolishRuntime;
    const state = runtime?.getState();
    return state?.mode === 'normal' && state?.scene === 1;
  });

  await activeFrame.evaluate((checkpointMs) => {
    (window as any).colorPolishRuntime.step(checkpointMs);
    document.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = checkpointMs;
    });
  }, 14000);

  const replayResult = await circularity(activeFrame);
  expect(replayResult.count).toBeGreaterThan(0);
  expect(replayResult.failures).toHaveLength(0);
});

test('reduced motion renders the welcome scene still', async ({ page }) => {
  const { frame, still } = await reducedMotionScene(page, 'welcome');
  expect(still).toBe(true);

  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);

  const layerScales: Record<string, number> = {
    far: 0.84,
    mid: 0.93,
    near: 1,
  };

  const readSlots = async () => {
    return await frame.evaluate(() => {
      const slots = Array.from(document.querySelectorAll<HTMLElement>('.orb-slot'));
      return slots.map((el) => ({
        depth: el.dataset.depth,
        inline: el.style.transform,
        computed: window.getComputedStyle(el).transform,
      }));
    });
  };

  const firstReading = await readSlots();
  expect(firstReading.length).toBeGreaterThan(0);

  for (const slot of firstReading) {
    expect(slot.depth).toBeDefined();
    expect(layerScales).toHaveProperty(slot.depth!);
    const layerScale = layerScales[slot.depth!];

    const match = slot.computed.match(/^matrix(?:3d)?\(([^)]+)\)$/);
    expect(match).not.toBeNull();
    const values = match![1].split(',').map((v) => parseFloat(v.trim()));
    const scale = Math.hypot(values[0], values[1]);
    expect(scale).toBeGreaterThanOrEqual(layerScale * 0.88);
    expect(scale).toBeLessThanOrEqual(layerScale * 1.02);
  }

  await frame.evaluate(() => {
    (window as any).colorPolishRuntime.step(1000);
  });

  const secondReading = await readSlots();
  expect(secondReading).toEqual(firstReading);
});
