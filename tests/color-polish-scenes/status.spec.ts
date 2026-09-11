import { expect, test, type Frame } from '@playwright/test';
import {
  circularity,
  noOverflow,
  openStudioScene,
  reducedMotionScene,
  studioClickDoesNotAdvance,
} from './helpers';

function parseTransform(transformStr: string) {
  const match = transformStr.match(
    /translate\(\s*([-\d.]+)px,\s*([-\d.]+)px\)\s*rotate\(\s*([-\d.]+)deg\)\s*scale\(\s*([-\d.]+)\)/,
  );
  if (!match) {
    throw new Error(`Failed to parse transform string: "${transformStr}"`);
  }
  return {
    x: parseFloat(match[1]),
    y: parseFloat(match[2]),
    rot: parseFloat(match[3]),
    scale: parseFloat(match[4]),
  };
}

async function checkMedallionCircularity(frame: Frame) {
  return await frame.evaluate(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>('.scene[data-scene="6"] .medallion'),
    );
    const failures: Array<{ selector: string; width: number; height: number; radius: string }> = [];

    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      const widthHeightOk = width > 0 && height > 0 && Math.abs(width - height) <= 1;

      const style = window.getComputedStyle(el);
      const radius = style.borderRadius;
      const halfWidth = width / 2;
      const isPercent = radius.includes('50%');
      const numericParts = radius
        .split(/\s+/)
        .map((p) => parseFloat(p))
        .filter((p) => !isNaN(p));
      const isNumericHalf =
        numericParts.length > 0 && numericParts.every((p) => Math.abs(p - halfWidth) <= 1);
      const topLeft = parseFloat(style.borderTopLeftRadius);
      const isTopLeftHalf = !isNaN(topLeft) && Math.abs(topLeft - halfWidth) <= 1;

      const radiusOk = isPercent || isNumericHalf || isTopLeftHalf;

      if (!widthHeightOk || !radiusOk) {
        failures.push({
          selector: el.className,
          width,
          height,
          radius,
        });
      }
    }

    return {
      count: elements.length,
      failures,
    };
  });
}

test('status renders circular medallions and no overflow at 14 s', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'status', 14000);
  const circleResult = await circularity(frame);
  expect(circleResult.failures).toHaveLength(0);

  const medallionResult14 = await checkMedallionCircularity(frame);
  expect(medallionResult14.count).toBeGreaterThanOrEqual(9);
  expect(medallionResult14.failures).toHaveLength(0);

  const overflow = await noOverflow(frame);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);

  const clickResult = await studioClickDoesNotAdvance(page, frame);
  expect(clickResult.before).toBe(clickResult.after);

  const page6 = await page.context().newPage();
  try {
    const { frame: frame6 } = await openStudioScene(page6, 'status', 6000);
    const medallionResult6 = await checkMedallionCircularity(frame6);
    expect(medallionResult6.count).toBeGreaterThanOrEqual(9);
    expect(medallionResult6.failures).toHaveLength(0);
  } finally {
    await page6.close();
  }
});

test('the nine medallions carry at least three motion vocabularies', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'status', 6000);
  const motionValues = await frame.evaluate(() => {
    const medallions = Array.from(document.querySelectorAll('.stat-expression .medallion'));
    return medallions.map((el) => el.getAttribute('data-motion'));
  });

  expect(motionValues).toHaveLength(9);
  const motionSet = new Set(motionValues);
  expect(motionSet.size).toBeGreaterThanOrEqual(3);
  for (const val of motionValues) {
    expect(['float', 'sway', 'breathe']).toContain(val);
  }
});

