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
    expect(visual.actors.length).toBeGreaterThanOrEqual(1);
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

test('expression panel displays catalog content and eight orbit icons at 2 s and 17 s', async ({ page }) => {
  const catalogNames = [
    'Greeting',
    'Gratitude',
    'Apology',
    'Inclusiveness',
    'Concession',
    'Respect',
    'Encouragement',
    'Consideration',
    'Compliment',
  ];

  const { frame: frame2000 } = await openStudioScene(page, 'featured', 2000);
  const panel2000 = await frame2000.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="4"]');
    const nameEl = scene?.querySelector<HTMLElement>('.feature-panel h2');
    const icons = scene?.querySelectorAll<HTMLImageElement>('.feature-orbit .orbit-icon');
    return {
      name: nameEl?.textContent?.trim() || '',
      orbitCount: icons?.length || 0,
    };
  });
  expect(catalogNames).toContain(panel2000.name);
  expect(panel2000.orbitCount).toBe(8);

  const { frame: frame17000 } = await openStudioScene(page, 'featured', 17000);
  const panel17000 = await frame17000.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="4"]');
    const nameEl = scene?.querySelector<HTMLElement>('.feature-panel h2');
    const eyebrowEl = scene?.querySelector<HTMLElement>('.eyebrow');
    return {
      name: nameEl?.textContent?.trim() || '',
      eyebrow: eyebrowEl?.textContent || '',
    };
  });
  expect(catalogNames).toContain(panel17000.name);
  const id = catalogNames.indexOf(panel17000.name) + 1;
  const paddedId = String(id).padStart(2, '0');
  expect(panel17000.eyebrow).toContain(`Expression ${paddedId} / 09`);
});

test('expression panel rotates across fresh opens', async ({ page }) => {
  test.setTimeout(60000);
  const names = new Set<string>();
  for (let i = 0; i < 6; i++) {
    const { frame } = await openStudioScene(page, 'featured', 300);
    const name = await frame.evaluate(() => {
      const h2 = document.querySelector<HTMLElement>('#stage .scene[data-scene="4"] .feature-panel h2');
      return h2?.textContent?.trim() || '';
    });
    if (name) names.add(name);
  }
  expect(names.size).toBeGreaterThanOrEqual(2);
});

test('in-pass advance flips cleanly with no error at 16 s', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  const { frame } = await openStudioScene(page, 'featured', 16000);
  await page.waitForTimeout(700);

  const classes = await frame.evaluate(() => {
    const panel = document.querySelector<HTMLElement>('#stage .scene[data-scene="4"] .feature-panel');
    return {
      hasFlipOut: panel?.classList.contains('flip-out') ?? false,
      hasFlipIn: panel?.classList.contains('flip-in') ?? false,
    };
  });

  expect(errors).toHaveLength(0);
  expect(classes.hasFlipOut).toBe(false);
  expect(classes.hasFlipIn).toBe(false);
});

test('keepAge remount preserves current expression and does not re-flip when sceneAge >= 15', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'featured', 17000);
  const before = await frame.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="4"]');
    const name = scene?.querySelector<HTMLElement>('.feature-panel h2')?.textContent?.trim() || '';
    const eyebrow = scene?.querySelector<HTMLElement>('.eyebrow')?.textContent || '';
    return { name, eyebrow };
  });

  await frame.evaluate(() => {
    (window as any).renderNow(4, { keepAge: true });
  });

  const after = await frame.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="4"]');
    const name = scene?.querySelector<HTMLElement>('.feature-panel h2')?.textContent?.trim() || '';
    const eyebrow = scene?.querySelector<HTMLElement>('.eyebrow')?.textContent || '';
    const panel = scene?.querySelector<HTMLElement>('.feature-panel');
    return {
      name,
      eyebrow,
      hasFlipOut: panel?.classList.contains('flip-out') ?? false,
      hasFlipIn: panel?.classList.contains('flip-in') ?? false,
    };
  });

  expect(after.name).toBe(before.name);
  expect(after.eyebrow).toBe(before.eyebrow);
  expect(after.hasFlipOut).toBe(false);
  expect(after.hasFlipIn).toBe(false);

  await page.waitForTimeout(900);

  const settled = await frame.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="4"]');
    const name = scene?.querySelector<HTMLElement>('.feature-panel h2')?.textContent?.trim() || '';
    const panel = scene?.querySelector<HTMLElement>('.feature-panel');
    return {
      name,
      hasFlipOut: panel?.classList.contains('flip-out') ?? false,
      hasFlipIn: panel?.classList.contains('flip-in') ?? false,
    };
  });

  expect(settled.name).toBe(before.name);
  expect(settled.hasFlipOut).toBe(false);
  expect(settled.hasFlipIn).toBe(false);
});

test('sweep clip wrapper exists and feature panel preserves 3d without overflow hidden', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'featured', 2000);
  const info = await frame.evaluate(() => {
    const panel = document.querySelector<HTMLElement>('#stage .scene[data-scene="4"] .feature-panel');
    const clip = panel?.querySelector<HTMLElement>('.feature-sweep-clip');
    const sweep = clip?.querySelector<HTMLElement>('.feature-sweep');
    const panelStyle = panel ? window.getComputedStyle(panel) : null;
    const clipStyle = clip ? window.getComputedStyle(clip) : null;
    return {
      hasClip: Boolean(clip),
      hasSweepInClip: Boolean(sweep),
      panelOverflow: panelStyle?.overflow,
      clipOverflow: clipStyle?.overflow,
    };
  });

  expect(info.hasClip).toBe(true);
  expect(info.hasSweepInClip).toBe(true);
  expect(info.panelOverflow).not.toBe('hidden');
  expect(info.clipOverflow).toBe('hidden');
});
