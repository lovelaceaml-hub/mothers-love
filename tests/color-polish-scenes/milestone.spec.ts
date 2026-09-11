import { expect, test } from '@playwright/test';
import {
  circularity,
  noOverflow,
  openStudioScene,
  reducedMotionScene,
  studioClickDoesNotAdvance,
} from './helpers';

test('milestone renders and does not overflow at 14 s', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'milestone', 14000);

  const overflow = await noOverflow(frame);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);

  const clickResult = await studioClickDoesNotAdvance(page, frame);
  expect(clickResult.before).toBe(clickResult.after);

  const streamPearls = await frame.evaluate(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('.stream-pearl'));
    return elements.map((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        width: rect.width,
        height: rect.height,
        borderRadius: style.borderRadius,
        offsetWidth: el.offsetWidth,
      };
    });
  });

  expect(streamPearls.length).toBeGreaterThanOrEqual(14);
  for (const pearl of streamPearls) {
    expect(Math.abs(pearl.width - pearl.height)).toBeLessThanOrEqual(1);
    const isPercent = pearl.borderRadius.includes('50%');
    const numericRadius = parseFloat(pearl.borderRadius);
    const halfWidth = pearl.offsetWidth / 2;
    const isHalfWidth =
      !isNaN(numericRadius) &&
      (Math.abs(numericRadius - halfWidth) <= 1 || Math.abs(numericRadius - pearl.width / 2) <= 1);
    expect(isPercent || isHalfWidth).toBe(true);
  }

  const circleResult = await circularity(frame);
  expect(circleResult.failures).toHaveLength(0);
});

test('the stream is dense, continuous and individual', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'milestone', 1000);

  const checkpoints = [1000, 6000, 11000, 16000, 21000, 26000];
  const samples: Array<
    Array<{
      id: string;
      x: number;
      y: number;
      z: number;
      scale: number;
      rise: number;
      radius: number;
      turn: number;
    }>
  > = [];

  for (let i = 0; i < checkpoints.length; i++) {
    if (i > 0) {
      const dtMs = checkpoints[i] - checkpoints[i - 1];
      await frame.evaluate((stepMs) => {
        (window as any).colorPolishRuntime.step(stepMs);
      }, dtMs);
    }

    const stream = await frame.evaluate(() => {
      return (window as any).colorPolishRuntime.visualState().stream as Array<{
        id: string;
        x: number;
        y: number;
        z: number;
        scale: number;
        rise: number;
        radius: number;
        turn: number;
      }>;
    });

    expect(stream.length).toBeGreaterThanOrEqual(14);

    const triples = new Set<string>();
    for (const node of stream) {
      const key = `${node.rise},${node.radius},${node.turn}`;
      expect(triples.has(key)).toBe(false);
      triples.add(key);
    }

    samples.push(stream);
  }

  for (let i = 1; i < samples.length; i++) {
    const prevSample = samples[i - 1];
    const currSample = samples[i];
    for (const currNode of currSample) {
      const prevNode = prevSample.find((n) => n.id === currNode.id);
      if (!prevNode) continue;
      const movedDown = currNode.y - prevNode.y;
      if (movedDown > 40) {
        expect(prevNode.y).toBeLessThan(350);
        expect(currNode.y).toBeGreaterThan(400);
      }
    }
  }
});

test('extreme depth', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'milestone', 1000);

  const checkpoints = [1000, 6000, 11000, 16000, 21000, 26000];
  let smallestMinZ = Infinity;
  let largestMaxZ = -Infinity;
  let largestMaxScale = -Infinity;

  for (let i = 0; i < checkpoints.length; i++) {
    if (i > 0) {
      const dtMs = checkpoints[i] - checkpoints[i - 1];
      await frame.evaluate((stepMs) => {
        (window as any).colorPolishRuntime.step(stepMs);
      }, dtMs);
    }

    const sample = await frame.evaluate(() => {
      const runtime = (window as any).colorPolishRuntime;
      const stream = runtime.visualState().stream as Array<{
        id: string;
        x: number;
        y: number;
        z: number;
        scale: number;
        rise: number;
        radius: number;
        turn: number;
      }>;
      const nodeElements = Array.from(document.querySelectorAll<HTMLElement>('.stream-node'));
      const blurs = nodeElements.map((el) => {
        const filter = window.getComputedStyle(el).filter;
        if (!filter || filter === 'none') return 0;
        const match = filter.match(/blur\(([^)]+)\)/);
        return match ? parseFloat(match[1]) : 0;
      });
      return { stream, blurs };
    });

    const { stream, blurs } = sample;
    expect(stream.length).toBeGreaterThanOrEqual(14);

    const minZ = Math.min(...stream.map((n) => n.z));
    const maxZ = Math.max(...stream.map((n) => n.z));
    smallestMinZ = Math.min(smallestMinZ, minZ);
    largestMaxZ = Math.max(largestMaxZ, maxZ);
    expect(minZ).toBeLessThanOrEqual(-500);
    expect(maxZ).toBeGreaterThanOrEqual(200);

    const hasBlurAtLeastOneAndHalf = blurs.some((b) => b >= 1.5);
    const hasBlurZeroOrNone = blurs.some((b) => b <= 0.05);
    expect(hasBlurAtLeastOneAndHalf).toBe(true);
    expect(hasBlurZeroOrNone).toBe(true);

    const maxScale = Math.max(...stream.map((n) => n.scale));
    largestMaxScale = Math.max(largestMaxScale, maxScale);
    expect(maxScale).toBeGreaterThanOrEqual(1.2);
  }

  expect(smallestMinZ).toBeLessThanOrEqual(-600);
  expect(largestMaxZ).toBeGreaterThanOrEqual(300);
  expect(largestMaxScale).toBeGreaterThanOrEqual(1.4);
});

test('reduced motion renders the milestone still', async ({ page }) => {
  const { frame, still } = await reducedMotionScene(page, 'milestone');
  expect(still).toBe(true);

  const stream = await frame.evaluate(() => {
    return (window as any).colorPolishRuntime.visualState().stream as Array<unknown>;
  });
  expect(stream.length).toBeGreaterThanOrEqual(14);
});
