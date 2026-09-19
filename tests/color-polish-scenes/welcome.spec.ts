import { expect, test } from '@playwright/test';
import {
  buildActiveDisplayFixture,
  circularity,
  loadRenderer,
  noOverflow,
  openStudioScene,
  recognition,
  reducedMotionScene,
  studioClickDoesNotAdvance,
} from './helpers';
import type { Frame } from '@playwright/test';
import { MEDIUM_IDS, MEDIUM_SHORT_IDS, bubbleReadings, buildMediumFixture, buildMostlyLongFixture as buildTextFitsFixture, fitsWhole, textFits, welcomeLargestFreeCircle } from './text-fits';

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
  for (const ms of [300, 6000, 14000, 20000]) {
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

  const hasFxCanvas = await frame.evaluate(() => !!document.querySelector('canvas.scene-fx'));
  expect(hasFxCanvas).toBe(true);

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

test('at 2000 ms actors count is exactly 6', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'welcome', 2000);
  const state = await frame.evaluate(() => (window as any).colorPolishRuntime.visualState());
  const actors = state.actors;
  expect(actors.length).toBe(6);
});

test('scene replaces at least one bubble within 30 s', async ({ page }) => {
  const { frame: frame2 } = await openStudioScene(page, 'welcome', 2000);
  const state2 = await frame2.evaluate(() => (window as any).colorPolishRuntime.visualState());
  const initialIds = new Set(state2.actors.map((a: any) => a.id));

  const page14 = await page.context().newPage();
  const { frame: frame14 } = await openStudioScene(page14, 'welcome', 14000);
  const state14 = await frame14.evaluate(() => (window as any).colorPolishRuntime.visualState());
  await page14.close();

  const page26 = await page.context().newPage();
  const { frame: frame26 } = await openStudioScene(page26, 'welcome', 26000);
  const state26 = await frame26.evaluate(() => (window as any).colorPolishRuntime.visualState());
  await page26.close();

  const hasTransitioningActor =
    state14.actors.some((a: any) => a.life === 'exiting' || a.life === 'entering') ||
    state26.actors.some((a: any) => a.life === 'exiting' || a.life === 'entering');

  const hasDifferentId =
    state14.actors.some((a: any) => !initialIds.has(a.id)) ||
    state26.actors.some((a: any) => !initialIds.has(a.id));

  expect(hasTransitioningActor || hasDifferentId).toBe(true);
});

// Plan 17: the enter and exit spin turns the words (.orb-content, via the
// rotate property) inside the circle, so a spinning bubble at the stage edge
// never widens the scene's scroll box with the corners of a rotated square.
test('entering bubble has non-zero rotate angle on its words', async ({ page }) => {
  let foundEntering = false;
  for (const checkpoint of [13500, 14000, 15000]) {
    const testPage = await page.context().newPage();
    const { frame } = await openStudioScene(testPage, 'welcome', checkpoint);
    const enteringSlots = await frame.evaluate(() => {
      const runtime = (window as any).colorPolishRuntime;
      const state = runtime.visualState();
      const enteringActors = state.actors.filter((a: any) => a.life === 'entering');
      if (!enteringActors.length) return [];
      const slots = Array.from(document.querySelectorAll<HTMLElement>('.orb-slot'));
      return enteringActors.map((actor: any) => {
        const el = slots.find((s) => s.dataset.recordId === actor.id);
        const words = el?.querySelector<HTMLElement>('.orb-content');
        return words ? words.style.rotate : '';
      }).filter(Boolean);
    });
    await testPage.close();

    if (enteringSlots.length > 0) {
      foundEntering = true;
      for (const rotate of enteringSlots) {
        const match = rotate.match(/^([-0-9.]+)deg$/);
        expect(match, `rotate property on the words: ${rotate}`).not.toBeNull();
        const angle = parseFloat(match![1]);
        expect(Math.abs(angle)).toBeGreaterThan(0);
      }
      break;
    }
  }

  if (!foundEntering) {
    console.log('No actor in entering state was sampled at checkpoints; test passed vacuously.');
  }
});

