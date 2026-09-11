import { expect, test } from '@playwright/test';
import {
  circularity,
  noOverflow,
  openStudioScene,
  reducedMotionScene,
  studioClickDoesNotAdvance,
} from './helpers';

test('peace in practice renders circular bubbles and no overflow at 14 s', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'peace-in-practice', 14000);

  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);

  const overflow = await noOverflow(frame);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

  const maxBottom = await frame.evaluate(() => {
    const scenes = document.querySelectorAll('#stage .scene');
    const sceneRoot = scenes[scenes.length - 1] as HTMLElement | undefined;
    if (!sceneRoot) return 0;
    const rootRect = sceneRoot.getBoundingClientRect();
    const heartField = sceneRoot.querySelector('#heart-field');
    const isExcluded = (el: Element) => el === heartField || Boolean(heartField?.contains(el));
    const candidates = new Set<HTMLElement>([
      ...(Array.from(sceneRoot.children) as HTMLElement[]),
      ...Array.from(sceneRoot.querySelectorAll<HTMLElement>('*')),
    ]);
    let max = 0;
    for (const el of candidates) {
      if (isExcluded(el)) continue;
      const rect = el.getBoundingClientRect();
      const bottom = rect.bottom - rootRect.top;
      if (bottom > max) max = bottom;
    }
    return max;
  });
  expect(maxBottom).toBeLessThanOrEqual(overflow.clientHeight);

  const clickResult = await studioClickDoesNotAdvance(page, frame);
  expect(clickResult.before).toBe(clickResult.after);
});

test('a bubble pops into hearts, peace signs and glow within 60 s', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'peace-in-practice', 2000);

  type Sample = {
    ms: number;
    actorsLength: number;
    burstLogged: boolean;
    peaceFxCount: number;
    visualFx: number;
  };

  const samples: Sample[] = [];
  let burstSampleIndex = -1;

  for (let ms = 2000; ms <= 62000; ms += 2000) {
    if (ms > 2000) {
      await frame.evaluate((stepMs) => {
        (window as any).colorPolishRuntime.step(stepMs);
        document.getAnimations().forEach((animation) => {
          animation.pause();
        });
      }, 2000);
    }

    const sample = await frame.evaluate((checkpointMs) => {
      const runtime = (window as any).colorPolishRuntime;
      const state = runtime?.getState();
      const visual = runtime?.visualState();
      const canvas = document.querySelector('.scene-fx') as HTMLElement | null;
      const burstEntries = (state?.log || []).filter((e: any) => e.type === 'bubble_burst');
      const peaceCount = canvas?.dataset.peaceFx ? parseInt(canvas.dataset.peaceFx, 10) : 0;
      return {
        ms: checkpointMs,
        actorsLength: visual?.actors?.length || 0,
        burstLogged: burstEntries.length > 0,
        peaceFxCount: peaceCount,
        visualFx: visual?.fx || 0,
      };
    }, ms);

    samples.push(sample);

    if (burstSampleIndex === -1 && sample.burstLogged) {
      burstSampleIndex = samples.length - 1;
    }
  }

  // actors length is always 4
  for (const s of samples) {
    expect(s.actorsLength).toBe(4);
  }

  // the runtime log gains at least one bubble_burst entry
  expect(burstSampleIndex).toBeGreaterThan(-1);

  // at the first sample after a burst the .scene-fx canvas data-peace-fx count is above 0 and visualState fx is above 0
  const firstBurstSample = samples[burstSampleIndex];
  expect(firstBurstSample.peaceFxCount).toBeGreaterThan(0);
  expect(firstBurstSample.visualFx).toBeGreaterThan(0);

  // three samples later the data-peace-fx count is lower (they expire)
  expect(samples.length).toBeGreaterThan(burstSampleIndex + 3);
  const laterSample = samples[burstSampleIndex + 3];
  expect(laterSample.peaceFxCount).toBeLessThan(firstBurstSample.peaceFxCount);
});

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

test('bubbles span two depth layers', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'peace-in-practice', 14000);

  const distinctDepths = await frame.evaluate(() => {
    const slots = Array.from(document.querySelectorAll<HTMLElement>('.orb-slot'));
    const depths = slots.map((s) => s.dataset.depth).filter(Boolean);
    return Array.from(new Set(depths));
  });

  // data-depth has at least two distinct values
  expect(distinctDepths.length).toBeGreaterThanOrEqual(2);

  const visual = (await frame.evaluate(() => (window as any).colorPolishRuntime.visualState())) as {
    actors: VisualActor[];
    fx: number;
    flowers: number;
  };

  const parseBlur = (blur?: string): number => {
    if (!blur || blur === 'none') return 0;
    const match = blur.match(/blur\(([\d.]+)px\)/);
    return match ? parseFloat(match[1]) : 0;
  };

  // one actor blurred above .3 px
  const hasBlurred = visual.actors.some((b: VisualActor) => {
    const match = (b.blur || '').match(/blur\(([\d.]+)px\)/);
    return match ? parseFloat(match[1]) > 0.3 : false;
  });
  expect(hasBlurred).toBe(true);

  // one sharp
  const hasSharp = visual.actors.some((a: VisualActor) => parseBlur(a.blur) < 0.15);
  expect(hasSharp).toBe(true);
});

