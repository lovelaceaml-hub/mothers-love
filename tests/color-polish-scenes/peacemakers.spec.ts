import { expect, test } from '@playwright/test';
import {
  circularity,
  noOverflow,
  openStudioScene,
  reducedMotionScene,
  studioClickDoesNotAdvance,
} from './helpers';

type VisualActor = {
  id: string;
  x: number;
  y: number;
  d: number;
  scale: number;
  opacity: number;
  vx: number;
  vy: number;
  life: string;
  readingPages: number;
  z: number;
  depth: number;
  screenScale: number;
  blur: string;
};

test('peacemakers renders circular bubbles and no overflow at 14 s', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'peacemakers', 14000);

  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);

  const overflow = await noOverflow(frame);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);

  const clickResult = await studioClickDoesNotAdvance(page, frame);
  expect(clickResult.before).toBe(clickResult.after);
});

test('the scene stays populated with staggered replacement', async ({ page }) => {
  test.setTimeout(90000);
  for (const ms of [2000, 8000, 14000, 20000, 26000]) {
    const { frame } = await openStudioScene(page, 'peacemakers', ms);
    const visual = (await frame.evaluate(() =>
      (window as any).colorPolishRuntime.visualState(),
    )) as {
      actors: VisualActor[];
      fx: number;
      flowers: number;
    };
    expect(visual.actors).toHaveLength(4);
    const transitioning = visual.actors.filter(
      (a: VisualActor) => a.life === 'exiting' || a.life === 'entering',
    );
    expect(transitioning.length).toBeLessThanOrEqual(2);
  }
});

test('bubbles span two depth layers with blur only on deeper layers', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'peacemakers', 14000);

  const visual = (await frame.evaluate(() =>
    (window as any).colorPolishRuntime.visualState(),
  )) as {
    actors: VisualActor[];
    fx: number;
    flowers: number;
  };

  const actorStates = (await frame.evaluate(() => {
    const runtime = (window as any).colorPolishRuntime;
    const v = runtime.visualState() as {
      actors: VisualActor[];
      fx: number;
      flowers: number;
    };
    return v.actors.map((a: VisualActor) => {
      const el = document.querySelector<HTMLElement>(`.orb-slot[data-record-id="${a.id}"]`);
      return {
        id: a.id,
        life: a.life,
        depth: el?.dataset.depth || '',
        blur: a.blur || '',
      };
    });
  })) as Array<{
    id: string;
    life: string;
    depth: string;
    blur: string;
  }>;

  const distinctDepths = new Set(
    actorStates.map((a: { depth: string }) => a.depth).filter(Boolean),
  );
  expect(distinctDepths.size).toBeGreaterThanOrEqual(2);

  const parseBlur = (filter?: string | null): number => {
    if (!filter || filter === 'none') return 0;
    const match = filter.match(/blur\(([\d.]+)px\)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const hasBlurAbove03 = visual.actors.some(
    (a: VisualActor) => parseBlur(a.blur) > 0.3,
  );
  expect(hasBlurAbove03).toBe(true);

  const hasSharp = visual.actors.some(
    (a: VisualActor) => parseBlur(a.blur) < 0.15,
  );
  expect(hasSharp).toBe(true);

  for (const a of actorStates) {
    if (a.depth === 'near' && a.life !== 'entering' && a.life !== 'exiting') {
      expect(parseBlur(a.blur) < 0.15).toBe(true);
    }
  }
});

test('bubbles stay circular during replacement', async ({ page }) => {
  test.setTimeout(90000);
  for (const ms of [300, 6000, 14000, 20000]) {
    const { frame } = await openStudioScene(page, 'peacemakers', ms);
    const circleResult = await circularity(frame);
    expect(circleResult.count).toBeGreaterThan(0);
    expect(circleResult.failures).toHaveLength(0);
  }
});

test('reduced motion renders the peacemakers scene still', async ({ page }) => {
  const { frame, still } = await reducedMotionScene(page, 'peacemakers');
  expect(still).toBe(true);

  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);
});