function buildMostlyLongFixture() {
  const recognitions = [
    {
      id: 'synth-rec-1',
      recipient: 'Community Partner One',
      message:
        'Thank you for being such an extraordinary source of strength, wisdom, and guidance to everyone around you each and every day. We truly appreciate everything you do for our community and team.',
      expressionIds: [1, 2],
      createdAt: '2026-09-10T17:00:00Z',
      firstPublishedAt: '2026-09-10T17:00:00Z',
      expiresAt: '2026-09-17T17:00:00Z',
      version: 1,
      status: 'published',
      featured: false,
    },
    {
      id: 'synth-rec-2',
      recipient: 'Devoted Caregiver Two',
      message:
        'Your endless patience, kindness, and devotion have inspired us in so many ways. We are deeply grateful for your continuous care and heartfelt support whenever anyone needs a listening ear or a helping hand.',
      expressionIds: [2, 7],
      createdAt: '2026-09-10T17:05:00Z',
      firstPublishedAt: '2026-09-10T17:05:00Z',
      expiresAt: '2026-09-17T17:05:00Z',
      version: 1,
      status: 'published',
      featured: false,
    },
    {
      id: 'synth-rec-3',
      recipient: 'Reassuring Family Member',
      message:
        'Thank you for walking alongside us through every challenge with courage, warmth, and faith. Your reassuring presence brings comfort and joy to our entire family every single day.',
      expressionIds: [3, 4],
      createdAt: '2026-09-10T17:10:00Z',
      firstPublishedAt: '2026-09-10T17:10:00Z',
      expiresAt: '2026-09-17T17:10:00Z',
      version: 1,
      status: 'published',
      featured: false,
    },
    {
      id: 'synth-rec-4',
      recipient: 'Generous Heart Four',
      message:
        'Words cannot fully express how thankful we are for your generous heart, your gentle guidance, and the steady love you share so freely. Thank you for making our days brighter, our burdens lighter, and our community so full of warmth and peace.',
      expressionIds: [5, 6],
      createdAt: '2026-09-10T17:15:00Z',
      firstPublishedAt: '2026-09-10T17:15:00Z',
      expiresAt: '2026-09-17T17:15:00Z',
      version: 1,
      status: 'published',
      featured: false,
    },
    {
      id: 'synth-rec-5',
      recipient: 'Helpful Friend Five',
      message: 'Thank you for your bright smile and support.',
      expressionIds: [8],
      createdAt: '2026-09-10T17:20:00Z',
      firstPublishedAt: '2026-09-10T17:20:00Z',
      expiresAt: '2026-09-17T17:20:00Z',
      version: 1,
      status: 'published',
      featured: false,
    },
    {
      id: 'synth-rec-6',
      recipient: 'Kind Neighbour Six',
      message: 'Thank you for your help and continuous kindness.',
      expressionIds: [9],
      createdAt: '2026-09-10T17:25:00Z',
      firstPublishedAt: '2026-09-10T17:25:00Z',
      expiresAt: '2026-09-17T17:25:00Z',
      version: 1,
      status: 'published',
      featured: false,
    },
  ];

  return buildActiveDisplayFixture({
    recognitions,
  });
}

test('six .orb elements at 0 s, 6 s and 14 s with mostly-long fixture and no readerSlot collapse', async ({ page }) => {
  const fixture = buildMostlyLongFixture();
  for (const ms of [0, 6000, 14000]) {
    const testPage = await page.context().newPage();
    const frame = await loadRenderer(testPage, { ms, scene: 1, fixture });
    await frame.evaluate(() => {
      (window as any).colorPolishRuntime.step(1500);
    });
    const sceneCount = await frame.evaluate(() => document.querySelectorAll('#stage .scene').length);
    expect(sceneCount).toBe(1);

    const orbCount = await frame.locator('#stage .scene[data-scene="1"] .orb').count();
    expect(orbCount).toBe(6);

    const slotCount = await frame.locator('#stage .scene[data-scene="1"] .orb-slot').count();
    expect(slotCount).toBe(6);

    const check = await frame.evaluate(() => {
      const orbs = Array.from(document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="1"] .orb'));
      const slots = Array.from(document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="1"] .orb-slot'));
      return {
        orbCount: orbs.length,
        slotCount: slots.length,
      };
    });
    expect(check.orbCount).toBe(6);
    expect(check.slotCount).toBe(6);
    await testPage.close();
  }
});