test('bubbles stay circular through swell and burst', async ({ page }) => {
  const checkpoints = [300, 6000, 14000, 17500, 20000];
  const { frame } = await openStudioScene(page, 'peace-in-practice', checkpoints[0]);
  let currentMs = checkpoints[0];

  const firstResult = await circularity(frame);
  expect(firstResult.count).toBeGreaterThan(0);
  expect(firstResult.failures).toHaveLength(0);

  for (let i = 1; i < checkpoints.length; i++) {
    const nextMs = checkpoints[i];
    const deltaMs = nextMs - currentMs;
    currentMs = nextMs;

    await frame.evaluate(({ delta, target }) => {
      (window as any).colorPolishRuntime.step(delta);
      document.getAnimations().forEach((animation) => {
        animation.pause();
        animation.currentTime = target;
      });
    }, { delta: deltaMs, target: nextMs });

    const result = await circularity(frame);
    expect(result.count).toBeGreaterThan(0);
    expect(result.failures).toHaveLength(0);
  }
});

test('sculpted rotating heart is a real canvas that turns over time', async ({ page }) => {
  const { frame: frame2000 } = await openStudioScene(page, 'peace-in-practice', 2000);

  const check2000 = await frame2000.evaluate(() => {
    const host = document.querySelector('#heart-host');
    const canvas = host?.querySelector('canvas');
    const img = host?.querySelector('img');
    return {
      hasCanvas: Boolean(canvas),
      hasImg: Boolean(img),
      dataUrl: canvas ? canvas.toDataURL() : null,
      role: canvas?.getAttribute('role'),
      ariaLabel: canvas?.getAttribute('aria-label'),
    };
  });

  expect(check2000.hasCanvas).toBe(true);
  expect(check2000.hasImg).toBe(false);
  expect(check2000.role).toBe('img');
  expect(check2000.ariaLabel).toBe('Sculpted rotating heart');
  expect(check2000.dataUrl).toBeTruthy();

  const { frame: frame4000 } = await openStudioScene(page, 'peace-in-practice', 4000);

  const check4000 = await frame4000.evaluate(() => {
    const canvas = document.querySelector('#heart-host canvas') as HTMLCanvasElement | null;
    return canvas ? canvas.toDataURL() : null;
  });

  expect(check4000).toBeTruthy();
  expect(check2000.dataUrl).not.toBe(check4000);
});

test('heart canvas displays distinct luminance shading bands', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'peace-in-practice', 2000);

  const bands = await frame.evaluate(() => {
    const canvas = document.querySelector('#heart-host canvas') as HTMLCanvasElement | null;
    if (!canvas) return { shadow: 0, base: 0, highlight: 0, totalOpaque: 0, nonHighlightRatio: 0 };
    const ctx = canvas.getContext('2d');
    if (!ctx) return { shadow: 0, base: 0, highlight: 0, totalOpaque: 0, nonHighlightRatio: 0 };

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    let shadowCount = 0;
    let baseCount = 0;
    let highlightCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha < 50) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (lum < 165) shadowCount++;
      else if (lum <= 215) baseCount++;
      else highlightCount++;
    }

    const totalOpaque = shadowCount + baseCount + highlightCount;
    const nonHighlightRatio = totalOpaque > 0 ? (shadowCount + baseCount) / totalOpaque : 0;

    return { shadow: shadowCount, base: baseCount, highlight: highlightCount, totalOpaque, nonHighlightRatio };
  });

  expect(bands.shadow).toBeGreaterThan(200);
  expect(bands.base).toBeGreaterThan(200);
  expect(bands.highlight).toBeGreaterThan(200);
  expect(bands.nonHighlightRatio).toBeGreaterThanOrEqual(0.4);
});

test('reduced motion renders the scene still', async ({ page }) => {
  const { frame, still } = await reducedMotionScene(page, 'peace-in-practice');
  expect(still).toBe(true);

  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);

  const hasCanvas = await frame.evaluate(() => {
    const host = document.querySelector('#heart-host');
    const canvas = host?.querySelector('canvas');
    return Boolean(canvas);
  });
  expect(hasCanvas).toBe(true);
});
