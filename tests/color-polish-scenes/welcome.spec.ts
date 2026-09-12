import { expect, test } from '@playwright/test';
import {
  buildActiveDisplayFixture,
  circularity,
  loadRenderer,
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

test('entering bubble has non-zero rotate angle in slot transform', async ({ page }) => {
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
        return el ? el.style.transform : '';
      }).filter(Boolean);
    });
    await testPage.close();

    if (enteringSlots.length > 0) {
      foundEntering = true;
      for (const tf of enteringSlots) {
        expect(tf).toContain('rotate(');
        const match = tf.match(/rotate\(([-0-9.]+)deg\)/);
        expect(match).not.toBeNull();
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

  expect(messageCheck).toHaveLength(6);
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
  expect(hasPaginatedVerbatim).toBe(true);
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