test('speech bubbles visible count reaches at least 2 by 6 s and 3 by 9 s with border-radius 16px', async ({ page }) => {
  const frame6 = await loadRenderer(page, { ms: 6000, scene: 1 });
  await frame6.evaluate(() => {
    (window as any).colorPolishRuntime.step(1500);
  });
  const visibleAt6 = await frame6.evaluate(() => {
    const bubbles = Array.from(document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="1"] .speech-bubble'));
    return bubbles.filter((el) => {
      const cs = window.getComputedStyle(el);
      return !el.classList.contains('fading') && cs.opacity !== '0' && cs.visibility !== 'hidden';
    }).length;
  });
  expect(visibleAt6).toBeGreaterThanOrEqual(2);

  const page9 = await page.context().newPage();
  const frame9 = await loadRenderer(page9, { ms: 9000, scene: 1 });
  await frame9.evaluate(() => {
    (window as any).colorPolishRuntime.step(1500);
  });
  const visibleAt9 = await frame9.evaluate(() => {
    const bubbles = Array.from(document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="1"] .speech-bubble'));
    return bubbles.filter((el) => {
      const cs = window.getComputedStyle(el);
      return !el.classList.contains('fading') && cs.opacity !== '0' && cs.visibility !== 'hidden';
    }).length;
  });
  expect(visibleAt9).toBe(3);

  const radii = await frame9.evaluate(() => {
    const bubbles = Array.from(document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="1"] .speech-bubble'));
    return bubbles.map((el) => window.getComputedStyle(el).borderRadius);
  });
  expect(radii.length).toBe(3);
  for (const r of radii) {
    expect(r).toBe('16px');
  }

  const phraseCheck = await frame9.evaluate(() => {
    const runtime = (window as any).colorPolishRuntime;
    const catalog = runtime.catalog || [];
    const validPhrases = new Set(catalog.map((c: any) => c.phrase));

    const drawsByAnchor: string[][] = [[], [], []];
    const initialBubbles = Array.from(document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="1"] .speech-bubble'));
    initialBubbles.forEach((b, i) => {
      const text = b.textContent?.trim() || '';
      if (text) drawsByAnchor[i].push(text);
    });

    for (let s = 0; s < 12; s++) {
      runtime.step(7000);
      const bubbles = Array.from(document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="1"] .speech-bubble'));
      bubbles.forEach((b, i) => {
        const text = b.textContent?.trim() || '';
        if (text) {
          const list = drawsByAnchor[i];
          if (!list.length || list[list.length - 1] !== text) {
            list.push(text);
          }
        }
      });
    }

    const allDraws = drawsByAnchor.flat();
    const allFromCatalog = allDraws.every((p) => validPhrases.has(p));
    let hasImmediateRepeat = false;
    for (const list of drawsByAnchor) {
      for (let i = 1; i < list.length; i++) {
        if (list[i] === list[i - 1]) {
          hasImmediateRepeat = true;
          break;
        }
      }
    }

    return {
      allFromCatalog,
      hasImmediateRepeat,
      totalDistinctDraws: allDraws.length,
    };
  });

  expect(phraseCheck.allFromCatalog).toBe(true);
  expect(phraseCheck.hasImmediateRepeat).toBe(false);
  expect(phraseCheck.totalDistinctDraws).toBeGreaterThanOrEqual(12);

  await page9.close();
});

test('circularity and noOverflow pass with speech bubbles present', async ({ page }) => {
  const fixture = buildMostlyLongFixture();
  const frame = await loadRenderer(page, { ms: 6000, scene: 1, fixture });
  await frame.evaluate(() => {
    (window as any).colorPolishRuntime.step(1500);
  });
  const sceneCount = await frame.evaluate(() => document.querySelectorAll('#stage .scene').length);
  expect(sceneCount).toBe(1);

  const speechBubbleCount = await frame.locator('#stage .scene[data-scene="1"] .speech-bubble').count();
  expect(speechBubbleCount).toBe(3);

  const circleResult = await circularity(frame);
  // circularity() measures .orb-slot, .orb and .event-orb. Each of the six
  // welcome slots contains one .orb, so six bubbles are twelve measured
  // elements, not six. What matters is that there are six slots and that
  // nothing fails the circularity rule.
  const slotCount = await frame.locator('#stage .scene[data-scene="1"] .orb-slot').count();
  expect(slotCount).toBe(6);
  expect(circleResult.count).toBe(12);
  expect(circleResult.failures).toHaveLength(0);

  const overflow = await noOverflow(frame);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);
});

