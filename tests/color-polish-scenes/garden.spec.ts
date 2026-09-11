import { expect, test, type Frame, type Page } from '@playwright/test';
import {
  circularity,
  noOverflow,
  openStudioScene,
  reducedMotionScene,
  studioClickDoesNotAdvance,
} from './helpers';
import { buildColorPolishSampleSnapshot } from '../../src/components/display/color-polish/sample';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const publicFolder = resolve(process.cwd(), 'public');

test('garden renders circular bubbles and no overflow at 14 s', async ({ page }) => {
  const { frame: overflowFrame } = await openStudioScene(page, 'garden', 12000);
  const overflow = await noOverflow(overflowFrame);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);

  const { frame } = await openStudioScene(page, 'garden', 14000);

  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);

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

async function setupGardenHarness(page: Page): Promise<{ frame: Frame }> {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.addInitScript(() => {
    let seed = 7301;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    window.requestAnimationFrame = () => 0;
  });

  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/probe') {
      return route.fulfill({
        contentType: 'text/html',
        body: '<html><body style="margin:0"><iframe title="Probe" sandbox="allow-scripts" referrerpolicy="no-referrer" src="/color-polish/renderer.html" style="width:100vw;height:100vh;border:0"></iframe></body></html>',
      });
    }
    if (!url.pathname.startsWith('/color-polish/') || url.pathname.includes('..')) {
      return route.abort();
    }
    const file = resolve(publicFolder, '.' + url.pathname);
    const type = file.endsWith('.js')
      ? 'text/javascript'
      : file.endsWith('.css')
      ? 'text/css'
      : file.endsWith('.html')
      ? 'text/html'
      : file.endsWith('.svg')
      ? 'image/svg+xml'
      : 'image/png';
    try {
      const body = await readFile(file);
      await route.fulfill({ contentType: type, body });
    } catch {
      await route.abort();
    }
  });

  await page.goto('/probe');
  const snapshot = buildColorPolishSampleSnapshot();

  await page.evaluate(
    async ({ snapshot }) => {
      const frame = document.querySelector('iframe');
      if (!frame || !frame.contentWindow) throw new Error('iframe not found');
      const channel = new MessageChannel();
      const nonce = crypto.randomUUID();
      await new Promise<void>((resolve) => {
        channel.port1.onmessage = (event) => {
          if (event.data.type === 'color-polish:ready') resolve();
        };
        channel.port1.start();
        frame.contentWindow!.postMessage(
          { version: 'color-polish-v6', type: 'color-polish:bootstrap', nonce, sequence: 0 },
          '*',
          [channel.port2],
        );
      });
      (window as any).probePort = channel.port1;
      (window as any).probeNonce = nonce;
      channel.port1.postMessage({
        version: 'color-polish-v6',
        type: 'color-polish:update',
        nonce,
        sequence: 1,
        snapshot,
        control: {
          nowMs: Date.parse(snapshot.serverTime),
          status: 'ready',
          source: 'sample',
          playing: true,
          scene: 'garden',
          reactionCounts: {},
          qrDataUrl: '',
          submissionUrl: snapshot.submissionUrl,
        },
      });
    },
    { snapshot },
  );

  const frame = page.frames().find((f) => f.url().endsWith('/color-polish/renderer.html'));
  if (!frame) throw new Error('renderer frame not found');
  await frame.waitForFunction(() => (window as any).colorPolishRuntime?.getState().scene === 2);

  return { frame };
}

test('petals are carried, not dropped', async ({ page }) => {
  const { frame } = await setupGardenHarness(page);

  await frame.evaluate((ms) => (window as any).colorPolishRuntime.step(ms), 15000);
  const petals15 = await frame.evaluate(() => {
    const canvas = document.getElementById('living-garden') as HTMLCanvasElement | null;
    return Number(canvas?.dataset.petals || 0);
  });
  expect(petals15).toBeGreaterThan(0);

  await frame.evaluate((ms) => (window as any).colorPolishRuntime.step(ms), 2000);
  const petals17 = await frame.evaluate(() => {
    const canvas = document.getElementById('living-garden') as HTMLCanvasElement | null;
    return Number(canvas?.dataset.petals || 0);
  });
  expect(petals17).toBeGreaterThan(0);

  await frame.evaluate((ms) => (window as any).colorPolishRuntime.step(ms), 3500);
  const petals205 = await frame.evaluate(() => {
    const canvas = document.getElementById('living-garden') as HTMLCanvasElement | null;
    return Number(canvas?.dataset.petals || 0);
  });
  expect(petals205).toBe(0);

  await frame.evaluate((ms) => (window as any).colorPolishRuntime.step(ms), 2500);
  const petals23 = await frame.evaluate(() => {
    const canvas = document.getElementById('living-garden') as HTMLCanvasElement | null;
    return Number(canvas?.dataset.petals || 0);
  });
  expect(petals23).toBeGreaterThan(0);
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
