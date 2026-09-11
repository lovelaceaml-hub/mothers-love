import { expect, test } from '@playwright/test';
import {
  circularity,
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

  const overflowResult = await frame.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="8"]');
    if (!scene) return { found: false, violations: ['scene element not found'] };
    const sceneRect = scene.getBoundingClientRect();
    const runtime = (window as any).colorPolishRuntime;
    const visual = runtime?.visualState() as { actors: Array<{ id: string; life: string }> } | undefined;
    const actors = visual?.actors || [];
    const actorLifeById = new Map(actors.map((a) => [a.id, a.life]));

    const violations: string[] = [];
    const children = Array.from(scene.children) as HTMLElement[];
    for (const el of children) {
      if (el.matches('canvas.scene-fx')) continue;
      if (el.classList.contains('orb-slot')) {
        const recordId = el.dataset.recordId;
        const life = recordId ? actorLifeById.get(recordId) : undefined;
        if (life !== 'steady') continue;
      }
      const r = el.getBoundingClientRect();
      const leftOverflow = sceneRect.left - r.left > 1;
      const topOverflow = sceneRect.top - r.top > 1;
      const rightOverflow = r.right - sceneRect.right > 1;
      const bottomOverflow = r.bottom - sceneRect.bottom > 1;
      if (leftOverflow || topOverflow || rightOverflow || bottomOverflow) {
        violations.push(
          `${el.className || el.tagName}: rect(${r.left.toFixed(1)}, ${r.top.toFixed(1)}, ${r.right.toFixed(1)}, ${r.bottom.toFixed(1)}) outside scene(${sceneRect.left.toFixed(1)}, ${sceneRect.top.toFixed(1)}, ${sceneRect.right.toFixed(1)}, ${sceneRect.bottom.toFixed(1)})`
        );
      }
    }
    return { found: true, violations };
  });
  expect(overflowResult.found).toBe(true);
  expect(overflowResult.violations).toHaveLength(0);

  const clickResult = await studioClickDoesNotAdvance(page, frame);
  expect(clickResult.before).toBe(clickResult.after);
});

test('at 2000 ms visualState actors count is at least 5 unless one actor is large', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'peacemakers', 2000);
  const { count, hasLarge } = await frame.evaluate(() => {
    const runtime = (window as any).colorPolishRuntime;
    const visual = runtime.visualState();
    const state = runtime.getState();
    const hasLarge = state.slots?.some((s: any) => s.large) || false;
    return { count: visual.actors.length, hasLarge };
  });

  if (hasLarge) {
    expect(count).toBe(1);
  } else {
    expect(count).toBeGreaterThanOrEqual(5);
  }
});

test('bubble count never zero and at most one actor exiting at fresh opens', async ({ page }) => {
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
    expect(visual.actors.length).toBeGreaterThan(0);
    const exiting = visual.actors.filter(
      (a: VisualActor) => a.life === 'exiting',
    );
    expect(exiting.length).toBeLessThanOrEqual(1);
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

test('the globe-light element and fx canvas exist at 6000 ms', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'peacemakers', 6000);
  const globeLight = await frame.$('.globe-light');
  expect(globeLight).not.toBeNull();
  const fxCanvas = await frame.$('canvas.scene-fx');
  expect(fxCanvas).not.toBeNull();
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