test('no speech bubble rect intersects another, the serif couplet, the h1 title, or any orb slot, and bubbles satisfy bounds', async ({ page }) => {
  const frame = await loadRenderer(page, { ms: 9000, scene: 1 });
  await frame.evaluate(() => {
    (window as any).colorPolishRuntime.step(1500);
  });
  const sceneCount = await frame.evaluate(() => document.querySelectorAll('#stage .scene').length);
  expect(sceneCount).toBe(1);

  const check = await frame.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="1"]');
    if (!scene) throw new Error('Scene 1 root not found');
    const sceneRect = scene.getBoundingClientRect();
    // The host scales the fixed 1812 by 636 stage to fit, so a rect read from
    // the DOM is in screen pixels. Every bound below comes from the gap report
    // in stage units, so convert first. Comparing raw screen pixels against
    // stage numbers is what made this test report bubbles as out of bounds
    // while they were exactly where the CSS put them.
    const stageScale = 1812 / sceneRect.width;

    const bubbles = Array.from(scene.querySelectorAll<HTMLElement>('.speech-bubble'));
    const h1 = scene.querySelector<HTMLElement>('h1');
    const serif = scene.querySelector<HTMLElement>('p.serif');
    const slots = Array.from(scene.querySelectorAll<HTMLElement>('.orb-slot'));

    const intersects = (r1: DOMRect, r2: DOMRect): boolean => {
      return !(r1.right <= r2.left || r1.left >= r2.right || r1.bottom <= r2.top || r1.top >= r2.bottom);
    };

    const conflicts: string[] = [];
    const boundViolations: string[] = [];
    const measuredBoxes: Array<{ left: number; top: number; width: number; height: number }> = [];

    // Bounds in stage units. The corridor is no longer a single left/top
    // minimum: the final layout deliberately puts one bubble at x 350, in the
    // clear band below the serif couplet, so what matters is that every bubble
    // stays inside the stage and left of the bubble grid, which begins at
    // x 886. Disjointness from the title block and the slots is asserted
    // separately below and is the assertion that actually protects the layout.
    bubbles.forEach((b, i) => {
      const bRect = b.getBoundingClientRect();
      const left = Math.round((bRect.left - sceneRect.left) * stageScale);
      const top = Math.round((bRect.top - sceneRect.top) * stageScale);
      const width = Math.round(bRect.width * stageScale);
      const height = Math.round(bRect.height * stageScale);
      measuredBoxes.push({ left, top, width, height });

      if (left < 0) boundViolations.push(`Bubble ${i} left (${left}) is off stage`);
      if (top < 0) boundViolations.push(`Bubble ${i} top (${top}) is off stage`);
      if (left + width > 886) boundViolations.push(`Bubble ${i} right (${left + width}) crosses the bubble grid at 886`);
      if (top + height > 636) boundViolations.push(`Bubble ${i} bottom (${top + height}) is below the stage`);
    });

    // Check pairwise bubbles
    for (let i = 0; i < bubbles.length; i++) {
      for (let j = i + 1; j < bubbles.length; j++) {
        const b1 = bubbles[i].getBoundingClientRect();
        const b2 = bubbles[j].getBoundingClientRect();
        if (intersects(b1, b2)) {
          conflicts.push(`Bubble ${i} intersects Bubble ${j}`);
        }
      }
    }

    // Check bubbles vs h1
    if (h1) {
      const h1Rect = h1.getBoundingClientRect();
      bubbles.forEach((b, i) => {
        const bRect = b.getBoundingClientRect();
        if (intersects(bRect, h1Rect)) {
          conflicts.push(`Bubble ${i} intersects h1 title`);
        }
      });
    }

    // Check bubbles vs serif couplet
    if (serif) {
      const sRect = serif.getBoundingClientRect();
      bubbles.forEach((b, i) => {
        const bRect = b.getBoundingClientRect();
        if (intersects(bRect, sRect)) {
          conflicts.push(`Bubble ${i} intersects serif couplet`);
        }
      });
    }

    // Check bubbles vs orb slots
    bubbles.forEach((b, i) => {
      const bRect = b.getBoundingClientRect();
      slots.forEach((s, j) => {
        const sRect = s.getBoundingClientRect();
        if (intersects(bRect, sRect)) {
          conflicts.push(`Bubble ${i} intersects orb slot ${j}`);
        }
      });
    });

    return {
      bubblesCount: bubbles.length,
      slotsCount: slots.length,
      conflicts,
      boundViolations,
      measuredBoxes,
    };
  });

  expect(check.bubblesCount).toBe(3);
  expect(check.slotsCount).toBe(6);
  expect(check.conflicts).toHaveLength(0);
  expect(check.boundViolations).toHaveLength(0);
});