test('icon transforms differ pairwise and follow different waveforms', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'status', 6000);
  const motions = await frame.evaluate(() => {
    const medallions = Array.from(document.querySelectorAll('.stat-expression .medallion'));
    return medallions.map((el) => el.getAttribute('data-motion') || '');
  });
  const initialTransforms = await frame.evaluate(() => {
    const icons = Array.from(document.querySelectorAll('.stat-expression .medallion img'));
    return icons.map((el) => (el as HTMLElement).style.transform);
  });

  expect(initialTransforms).toHaveLength(9);
  const transformSet = new Set(initialTransforms);
  expect(transformSet.size).toBe(9);

  const staticTransforms = await frame.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('.metric-value, .stat-expression b'));
    return elements.map((el) => window.getComputedStyle(el).transform);
  });
  expect(staticTransforms.length).toBeGreaterThan(0);
  for (const tr of staticTransforms) {
    expect(tr).toBe('none');
  }

  const samples = [initialTransforms.map(parseTransform)];

  for (let stepIndex = 1; stepIndex <= 4; stepIndex++) {
    const checkpointMs = 6000 + stepIndex * 1000;
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(1000));
    await frame.evaluate((ms) => {
      document.getAnimations().forEach((animation) => {
        animation.pause();
        animation.currentTime = ms;
      });
    }, checkpointMs);
    const stepTransforms = await frame.evaluate(() => {
      const icons = Array.from(document.querySelectorAll('.stat-expression .medallion img'));
      return icons.map((el) => (el as HTMLElement).style.transform);
    });
    expect(stepTransforms).toHaveLength(9);
    samples.push(stepTransforms.map(parseTransform));
  }

  type IconSeries = {
    index: number;
    motion: string;
    samples: Array<{ x: number; y: number; rot: number; scale: number }>;
  };

  const iconSeries: IconSeries[] = motions.map((motion, idx) => ({
    index: idx,
    motion,
    samples: samples.map((s) => s[idx]),
  }));

  const floatGroup = iconSeries.filter((item) => item.motion === 'float');
  const swayGroup = iconSeries.filter((item) => item.motion === 'sway');
  const breatheGroup = iconSeries.filter((item) => item.motion === 'breathe');

  expect(floatGroup.length).toBeGreaterThan(0);
  expect(swayGroup.length).toBeGreaterThan(0);
  expect(breatheGroup.length).toBeGreaterThan(0);

  for (const icon of floatGroup) {
    const ys = icon.samples.map((s) => s.y);
    const yDelta = Math.max(...ys) - Math.min(...ys);
    expect(yDelta).toBeGreaterThan(0.8);
    for (const sample of icon.samples) {
      expect(Math.abs(sample.rot)).toBeLessThanOrEqual(3.5);
    }
  }

  for (const icon of swayGroup) {
    const maxAbsRot = Math.max(...icon.samples.map((s) => Math.abs(s.rot)));
    expect(maxAbsRot).toBeGreaterThanOrEqual(3);
    for (const sample of icon.samples) {
      expect(Math.abs(sample.y)).toBeLessThanOrEqual(0.5);
    }
  }

  for (const icon of breatheGroup) {
    for (const sample of icon.samples) {
      expect(Math.abs(sample.rot)).toBeLessThanOrEqual(0.2);
    }
    const scales = icon.samples.map((s) => s.scale);
    const scaleDelta = Math.max(...scales) - Math.min(...scales);
    const liftInProgress = icon.samples.some((s) => Math.abs(s.y) > 0.5 && Math.abs(s.y) <= 6);
    expect(scaleDelta > 0.01 || liftInProgress).toBe(true);
  }
});

test('the ambient sweep runs only when motion is allowed', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'status', 6000);
  const animationName = await frame.evaluate(() => {
    const el = document.querySelector('.expression-stats');
    return el ? window.getComputedStyle(el, '::after').animationName : '';
  });
  expect(animationName).toBe('status-light-sweep');

  const pageReduced = await page.context().newPage();
  try {
    const { frame: reducedFrame, still } = await reducedMotionScene(pageReduced, 'status');
    expect(still).toBe(true);

    const reducedAnimationName = await reducedFrame.evaluate(() => {
      const el = document.querySelector('.expression-stats');
      return el ? window.getComputedStyle(el, '::after').animationName : '';
    });
    expect(reducedAnimationName).toBe('none');

    const transforms = await reducedFrame.evaluate(() => {
      const icons = Array.from(document.querySelectorAll('.stat-expression .medallion img'));
      return icons.map((el) => (el as HTMLElement).style.transform);
    });
    expect(transforms).toHaveLength(9);
    for (const tr of transforms) {
      expect(tr === '' || tr === 'none' || tr === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true);
    }
  } finally {
    await pageReduced.close();
  }
});

test('no icon exceeds the motion envelope over 30 seconds', async ({ page }) => {
  test.setTimeout(120000);
  const checkpoints = [2000, 9000, 16000, 23000, 30000];

  for (const ms of checkpoints) {
    const checkPage = await page.context().newPage();
    try {
      const { frame } = await openStudioScene(checkPage, 'status', ms);
      const transforms = await frame.evaluate(() => {
        const icons = Array.from(document.querySelectorAll('.stat-expression .medallion img'));
        return icons.map((el) => (el as HTMLElement).style.transform);
      });

      expect(transforms).toHaveLength(9);

      for (const tr of transforms) {
        const parsed = parseTransform(tr);
        expect(Math.abs(parsed.x)).toBeLessThanOrEqual(6);
        expect(Math.abs(parsed.y)).toBeLessThanOrEqual(6);
        expect(Math.abs(parsed.rot)).toBeLessThanOrEqual(7);
        expect(parsed.scale).toBeGreaterThanOrEqual(0.97);
        expect(parsed.scale).toBeLessThanOrEqual(1.03);
      }
    } finally {
      await checkPage.close();
    }
  }
});