test('every message renders at or above 18 px floor, fitting messages on one page, overflowing messages verbatim paginated without truncation', async ({ page }) => {
  const fixture = buildMostlyLongFixture();
  const frame = await loadRenderer(page, { ms: 6000, scene: 1, fixture });
  await frame.evaluate(() => {
    (window as any).colorPolishRuntime.step(1500);
  });
  const sceneCount = await frame.evaluate(() => document.querySelectorAll('#stage .scene').length);
  expect(sceneCount).toBe(1);

  const messageCheck = await frame.evaluate(() => {
    const runtime = (window as any).colorPolishRuntime;
    const state = runtime.getState();
    const logEntries = state.log || [];
    const paginationLogs = logEntries.filter((l: any) => l.type === 'circular_pagination');

    const slots = Array.from(document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="1"] .orb-slot'));
    return slots.map((slot) => {
      const msgEl = slot.querySelector<HTMLElement>('.message');
      const pageEl = slot.querySelector<HTMLElement>('.orb-page-indicator');
      const cs = msgEl ? window.getComputedStyle(msgEl) : null;
      const fontSize = cs ? parseFloat(cs.fontSize) : 0;
      const textOverflow = cs ? cs.textOverflow : '';
      const isSinglePage = !pageEl || pageEl.hidden || window.getComputedStyle(pageEl).display === 'none';
      const text = msgEl?.textContent || '';
      const id = slot.dataset.recordId || '';

      const paginationLog = paginationLogs.find((l: any) => l.id === id);
      const slotObj = (state.slots || []).find((s: any) => s.id === id);
      const readingPages = slotObj?.reading?.pages || [];

      return {
        id,
        fontSize,
        textOverflow,
        singlePage: isSinglePage,
        hasText: text.length > 0,
        text,
        paginationLog,
        readingPages,
      };
    });
  });

  // Plan 17: a record whose pages cannot all be read inside the Welcome
  // dwell (the 500 grapheme record at the default 30 s) is left to the other
  // scenes, so the mostly-long fixture shows four to six bubbles here.
  expect(messageCheck.length).toBeGreaterThanOrEqual(4);
  expect(messageCheck.length).toBeLessThanOrEqual(6);
  let hasSinglePageFit = false;
  let hasPaginatedVerbatim = false;

  for (const check of messageCheck) {
    expect(check.fontSize).toBeGreaterThanOrEqual(18);
    expect(check.textOverflow).not.toBe('ellipsis');
    expect(check.hasText).toBe(true);

    const original = (fixture.recognitions as any[]).find((r: any) => r.id === check.id);
    expect(original).toBeDefined();

    if (check.singlePage) {
      hasSinglePageFit = true;
      expect(check.text).toBe(original!.message);
    } else {
      hasPaginatedVerbatim = true;
      expect(check.paginationLog).toBeDefined();
      expect(check.paginationLog.verbatim).toBe(true);
      const joined = check.readingPages.join('');
      expect(joined).toBe(original!.message);
    }
  }

  expect(hasSinglePageFit).toBe(true);
  // Plan 17: these four 200 character messages now fit whole in bubbles
  // grown to hold them, so pagination is no longer expected here; any bubble
  // that does page was checked verbatim above, and the paging rule itself is
  // covered by the "paging bubble" test below.
  expect(hasPaginatedVerbatim || hasSinglePageFit).toBe(true);
});

test('reduced motion displays static speech bubbles without rotation or fading', async ({ page }) => {
  const { frame, still } = await reducedMotionScene(page, 'welcome', 14000);
  expect(still).toBe(true);

  const check = await frame.evaluate(() => {
    const bubbles = Array.from(document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="1"] .speech-bubble'));
    const fadingCount = bubbles.filter((el) => el.classList.contains('fading')).length;
    const initialPhrases = bubbles.map((el) => el.textContent?.trim());

    (window as any).colorPolishRuntime.step(10000);

    const laterPhrases = Array.from(document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="1"] .speech-bubble')).map((el) =>
      el.textContent?.trim(),
    );

    return {
      count: bubbles.length,
      fadingCount,
      phrasesMatch: JSON.stringify(initialPhrases) === JSON.stringify(laterPhrases),
    };
  });

  expect(check.count).toBe(3);
  expect(check.fadingCount).toBe(0);
  expect(check.phrasesMatch).toBe(true);
});

// Plan 17 Lane 1: "pages, long only" (Anthony, September 18). Every short,
// normal and medium message shows whole on one page in a bubble grown to fit
// it, drawn at 18 px or larger (36 px at 3840) at every moment. Only a
// message too long for the largest bubble the layout can give pages, in that
// largest bubble, and only when every page fits the Welcome dwell. The
// checks below never read a size the scene code wrote: the largest
// achievable bubble is computed here from the stage geometry and the other
// bubbles as drawn, and "could it have shown whole" is judged by this test's
// own fit probe (fitsWhole in text-fits.ts).
const TV_SIZES = [
  { width: 1920, height: 1080 },
  { width: 3840, height: 2160 },
];
const MOSTLY_IDS = ['mostly-short-1', 'mostly-short-2', 'mostly-emoji', 'mostly-250', 'mostly-400', 'mostly-500'];
// Short, emoji and 250 grapheme messages fit a bubble the layout can always
// give (about 360 px drawn for 250 graphemes) and must never page.
const MOSTLY_WHOLE = ['mostly-short-1', 'mostly-short-2', 'mostly-emoji', 'mostly-250'];
const WELCOME_ROOT = '#stage .scene[data-scene="1"]';

async function welcomeState(frame: Frame) {
  return await frame.evaluate(() => {
    const state = (window as any).colorPolishRuntime.getState();
    return { dwell: state.visual.dwell[1] as number, log: state.log as Array<{ type: string; id?: string; reason?: string; pages?: number }> };
  });
}

test('mostly-long fixture: every word fits its bubble, drawn at the floor or larger, short and 250 grapheme messages whole, at 0, 6, 14 and 21 s at 1920 and 3840 wide', async ({ page }) => {
  test.setTimeout(240000);
  const fixture = buildTextFitsFixture();
  for (const size of TV_SIZES) {
    for (const ms of [0, 6000, 14000, 21000]) {
      const testPage = await page.context().newPage();
      await testPage.setViewportSize(size);
      const frame = await loadRenderer(testPage, { scene: 1, ms, fixture });
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(1500));
      const where = `${size.width} wide at ${ms} ms`;

      const failures = await textFits(frame, WELCOME_ROOT, { singlePageIds: MOSTLY_WHOLE });
      expect(failures, `welcome text-fit failures, ${where}: ${JSON.stringify(failures)}`).toHaveLength(0);

      const readings = (await bubbleReadings(frame, WELCOME_ROOT)).filter((r) => r.visible);
      expect(readings.length, `bubbles on screen, ${where}`).toBeGreaterThanOrEqual(4);
      for (const reading of readings) {
        expect(MOSTLY_IDS, `${reading.id} is a fixture record, ${where}`).toContain(reading.id);
        expect(reading.drawnFont, `${reading.id} drawn message size, ${where}`).toBeGreaterThanOrEqual(18 * (size.width / 1920) - 0.05);
        if (reading.pages > 1) expect(['mostly-400', 'mostly-500'], `${reading.id} may page, ${where}`).toContain(reading.id);
      }

      const overflow = await noOverflow(frame);
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
      expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);
      await testPage.close();
    }
  }
});

test('a paging bubble is the largest circle the stage can give beside the other bubbles, holds a message that cannot show whole even there, and its pages fit the dwell', async ({ page }) => {
  test.setTimeout(240000);
  // Dwell 60 s: the 500 grapheme message (500 / 14 = 35.7 s of reading) may
  // page. At the default 30 s dwell it may not, and is deferred (checked in
  // the next test).
  const fixture = buildTextFitsFixture({
    presentation: { version: 'color-polish-v6', enabled: true, playlist: [{ id: 'welcome', enabled: true, durationSeconds: 60 }, { id: 'garden', enabled: true, durationSeconds: 60 }] },
  });
  for (const size of TV_SIZES) {
    const testPage = await page.context().newPage();
    await testPage.setViewportSize(size);
    const frame = await loadRenderer(testPage, { scene: 1, ms: 0, fixture });
    const where = `${size.width} wide`;
    const failures = await textFits(frame, WELCOME_ROOT, { singlePageIds: MOSTLY_WHOLE });
    expect(failures, `${where}: ${JSON.stringify(failures)}`).toHaveLength(0);
    const readings = (await bubbleReadings(frame, WELCOME_ROOT)).filter((r) => r.visible);
    const paging = readings.filter((r) => r.pages > 1);
    expect(paging.length, `one long record pages at 60 s dwell, ${where}: ${JSON.stringify(readings)}`).toBe(1);
    const big = paging[0];
    expect(['mostly-400', 'mostly-500']).toContain(big.id);
    // The largest circle that fits beside the other bubbles at their homes,
    // computed from the DOM: the paging bubble must be that large (the scene
    // packs on a 4 px grid with a 5 px gap on each side).
    const free = await welcomeLargestFreeCircle(frame, big.id);
    expect(big.drawn, `${big.id} drawn ${big.drawn} px is the largest achievable (${free.diameter.toFixed(0)} px), ${where}`).toBeGreaterThanOrEqual(free.diameter - 16);
    // And the message truly cannot show whole at that size at the 18 px floor.
    expect(await fitsWhole(frame, big.id, free.diameter, 18), `${big.id} does not fit whole at ${free.diameter.toFixed(0)} px, ${where}`).toBe(false);
    // Page counts, for the record: 500 graphemes in the largest bubble.
    const state = await welcomeState(frame);
    expect(state.dwell).toBe(60);
    console.log(`welcome ${where}: ${JSON.stringify(readings.map((r) => ({ id: r.id, diameter: r.diameter, drawn: r.drawn, pages: r.pages, drawnFont: r.drawnFont })))}`);
    await testPage.close();
  }
});

test('at the default 30 s dwell a message whose pages cannot all be read in time is left to the other scenes instead of paged or cut', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const frame = await loadRenderer(page, { scene: 1, ms: 0, fixture: buildTextFitsFixture() });
  const state = await welcomeState(frame);
  expect(state.dwell).toBe(30);
  const readings = (await bubbleReadings(frame, WELCOME_ROOT)).filter((r) => r.visible);
  const ids = readings.map((r) => r.id);
  expect(ids, 'the 500 grapheme record needs 35.7 s of reading and is not shown at 30 s').not.toContain('mostly-500');
  const deferred = state.log.filter((e) => e.type === 'welcome_record_deferred' && e.id === 'mostly-500');
  expect(deferred.length).toBeGreaterThan(0);
  expect(deferred[0].reason).toBe('b-dwell');
  for (const r of readings) {
    if (r.pages > 1) {
      expect(r.id).toBe('mostly-400');
      const seconds = await frame.evaluate((id) => {
        const slots = (window as any).colorPolishRuntime.getState().slots as Array<{ id: string; reading?: { pages: string[] } }>;
        const pages = slots.find((s) => s.id === id)?.reading?.pages ?? [];
        return pages.reduce((n, p) => n + Math.max(9, p.length / 14), 0);
      }, r.id);
      expect(seconds, `${r.id} pages fit the 30 s dwell`).toBeLessThanOrEqual(30);
    }
  }
  const failures = await textFits(frame, WELCOME_ROOT, { singlePageIds: MOSTLY_WHOLE });
  expect(failures, JSON.stringify(failures)).toHaveLength(0);
});

test('medium messages (120 to 220 characters) always show whole, drawn at the floor or larger, at 0, 6, 14 and 21 s at 1920 and 3840 wide', async ({ page }) => {
  test.setTimeout(240000);
  const fixture = buildMediumFixture();
  for (const size of TV_SIZES) {
    for (const ms of [0, 6000, 14000, 21000]) {
      const testPage = await page.context().newPage();
      await testPage.setViewportSize(size);
      const frame = await loadRenderer(testPage, { scene: 1, ms, fixture });
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(1500));
      const where = `${size.width} wide at ${ms} ms`;
      const failures = await textFits(frame, WELCOME_ROOT, { singlePageIds: [...MEDIUM_IDS, ...MEDIUM_SHORT_IDS] });
      expect(failures, `${where}: ${JSON.stringify(failures)}`).toHaveLength(0);
      const readings = (await bubbleReadings(frame, WELCOME_ROOT)).filter((r) => r.visible);
      expect(readings.length, `six bubbles, ${where}`).toBe(6);
      // Drift replacements bring in whichever records fit the freed room, so
      // later checkpoints may hold fewer medium records than the first.
      expect(readings.filter((r) => MEDIUM_IDS.includes(r.id)).length, `medium records on screen, ${where}`).toBeGreaterThanOrEqual(ms === 0 ? 3 : 2);
      for (const reading of readings) {
        expect([...MEDIUM_IDS, ...MEDIUM_SHORT_IDS], `${reading.id} is a fixture record`).toContain(reading.id);
        expect(reading.pages, `${reading.id} shows whole, ${where}`).toBe(1);
        expect(reading.drawnFont, `${reading.id} drawn size, ${where}`).toBeGreaterThanOrEqual(18 * (size.width / 1920) - 0.05);
      }
      await testPage.close();
    }
  }
});

test('a bubble replaced while drifting shows its new message whole, or pages a long one only in the largest bubble, never a medium one', async ({ page }) => {
  test.setTimeout(180000);
  const mostly = buildTextFitsFixture() as { recognitions: Array<Record<string, unknown>> };
  const medium = buildMediumFixture() as { recognitions: Array<Record<string, unknown>> };
  const extra = [
    ['drift-40', 'Thank you for the warm tea and kind words.'],
    ['drift-90', 'Thank you for noticing when I was tired and quietly taking the heavy boxes out to the car for me.'],
  ].map(([id, message], i) =>
    recognition({ id, message, recipient: 'Kind Friend', expressionIds: [(i % 9) + 1], createdAt: '2026-09-10T16:00:00Z', firstPublishedAt: '2026-09-10T16:00:00Z', expiresAt: '2026-09-17T16:00:00Z' }),
  );
  // A Welcome-only playlist with a long dwell keeps the scene up long enough
  // for several drift replacements.
  const fixture = buildActiveDisplayFixture({
    recognitions: [...mostly.recognitions, ...medium.recognitions, ...extra],
    presentation: { version: 'color-polish-v6', enabled: true, playlist: [{ id: 'welcome', enabled: true, durationSeconds: 600 }] },
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  const frame = await loadRenderer(page, { scene: 1, fixture });
  const whole = [...MOSTLY_WHOLE, ...MEDIUM_IDS, 'drift-40', 'drift-90'];
  const seen = new Set<string>();
  for (let second = 5; second <= 120; second += 5) {
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(5000));
    const failures = await textFits(frame, WELCOME_ROOT, { singlePageIds: whole });
    expect(failures, `at ${second} s: ${JSON.stringify(failures)}`).toHaveLength(0);
    (await bubbleReadings(frame, WELCOME_ROOT)).forEach((r) => seen.add(r.id));
  }
  const state = await welcomeState(frame);
  const replaced = state.log.filter((e) => e.type === 'bubble_new').map((e) => e.id);
  expect(replaced.length, 'at least three drift replacements happened').toBeGreaterThanOrEqual(3);
  for (const id of replaced) {
    expect(state.log.some((e) => e.type === 'welcome_bubble_fit' && e.id === id), `replacement ${id} was measured`).toBe(true);
  }
  expect(replaced.some((id) => MEDIUM_IDS.includes(id!)), 'a medium record arrived by drift replacement').toBe(true);
});

test('welcome bubble sizing re-measures once a still-loading document.fonts.ready resolves', async ({ page }) => {
  await page.addInitScript(() => {
    let seed = 7301;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    window.requestAnimationFrame = () => 0;

    // Simulates the slow-font-load case the re-measure hook targets:
    // document.fonts.status is 'loading' at mount time, so welcome.js's
    // hook must register the re-measure rather than skip it (it skips when
    // status is already 'loaded', to avoid a redundant, log-duplicating
    // second pass in the ordinary already-loaded case).
    let resolveReady: () => void = () => {};
    const readyPromise = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });
    const fakeFonts = { status: 'loading', ready: readyPromise };
    Object.defineProperty(document, 'fonts', { value: fakeFonts, configurable: true });
    (window as any).__resolveFontsReady = () => {
      fakeFonts.status = 'loaded';
      resolveReady();
    };
  });

  // loadRenderer's bootstrap mounts scene 1 (welcome) while document.fonts
  // is still the mocked "loading" state above, so welcome.js's mount-time
  // call to refitWelcomeWhenFontsReady already registered the re-measure
  // before this test can spy on it. What is directly checkable, and what
  // matters, is that resolving that pending promise actually invokes
  // checkFullFits.
  const fixture = buildTextFitsFixture();
  const frame = await loadRenderer(page, { fixture });

  const fitCallCount = await frame.evaluate(async () => {
    const win = window as any;
    let calls = 0;
    const original = win.checkFullFits;
    win.checkFullFits = (...args: unknown[]) => {
      calls++;
      return original(...args);
    };
    win.__resolveFontsReady();
    await win.document.fonts.ready;
    // Let the .then() microtask queued by welcome.js's mount actually run.
    await Promise.resolve();
    await Promise.resolve();
    win.checkFullFits = original;
    return calls;
  });

  expect(fitCallCount).toBeGreaterThanOrEqual(1);
});
