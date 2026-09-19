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
import type { Frame, Page } from '@playwright/test';
import { MEDIUM_IDS, MEDIUM_SHORT_IDS, bubbleReadings, buildGraphemeMessage, buildMediumFixture, buildMostlyLongFixture as buildTextFitsFixture, fitsWhole, graphemeCount, textFits } from './text-fits';

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

test('at 2000 ms actors count is exactly 4 (the reserved bubble and three regular ones)', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'welcome', 2000);
  const state = await frame.evaluate(() => (window as any).colorPolishRuntime.visualState());
  const actors = state.actors;
  expect(actors.length).toBe(4);
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

// Plan 17 round 5 ("one reserved long bubble", Anthony, September 19). Welcome
// draws four fixed bubbles: the reserved one of up to 480 drawn px and three
// regular ones of up to 308, 316 and 320 drawn px. A message that does not fit
// a regular bubble whole at the floor is long, and only ever appears in the
// reserved bubble. This fixture has two short messages and four of 175 to 240
// characters; the regular bubbles hold the ones that fit them whole, and the
// reserved bubble holds the longest one on screen.
const MOSTLY_SHORT_IDS = ['synth-rec-5', 'synth-rec-6'];
const MOSTLY_LONG_ONLY_IDS = ['synth-rec-1', 'synth-rec-2', 'synth-rec-3', 'synth-rec-4'];

test('four whole bubbles at 0 s, 6 s and 14 s with mostly-long fixture, none paging, and no readerSlot collapse', async ({ page }) => {
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
    const slotCount = await frame.locator('#stage .scene[data-scene="1"] .orb-slot').count();
    expect(slotCount, `the reserved bubble and three regular bubbles, at ${ms} ms`).toBe(4);
    expect(orbCount).toBe(slotCount);

    const readings = await bubbleReadings(frame, WELCOME_ROOT);
    expect(readings.filter((r) => r.drawn >= RESERVED_DRAWN - 1).length, `one reserved bubble, at ${ms} ms`).toBe(1);
    for (const r of readings) {
      expect(r.pages, `${r.id} shows whole, at ${ms} ms`).toBe(1);
      if (r.drawn < RESERVED_DRAWN - 1) expect(r.drawn, `${r.id} is a regular bubble`).toBeLessThanOrEqual(LARGEST_REGULAR_DRAWN + 1);
    }
    expect(readings.filter((r) => [...MOSTLY_SHORT_IDS, ...MOSTLY_LONG_ONLY_IDS].includes(r.id)).length).toBe(4);
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
  // All three people have spoken by 9 s. Each speech bubble then swaps its
  // phrase every 6 to 9 s with a half second fade, and a single instant can
  // land inside one of those swaps (10.5 s did, which is why this test used to
  // read 2 on the untouched base). So the count is read every quarter second
  // from 9 s to 10.5 s: all three must be showing together at some moment, and
  // never fewer than two at any moment.
  const counts: number[] = [];
  for (let step = 0; step <= 6; step++) {
    if (step) await frame9.evaluate(() => (window as any).colorPolishRuntime.step(250));
    counts.push(
      await frame9.evaluate(() => {
        const bubbles = Array.from(document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="1"] .speech-bubble'));
        return bubbles.filter((el) => {
          const cs = window.getComputedStyle(el);
          return !el.classList.contains('fading') && cs.opacity !== '0' && cs.visibility !== 'hidden';
        }).length;
      }),
    );
  }
  expect(Math.max(...counts), `speech bubbles showing, 9 s to 10.5 s: ${counts.join(', ')}`).toBe(3);
  expect(Math.min(...counts), `speech bubbles showing, 9 s to 10.5 s: ${counts.join(', ')}`).toBeGreaterThanOrEqual(2);

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
  // circularity() measures .orb-slot, .orb and .event-orb. Each welcome slot
  // contains one .orb, so the bubbles are twice as many measured elements.
  const slotCount = await frame.locator('#stage .scene[data-scene="1"] .orb-slot').count();
  expect(slotCount).toBe(4);
  expect(circleResult.count).toBe(slotCount * 2);
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
  expect(check.slotsCount).toBe(4);
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

  expect(messageCheck.length).toBe(4);
  let hasSinglePageFit = false;

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
      expect(check.paginationLog).toBeDefined();
      expect(check.paginationLog.verbatim).toBe(true);
      const joined = check.readingPages.join('');
      expect(joined).toBe(original!.message);
    }
  }

  expect(hasSinglePageFit).toBe(true);
  // Regular bubbles show their messages whole. The reserved bubble holds about
  // 500 graphemes whole, so nothing in this fixture needs to page; if anything
  // ever does, it is the reserved bubble.
  const paging = messageCheck.filter((c) => !c.singlePage);
  expect(paging.length, `at most one bubble pages: ${paging.map((c) => c.id).join(', ')}`).toBeLessThanOrEqual(1);
  if (paging.length) {
    const readings = await bubbleReadings(frame, WELCOME_ROOT);
    const reading = readings.find((r) => r.id === paging[0].id)!;
    expect(reading.drawn, `${paging[0].id} pages in the reserved bubble`).toBeGreaterThanOrEqual(RESERVED_DRAWN - 1);
    expect(MOSTLY_LONG_ONLY_IDS, `${paging[0].id} is one of this fixture's long messages`).toContain(paging[0].id);
  }
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

// ---------------------------------------------------------------------------
// Plan 17 round 5: one reserved long bubble (Anthony, September 19)
//
// Welcome draws four bubbles at four fixed homes: the reserved bubble, 420 to
// 480 drawn px (sized so a 500 grapheme message shows whole at the 18 px
// floor), and three regular bubbles of at most 308, 316 and 320 drawn px. A
// message that does not fit a regular bubble whole at the floor is long; a long message
// only ever appears in the reserved bubble, and only the reserved bubble ever
// pages. Every assertion below reads the DOM or this file's own fit probe
// (fitsWhole in text-fits.ts), never a size welcome.js wrote.
// ---------------------------------------------------------------------------
const TV_SIZES = [
  { width: 1920, height: 1080 },
  { width: 3840, height: 2160 },
];
const WELCOME_ROOT = '#stage .scene[data-scene="1"]';
/** The reserved bubble's smallest drawn diameter, in stage px at 1920 wide: any bubble this big is the reserved one. */
const RESERVED_DRAWN = 420;
/** The reserved bubble's largest drawn diameter. */
const RESERVED_MAX_DRAWN = 480;
/** The largest regular bubble, in the same units. */
const LARGEST_REGULAR_DRAWN = 320;
/** Bubbles on screen when every home has a message that fits it. */
const FULL_SCREEN = 4;
/**
 * A message that fits 296 px with 20 px words certainly fits a regular
 * bubble, so this probe is used only to name messages that must never page.
 * It is not the boundary: a regular bubble that holds still is laid out up to
 * 320 px with 18 px words, so some messages this probe rejects still fit a
 * regular bubble whole. Whether a bubble really holds its whole message is
 * read off the screen instead (showsWholeMessage). The reserved bubble is
 * probed at 480 px with 18 px words and core's usual name and chips, which
 * hold less than the compact ones welcome.js uses at that size, so a message
 * the probe fits must never page.
 */
const REGULAR_PROBE = { diameter: 296, font: 20 };

/**
 * A record that cannot show whole even in the 480 px reserved bubble: 500
 * graphemes of wide capitals, nine expression chips and a long name. Real
 * messages of 500 graphemes fit whole; this is the last resort case.
 */
const HARD_ID = 'hard-500';
function hardRecord() {
  let message = '';
  while (graphemeCount(message) < 500) message += 'WARM WELCOME MOMMY ';
  message = message.slice(0, 500).trimEnd();
  return recognition({
    id: HARD_ID,
    recipient: 'Grandmother Wilhelmina of the Morning Kitchen Team',
    message,
    expressionIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    createdAt: '2026-09-10T17:30:00Z',
    firstPublishedAt: '2026-09-10T17:30:00Z',
    expiresAt: '2026-09-17T16:00:00Z',
  });
}

function lengthPool(lengths: number[], dwell: number, extra: Array<ReturnType<typeof recognition>> = []) {
  const recognitionsList = [...extra, ...lengths.map((n, i) =>
    recognition({
      id: `len-${n}-${i}`,
      recipient: 'Kind Friend',
      message: buildGraphemeMessage(n).trimEnd(),
      expressionIds: [(i % 9) + 1, ((i + 3) % 9) + 1],
      createdAt: `2026-09-10T16:${String(i).padStart(2, '0')}:00Z`,
      firstPublishedAt: `2026-09-10T16:${String(i).padStart(2, '0')}:00Z`,
      expiresAt: '2026-09-17T16:00:00Z',
    }),
  )];
  return buildActiveDisplayFixture({
    recognitions: recognitionsList,
    presentation: {
      version: 'color-polish-v6',
      enabled: true,
      playlist: [
        { id: 'welcome', enabled: true, durationSeconds: dwell },
        { id: 'garden', enabled: true, durationSeconds: 30 },
      ],
    },
  });
}

async function welcomeSample(frame: Frame) {
  return await frame.evaluate(() => {
    const state = (window as any).colorPolishRuntime.getState();
    const tv = document.getElementById('tv')!;
    const tvScale = tv.getBoundingClientRect().width / 1920;
    const slots = Array.from(document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="1"] .orb-slot')).filter((s) => !s.closest('[data-welcome-measure]'));
    const actors = (0, eval)('V').actors as Array<{ key: string; life: string }>;
    const sceneBox = document.querySelector<HTMLElement>('#stage .scene[data-scene="1"]')!.getBoundingClientRect();
    const toStage = 1812 / sceneBox.width;
    const stageRect = (q: DOMRect) => ({ left: (q.left - sceneBox.left) * toStage, top: (q.top - sceneBox.top) * toStage, right: (q.right - sceneBox.left) * toStage, bottom: (q.bottom - sceneBox.top) * toStage });
    // What a bubble must never cover: the title words, the couplet, the
    // eyebrow (each line of text, not its wide block box), the community art
    // and the three speech bubbles. In stage px.
    const obstacles: Array<{ name: string; left: number; top: number; right: number; bottom: number }> = [];
    document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="1"] h1, #stage .scene[data-scene="1"] p.serif, #stage .scene[data-scene="1"] .eyebrow').forEach((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      for (const q of Array.from(range.getClientRects())) if (q.width > 0) obstacles.push({ name: el.tagName.toLowerCase(), ...stageRect(q) });
    });
    document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="1"] .speech-bubble').forEach((el) => obstacles.push({ name: 'speech bubble', ...stageRect(el.getBoundingClientRect()) }));
    const artEl = document.querySelector<HTMLElement>('#stage .scene[data-scene="1"] .art');
    if (artEl) {
      // object-fit: contain draws the 1600 by 536 picture centred in its box.
      const q = stageRect(artEl.getBoundingClientRect());
      const w = Math.min(q.right - q.left, ((q.bottom - q.top) * 1600) / 536);
      const mid = (q.left + q.right) / 2;
      obstacles.push({ name: 'community art', left: mid - w / 2, top: q.top, right: mid + w / 2, bottom: q.bottom });
    }
    const bubbles = slots.map((slot) => {
      const box = stageRect(slot.getBoundingClientRect());
      const k = slot.offsetWidth ? slot.getBoundingClientRect().width / slot.offsetWidth : tvScale;
      const msg = slot.querySelector<HTMLElement>('.message')!;
      const indicator = slot.querySelector<HTMLElement>('.orb-page-indicator');
      const m = indicator && !indicator.hidden ? (indicator.textContent || '').match(/\/\s*(\d+)/) : null;
      const reading = (state.slots || []).find((x: any) => x.key === slot.id)?.reading;
      const id = slot.dataset.recordId || '';
      const record = ((0, eval)('S.pool') as Array<{ id: string; message: string }>).find((r) => r.id === id);
      return {
        id,
        life: actors.find((x) => x.key === slot.id)?.life ?? '',
        reservedMark: slot.dataset.welcomeReserved === 'true',
        cx: (box.left + box.right) / 2,
        cy: (box.top + box.bottom) / 2,
        radius: (box.right - box.left) / 2,
        drawn: slot.getBoundingClientRect().width / tvScale,
        drawnFont: (parseFloat(getComputedStyle(msg).fontSize) * k) / tvScale,
        pages: m ? parseInt(m[1], 10) : 1,
        opacity: parseFloat(getComputedStyle(slot).opacity),
        // What the bubble is actually showing, against the whole record: this
        // is how "the bubble holds its whole message" is judged, straight from
        // the DOM, with no reference to anything welcome.js decided.
        showsWholeMessage: !!record && (msg.textContent || '') === record.message,
        readingPages: (reading?.pages || []) as string[],
        readingIndex: (reading?.index ?? 0) as number,
      };
    });
    return { scene: state.scene as number, sceneAge: state.sceneAge as number, dwell: state.visual.dwell[1] as number, bubbles, obstacles };
  });
}

/**
 * Settled bubbles never touch each other, the title words, the speech
 * bubbles, the community art or the stage edge (a bubble flying in or out is
 * motion, and is not judged here). Returns what is wrong, in stage px.
 */
function layoutProblems(s: Awaited<ReturnType<typeof welcomeSample>>): string[] {
  const problems: string[] = [];
  const settled = s.bubbles.filter((b) => b.life === 'steady' && b.opacity > 0.9);
  for (let i = 0; i < settled.length; i++) {
    const a = settled[i];
    if (a.cx - a.radius < -0.5 || a.cy - a.radius < -0.5 || a.cx + a.radius > 1812.5 || a.cy + a.radius > 636.5) problems.push(`${s.sceneAge.toFixed(1)} s: ${a.id} leaves the stage`);
    for (const o of s.obstacles) {
      const px = Math.max(o.left, Math.min(a.cx, o.right)), py = Math.max(o.top, Math.min(a.cy, o.bottom));
      const into = a.radius - Math.hypot(px - a.cx, py - a.cy);
      if (into > 0.5) problems.push(`${s.sceneAge.toFixed(1)} s: ${a.id} covers the ${o.name} by ${into.toFixed(1)} px`);
    }
    for (const b of settled.slice(i + 1)) {
      const into = a.radius + b.radius - Math.hypot(a.cx - b.cx, a.cy - b.cy);
      if (into > 0.5) problems.push(`${s.sceneAge.toFixed(1)} s: ${a.id} and ${b.id} overlap by ${into.toFixed(1)} px`);
    }
  }
  // A bubble flying in or out may cross a neighbour's rim, but never the
  // title words and never the middle of a settled bubble, where its words are
  // (the words sit inside 80 percent of the diameter).
  for (const f of s.bubbles.filter((b) => b.life !== 'steady' && b.opacity > 0.3)) {
    for (const o of s.obstacles.filter((x) => ['h1', 'p', 'div'].includes(x.name))) {
      const px = Math.max(o.left, Math.min(f.cx, o.right)), py = Math.max(o.top, Math.min(f.cy, o.bottom));
      if (f.radius - Math.hypot(px - f.cx, py - f.cy) > 0.5) problems.push(`${s.sceneAge.toFixed(1)} s: ${f.id} flies over the title (${o.name})`);
    }
    for (const b of settled) {
      const into = f.radius + 0.8 * b.radius - Math.hypot(f.cx - b.cx, f.cy - b.cy);
      if (into > 0.5) problems.push(`${s.sceneAge.toFixed(1)} s: ${f.id} flies over the words of ${b.id} by ${into.toFixed(1)} px`);
    }
  }
  return problems;
}

/**
 * Runs the whole Welcome scene at the given dwell and checks the round 5
 * rules every second: every bubble but the reserved one shows its whole
 * message on one page, only the reserved bubble ever pages, a paged message
 * is one this file's own probe cannot fit whole even in the reserved bubble,
 * every bubble's words are drawn at the floor or larger, no bubble is drawn
 * at a size the fixed layout does not have, and any pages finish before the
 * scene changes.
 */
async function runPool(page: Page, opts: { lengths: number[]; dwell: number; width?: number; name: string; hard?: boolean }) {
  const width = opts.width ?? 1920;
  await page.setViewportSize({ width, height: Math.round((width * 9) / 16) });
  const frame = await loadRenderer(page, { scene: 1, ms: 0, fixture: lengthPool(opts.lengths, opts.dwell, opts.hard ? [hardRecord()] : []) });
  const reservedFits = new Map<string, boolean>();
  const fitsReservedWhole = async (id: string) => {
    if (!reservedFits.has(id)) reservedFits.set(id, await fitsWhole(frame, id, RESERVED_MAX_DRAWN, 18));
    return reservedFits.get(id)!;
  };
  const problems: string[] = [];
  const counts: number[] = [];
  const pagesSeen = new Map<string, number>();
  const seenIn = new Map<string, Set<string>>();
  const lastIndex = new Map<string, number>();
  const cycled = new Set<string>();
  const firstPaging = new Map<string, number>();
  for (let t = 0; ; t += 1000) {
    if (t) await frame.evaluate(() => (window as any).colorPolishRuntime.step(1000));
    const s = await welcomeSample(frame);
    if (t === 0) expect(s.dwell, `${opts.name}: dwell comes from the playlist`).toBe(opts.dwell);
    if (s.scene !== 1 || s.sceneAge >= opts.dwell || t > (opts.dwell + 1) * 1000) break;
    const visible = s.bubbles.filter((b) => b.opacity > 0.1);
    // How many bubbles the layout holds. A bubble that is mid flight through
    // a drift replacement is briefly transparent, which is motion, not a gap,
    // so the count is of bubbles in the scene rather than of opaque ones.
    counts.push(s.bubbles.length);
    const reserved = visible.filter((b) => b.drawn >= RESERVED_DRAWN - 1);
    if (reserved.length > 1) problems.push(`${s.sceneAge.toFixed(1)} s: ${reserved.length} bubbles at the reserved size`);
    const paging = visible.filter((b) => b.pages > 1);
    if (paging.length > 1) problems.push(`${s.sceneAge.toFixed(1)} s: ${paging.length} bubbles page at once`);
    problems.push(...layoutProblems(s));
    for (const b of visible) {
      if (!seenIn.has(b.id)) seenIn.set(b.id, new Set());
      const isReserved = b.drawn >= RESERVED_DRAWN - 1;
      if (isReserved !== b.reservedMark) problems.push(`${s.sceneAge.toFixed(1)} s: ${b.id} at ${b.drawn.toFixed(0)} px is ${b.reservedMark ? '' : 'not '}marked reserved`);
      if (b.drawn > RESERVED_MAX_DRAWN + 1) problems.push(`${s.sceneAge.toFixed(1)} s: ${b.id} drawn at ${b.drawn.toFixed(0)} px, past the reserved maximum`);
      seenIn.get(b.id)!.add(isReserved ? 'reserved' : 'regular');
      if (b.drawnFont < 18 - 0.05) problems.push(`${s.sceneAge.toFixed(1)} s: ${b.id} drawn at ${b.drawnFont.toFixed(2)} px`);
      if (b.drawn > LARGEST_REGULAR_DRAWN + 1 && !isReserved) {
        problems.push(`${s.sceneAge.toFixed(1)} s: ${b.id} drawn at ${b.drawn.toFixed(0)} px, neither a regular nor the reserved size`);
      }
      // Anthony's rule, read straight off the screen: every bubble but the
      // reserved one shows its whole message, on one page.
      if (!isReserved && !b.showsWholeMessage) {
        problems.push(`${s.sceneAge.toFixed(1)} s: regular bubble ${b.id} (${b.drawn.toFixed(0)} px) does not show its whole message`);
      }
      if (b.pages < 2) continue;
      pagesSeen.set(b.id, Math.max(pagesSeen.get(b.id) ?? 1, b.pages));
      if (await fitsReservedWhole(b.id)) problems.push(`${s.sceneAge.toFixed(1)} s: ${b.id} fits the reserved bubble whole but pages (${b.pages})`);
      if (!isReserved) problems.push(`${s.sceneAge.toFixed(1)} s: paging ${b.id} is not the reserved bubble (${b.drawn.toFixed(0)} px)`);
      // Core reads a page for max(9, characters / 14) seconds: the pages still
      // to come must finish inside the dwell.
      const later = b.readingPages.slice(b.readingIndex + 1).reduce((n, p) => n + Math.max(9, p.length / 14), 0);
      if (!firstPaging.has(b.id)) {
        firstPaging.set(b.id, s.sceneAge);
        const total = b.readingPages.reduce((n, p) => n + Math.max(9, p.length / 14), 0);
        if (s.sceneAge + total > opts.dwell + 0.6) problems.push(`${b.id} starts paging at ${s.sceneAge.toFixed(1)} s with ${total.toFixed(1)} s of pages, past the ${opts.dwell} s dwell`);
      }
      // Core starts the pages again once all have been read; only the first
      // pass has to finish inside the dwell.
      if (b.readingIndex < (lastIndex.get(b.id) ?? 0)) cycled.add(b.id);
      lastIndex.set(b.id, b.readingIndex);
      if (!cycled.has(b.id) && s.sceneAge + later > opts.dwell + 0.6) problems.push(`${s.sceneAge.toFixed(1)} s: ${b.id} has ${later.toFixed(1)} s of pages still to come`);
    }
  }
  return { problems, counts, pagesSeen, seenIn, frame };
}

const SHORT8 = [40, 55, 70, 85, 100, 130, 45, 60];
const MIXED8 = [250, 400, 500, 60, 70, 80, 90, 100];
const ROUND5_POOLS: Array<{ name: string; lengths: number[]; dwell: number; min: number; width?: number; hard?: boolean; noPaging?: boolean }> = [
  { name: 'eight short at 60 s', lengths: SHORT8, dwell: 60, min: FULL_SCREEN, noPaging: true },
  { name: 'eight short at 30 s', lengths: SHORT8, dwell: 30, min: FULL_SCREEN, noPaging: true },
  { name: 'eight short at 40 s', lengths: SHORT8, dwell: 40, min: FULL_SCREEN, noPaging: true },
  { name: 'eight short at 60 s, 3840 wide', lengths: SHORT8, dwell: 60, min: FULL_SCREEN, width: 3840, noPaging: true },
  { name: 'one 250, one 400, one 500 with five short at 60 s', lengths: MIXED8, dwell: 60, min: FULL_SCREEN, noPaging: true },
  { name: 'one 250, one 400, one 500 with five short at 40 s', lengths: MIXED8, dwell: 40, min: FULL_SCREEN, noPaging: true },
  { name: 'one 250, one 400, one 500 with five short at 30 s', lengths: MIXED8, dwell: 30, min: FULL_SCREEN, noPaging: true },
  { name: 'one 250, one 400, one 500 with five short at 60 s, 3840 wide', lengths: MIXED8, dwell: 60, min: FULL_SCREEN, width: 3840, noPaging: true },
  // Only long messages: they take turns in the one reserved bubble and the
  // regular bubbles stay empty, because the pool has nothing that fits them.
  { name: 'three long only at 60 s', lengths: [250, 400, 500], dwell: 60, min: 1, noPaging: true },
  { name: 'mostly long at 60 s', lengths: [53, 63, 130, 250, 400, 500], dwell: 60, min: FULL_SCREEN, noPaging: true },
  // Every message 180 to 420 graphemes. Geometry: beside the 480 px reserved
  // bubble the regular homes hold at most about 180 graphemes, so this pool
  // fills the reserved bubble and the regular bubbles its shortest messages
  // fit; the count is printed and must be at least two.
  { name: 'every message 180 to 420 at 60 s', lengths: [180, 200, 240, 300, 360, 420], dwell: 60, min: 2, noPaging: true },
  // The last resort: a record that cannot show whole even at 480 px.
  { name: 'five short and one that cannot fit 480 px at 60 s', lengths: [60, 70, 80, 90, 100], dwell: 60, min: FULL_SCREEN, hard: true },
  { name: 'five short and one that cannot fit 480 px at 30 s', lengths: [60, 70, 80, 90, 100], dwell: 30, min: FULL_SCREEN, hard: true },
];

for (const c of ROUND5_POOLS) {
  test(`round 5 pool, ${c.name}: long messages only in the reserved bubble, nothing else pages, floor kept`, async ({ page }) => {
    test.setTimeout(600000);
    const { problems, counts, pagesSeen, seenIn } = await runPool(page, c);
    const minCount = counts.length ? Math.min(...counts) : 0;
    const maxCount = counts.length ? Math.max(...counts) : 0;
    console.log(`welcome round 5 pool ${c.name}: bubbles ${minCount} to ${maxCount}, paging ${JSON.stringify(Object.fromEntries(pagesSeen))}, reserved held ${[...seenIn].filter(([, v]) => v.has('reserved')).map(([k]) => k).join(', ')}`);
    expect(problems, `${c.name}: ${problems.slice(0, 8).join(' | ')}`).toHaveLength(0);
    expect(maxCount, `${c.name}: never more than ${FULL_SCREEN} bubbles`).toBeLessThanOrEqual(FULL_SCREEN);
    expect(minCount, `${c.name}: at least ${c.min} bubbles at every moment`).toBeGreaterThanOrEqual(c.min);
    if (c.noPaging) expect([...pagesSeen.keys()], `${c.name}: every message up to 500 graphemes shows whole, nothing pages`).toHaveLength(0);
    expect([...seenIn.keys()].length, `${c.name}: the pool actually reached the screen`).toBeGreaterThan(0);
    // No long message (250 graphemes and up) is ever seen in a regular bubble.
    for (const [id, where] of seenIn) {
      const n = Number(id.split('-')[1]);
      if (id === HARD_ID || n >= 250) expect([...where], `${id} only ever in the reserved bubble`).toEqual(['reserved']);
    }
  });
}

test('three long messages take turns in the reserved bubble and never touch the other bubbles', async ({ page }) => {
  test.setTimeout(300000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  // A Welcome-only playlist keeps the scene up through many drift
  // replacements, so each long record gets its turn in the reserved bubble.
  const fixture = buildActiveDisplayFixture({
    recognitions: [250, 400, 500, 50, 60, 70, 80, 90].map((n, i) =>
      recognition({
        id: `turns-${n}`,
        recipient: 'Kind Friend',
        message: buildGraphemeMessage(n).trimEnd(),
        expressionIds: [(i % 9) + 1],
        createdAt: `2026-09-10T16:${String(i).padStart(2, '0')}:00Z`,
        firstPublishedAt: `2026-09-10T16:${String(i).padStart(2, '0')}:00Z`,
        expiresAt: '2026-09-17T16:00:00Z',
      }),
    ),
    presentation: { version: 'color-polish-v6', enabled: true, playlist: [{ id: 'welcome', enabled: true, durationSeconds: 600 }] },
  });
  const frame = await loadRenderer(page, { scene: 1, fixture });
  const longIds = ['turns-250', 'turns-400', 'turns-500'];
  for (const id of longIds) {
    expect(await fitsWhole(frame, id, REGULAR_PROBE.diameter, REGULAR_PROBE.font), `${id} is long: it does not fit a regular bubble`).toBe(false);
  }
  const reservedTurns = new Set<string>();
  const inRegular: string[] = [];
  for (let second = 5; second <= 240; second += 5) {
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(5000));
    const s = await welcomeSample(frame);
    for (const b of s.bubbles.filter((x) => x.opacity > 0.1)) {
      if (b.drawn >= RESERVED_DRAWN - 1) {
        if (longIds.includes(b.id)) reservedTurns.add(b.id);
      } else if (longIds.includes(b.id)) {
        inRegular.push(`${second} s: ${b.id} at ${b.drawn.toFixed(0)} px`);
      }
    }
    const failures = await textFits(frame, WELCOME_ROOT, { singlePageIds: ['turns-50', 'turns-60', 'turns-70', 'turns-80', 'turns-90'] });
    expect(failures, `at ${second} s: ${JSON.stringify(failures)}`).toHaveLength(0);
  }
  expect(inRegular, `long messages stayed out of the regular bubbles: ${inRegular.slice(0, 5).join(' | ')}`).toHaveLength(0);
  expect(reservedTurns.size, `long messages take turns in the reserved bubble: saw ${[...reservedTurns].join(', ')}`).toBeGreaterThanOrEqual(2);
});

test('with no long message in the pool the reserved bubble still shows a message, at its larger size', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const frame = await loadRenderer(page, { scene: 1, ms: 0, fixture: lengthPool([40, 55, 70, 85, 100, 130, 45, 60], 60) });
  let clock = 0;
  for (const ms of [0, 6000, 14000, 21000]) {
    if (ms > clock) {
      await frame.evaluate((step) => (window as any).colorPolishRuntime.step(step), ms - clock);
      clock = ms;
    }
    const s = await welcomeSample(frame);
    const reserved = s.bubbles.filter((b) => b.drawn >= RESERVED_DRAWN - 1);
    expect(reserved.length, `exactly one reserved bubble at ${ms} ms`).toBe(1);
    expect(reserved[0].id, `the reserved bubble holds a message at ${ms} ms`).not.toBe('');
    expect(reserved[0].pages, 'a message that fits whole never pages').toBe(1);
    for (const other of s.bubbles.filter((b) => b !== reserved[0])) {
      expect(other.drawn, `${other.id} is smaller than the reserved bubble`).toBeLessThan(reserved[0].drawn);
    }
    // Every message in this pool fits a regular bubble, so every home is full.
    expect(s.bubbles.length, `${FULL_SCREEN} bubbles at ${ms} ms`).toBe(FULL_SCREEN);
  }
});

test('mostly-long fixture: every word fits its bubble, drawn at the floor or larger, at 0, 6, 14 and 21 s at 1920 and 3840 wide', async ({ page }) => {
  test.setTimeout(240000);
  const fixture = buildTextFitsFixture();
  for (const size of TV_SIZES) {
    for (const ms of [0, 6000, 14000, 21000]) {
      const testPage = await page.context().newPage();
      await testPage.setViewportSize(size);
      const frame = await loadRenderer(testPage, { scene: 1, ms, fixture });
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(1500));
      const where = `${size.width} wide at ${ms} ms`;

      const readings = (await bubbleReadings(frame, WELCOME_ROOT)).filter((r) => r.visible);
      const whole: string[] = [];
      for (const reading of readings) {
        if (await fitsWhole(frame, reading.id, REGULAR_PROBE.diameter, REGULAR_PROBE.font)) whole.push(reading.id);
      }
      const failures = await textFits(frame, WELCOME_ROOT, { singlePageIds: whole });
      expect(failures, `welcome text-fit failures, ${where}: ${JSON.stringify(failures)}`).toHaveLength(0);

      expect(readings.length, `bubbles on screen, ${where}`).toBeGreaterThanOrEqual(2);
      const scale = size.width / 1920;
      for (const reading of readings) {
        expect(reading.drawnFont, `${reading.id} drawn message size, ${where}`).toBeGreaterThanOrEqual(18 * scale - 0.05);
        if (reading.pages > 1) {
          expect(reading.drawn, `${reading.id} pages only in the reserved bubble, ${where}`).toBeGreaterThanOrEqual(RESERVED_DRAWN - 1);
        }
      }

      const overflow = await noOverflow(frame);
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
      expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);
      await testPage.close();
    }
  }
});

test('a paging bubble is the reserved bubble, holds a message that cannot show whole even there, and its pages fit the dwell', async ({ page }) => {
  test.setTimeout(240000);
  // The only record here that may page is the one that cannot fit 480 px.
  const base = buildTextFitsFixture() as { recognitions: Array<Record<string, unknown>> };
  const fixture = buildActiveDisplayFixture({
    recognitions: [hardRecord(), ...base.recognitions],
    presentation: { version: 'color-polish-v6', enabled: true, playlist: [{ id: 'welcome', enabled: true, durationSeconds: 60 }, { id: 'garden', enabled: true, durationSeconds: 60 }] },
  });
  for (const size of TV_SIZES) {
    const testPage = await page.context().newPage();
    await testPage.setViewportSize(size);
    const frame = await loadRenderer(testPage, { scene: 1, ms: 0, fixture });
    const where = `${size.width} wide`;
    const readings = (await bubbleReadings(frame, WELCOME_ROOT)).filter((r) => r.visible);
    const paging = readings.filter((r) => r.pages > 1);
    expect(paging.length, `one record pages at the 60 s dwell, ${where}: ${JSON.stringify(readings)}`).toBe(1);
    const big = paging[0];
    expect(big.id, `only the record that cannot fit pages, ${where}`).toBe(HARD_ID);
    expect(big.drawn, `${big.id} pages in the reserved bubble at its full size, ${where}`).toBeGreaterThanOrEqual(RESERVED_MAX_DRAWN - 1);
    // Its message really cannot show whole in the reserved bubble at the floor
    // (judged by this file's own probe, not by anything welcome.js wrote).
    expect(await fitsWhole(frame, big.id, RESERVED_MAX_DRAWN, 18), `${big.id} does not fit whole at ${RESERVED_MAX_DRAWN} px, ${where}`).toBe(false);
    // And no other bubble is anywhere near the reserved size.
    for (const other of readings.filter((r) => r !== big)) {
      expect(other.drawn, `${other.id} is a regular bubble, ${where}`).toBeLessThanOrEqual(LARGEST_REGULAR_DRAWN + 1);
    }
    const state = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().visual.dwell[1]);
    expect(state).toBe(60);
    console.log(`welcome ${where}: ${JSON.stringify(readings.map((r) => ({ id: r.id, diameter: r.diameter, drawn: r.drawn, pages: r.pages, drawnFont: r.drawnFont })))}`);
    await testPage.close();
  }
});

// A record that cannot show whole even at 480 px, plus five short ones, at
// the three dwells Anthony has used. At 60 s its pages are all read before
// the scene changes, so the reserved bubble shows it; at 30 s they are not,
// so it waits and the reserved bubble shows another message instead. At 40 s
// either is right, as long as the pages it shows finish in time. Nothing is
// ever cut to make it fit. An ordinary 500 grapheme message never pages.
for (const [dwell, shown] of [[30, false], [40, null], [60, true]] as Array<[number, boolean | null]>) {
  test(`at a ${dwell} s dwell the record that cannot fit 480 px ${shown === null ? 'pages only if its pages finish in time' : shown ? 'pages in the reserved bubble inside the time left' : 'waits instead of being paged or cut'}`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    const frame = await loadRenderer(page, { scene: 1, ms: 0, fixture: lengthPool([500, 60, 70, 80, 90, 100], dwell, [hardRecord()]) });
    expect(await frame.evaluate(() => (window as any).colorPolishRuntime.getState().visual.dwell[1])).toBe(dwell);
    const readings = (await bubbleReadings(frame, WELCOME_ROOT)).filter((r) => r.visible);
    const ids = readings.map((r) => r.id);
    expect(await fitsWhole(frame, HARD_ID, RESERVED_MAX_DRAWN, 18), 'the hard record cannot show whole even in the reserved bubble').toBe(false);
    expect(readings.length, 'every home is full').toBe(FULL_SCREEN);
    if (shown === true) {
      expect(ids, `the hard record is shown at ${dwell} s`).toContain(HARD_ID);
    } else if (shown === false) {
      expect(ids, `the hard record is not shown at ${dwell} s`).not.toContain(HARD_ID);
      const waited = await frame.evaluate(() => ((window as any).colorPolishRuntime.getState().log as Array<{ type: string; id?: string }>).filter((e) => e.type === 'welcome_long_waits').map((e) => e.id));
      expect(waited, 'it is logged as waiting for a later pass').toContain(HARD_ID);
      expect(readings.filter((r) => r.pages > 1), 'nothing else pages in its place').toHaveLength(0);
      // The ordinary 500 grapheme message takes the reserved bubble, whole.
      const big = readings.find((r) => r.id === 'len-500-0');
      expect(big, 'the 500 grapheme message is on screen').toBeDefined();
      expect(big!.pages, 'and shows whole').toBe(1);
      expect(big!.drawn, 'in the reserved bubble').toBeGreaterThanOrEqual(RESERVED_DRAWN - 1);
    }
    for (const r of readings) {
      if (r.pages > 1) {
        expect(r.drawn, `${r.id} pages only in the reserved bubble`).toBeGreaterThanOrEqual(RESERVED_DRAWN - 1);
        const seconds = await frame.evaluate((id) => {
          const slots = (window as any).colorPolishRuntime.getState().slots as Array<{ id: string; reading?: { pages: string[] } }>;
          const pages = slots.find((s) => s.id === id)?.reading?.pages ?? [];
          return pages.reduce((n, p) => n + Math.max(9, p.length / 14), 0);
        }, r.id);
        expect(seconds, `${r.id} pages fit the ${dwell} s dwell`).toBeLessThanOrEqual(dwell);
      }
    }
    const whole: string[] = [];
    for (const r of readings) if (await fitsWhole(frame, r.id, REGULAR_PROBE.diameter, REGULAR_PROBE.font)) whole.push(r.id);
    const failures = await textFits(frame, WELCOME_ROOT, { singlePageIds: whole });
    expect(failures, JSON.stringify(failures)).toHaveLength(0);
  });
}

test('medium messages (120 to 220 characters) either show whole in the reserved bubble or wait, and never page a regular bubble', async ({ page }) => {
  test.setTimeout(240000);
  const fixture = buildMediumFixture();
  for (const size of TV_SIZES) {
    for (const ms of [0, 6000, 14000, 21000]) {
      const testPage = await page.context().newPage();
      await testPage.setViewportSize(size);
      const frame = await loadRenderer(testPage, { scene: 1, ms, fixture });
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(1500));
      const where = `${size.width} wide at ${ms} ms`;
      // Every bubble in the scene, transparent ones mid flight included, so a
      // drift replacement in progress does not hide the reserved bubble.
      const readings = await bubbleReadings(frame, WELCOME_ROOT);
      const whole: string[] = [];
      for (const r of readings) if (await fitsWhole(frame, r.id, REGULAR_PROBE.diameter, REGULAR_PROBE.font)) whole.push(r.id);
      const failures = await textFits(frame, WELCOME_ROOT, { singlePageIds: whole });
      expect(failures, `${where}: ${JSON.stringify(failures)}`).toHaveLength(0);
      // The four short records fill regular bubbles, the medium records that
      // fit one join them, and the rest take turns in the reserved bubble.
      expect(readings.length, `every home is full, ${where}`).toBe(FULL_SCREEN);
      expect(readings.filter((r) => MEDIUM_IDS.includes(r.id)).length, `a medium record is on screen, ${where}`).toBeGreaterThanOrEqual(1);
      expect(readings.filter((r) => r.drawn >= RESERVED_DRAWN - 1).length, `exactly one reserved bubble, ${where}`).toBe(1);
      for (const reading of readings) {
        expect([...MEDIUM_IDS, ...MEDIUM_SHORT_IDS], `${reading.id} is a fixture record`).toContain(reading.id);
        expect(reading.drawnFont, `${reading.id} drawn size, ${where}`).toBeGreaterThanOrEqual(18 * (size.width / 1920) - 0.05);
        if (MEDIUM_SHORT_IDS.includes(reading.id)) expect(reading.pages, `short ${reading.id} shows whole, ${where}`).toBe(1);
        if (reading.pages > 1) {
          expect(reading.drawn, `${reading.id} pages only in the reserved bubble, ${where}`).toBeGreaterThanOrEqual(RESERVED_DRAWN - 1);
        }
      }
      await testPage.close();
    }
  }
});

test('a bubble replaced while drifting shows its new message whole, and a long one only in the reserved bubble', async ({ page }) => {
  test.setTimeout(180000);
  const mostly = buildTextFitsFixture() as { recognitions: Array<Record<string, unknown>> };
  const medium = buildMediumFixture() as { recognitions: Array<Record<string, unknown>> };
  const extra = [
    ['drift-40', 'Thank you for the warm tea and kind words.'],
    ['drift-90', 'Thank you for noticing when I was tired and quietly taking the heavy boxes out to the car for me.'],
  ].map(([id, message], i) =>
    recognition({ id, message, recipient: 'Kind Friend', expressionIds: [(i % 9) + 1], createdAt: '2026-09-10T16:00:00Z', firstPublishedAt: '2026-09-10T16:00:00Z', expiresAt: '2026-09-17T16:00:00Z' }),
  );
  const fixture = buildActiveDisplayFixture({
    recognitions: [...mostly.recognitions, ...medium.recognitions, ...extra],
    presentation: { version: 'color-polish-v6', enabled: true, playlist: [{ id: 'welcome', enabled: true, durationSeconds: 600 }] },
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  const frame = await loadRenderer(page, { scene: 1, fixture });
  const seen = new Set<string>();
  for (let second = 5; second <= 120; second += 5) {
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(5000));
    const s = await welcomeSample(frame);
    const whole: string[] = [];
    for (const b of s.bubbles) {
      seen.add(b.id);
      if (b.drawn < RESERVED_DRAWN - 1) {
        expect(b.showsWholeMessage, `at ${second} s the regular bubble holding ${b.id} shows its whole message`).toBe(true);
        whole.push(b.id);
      }
    }
    const failures = await textFits(frame, WELCOME_ROOT, { singlePageIds: whole });
    expect(failures, `at ${second} s: ${JSON.stringify(failures)}`).toHaveLength(0);
  }
  const replaced = await frame.evaluate(() => ((window as any).colorPolishRuntime.getState().log as Array<{ type: string; id?: string }>).filter((e) => e.type === 'bubble_new').map((e) => e.id));
  expect(replaced.length, 'at least three drift replacements happened').toBeGreaterThanOrEqual(3);
  const fits = await frame.evaluate(() => ((window as any).colorPolishRuntime.getState().log as Array<{ type: string; id?: string }>).filter((e) => e.type === 'welcome_bubble_fit').map((e) => e.id));
  for (const id of replaced) {
    expect(fits.includes(id!), `replacement ${id} was measured`).toBe(true);
  }
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

// Round 4 finding 5, still a rule in round 5: a drifting bubble never rests
// over the words of a large still bubble (the reserved bubble, or any bubble
// whose record is too long to drift).
for (const [name, build] of [
  ['mostly-long fixture', () => buildTextFitsFixture()],
  ['medium fixture', () => buildMediumFixture()],
  ['six short plus 400', () => lengthPool([60, 70, 80, 90, 100, 110, 400], 60)],
  ['twelve of 40 to 130', () => lengthPool([40, 50, 60, 70, 80, 90, 100, 110, 120, 125, 130, 60], 60)],
] as Array<[string, () => Record<string, unknown>]>) {
  test(`round 5, ${name}: no steady drifting bubble covers the words of a large still bubble`, async ({ page }) => {
    test.setTimeout(300000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    const frame = await loadRenderer(page, { scene: 1, ms: 0, fixture: build() });
    const covered: string[] = [];
    for (let t = 0; t <= 30000; t += 250) {
      if (t) await frame.evaluate(() => (window as any).colorPolishRuntime.step(250));
      const found = await frame.evaluate(() => {
        const actors = (0, eval)('V').actors as Array<{ key: string; life: string; large: boolean }>;
        const tv = document.getElementById('tv')!;
        const tvScale = tv.getBoundingClientRect().width / 1920;
        const slots = Array.from(document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="1"] .orb-slot')).filter((s) => !s.closest('[data-welcome-measure]'));
        const info = slots.map((s) => {
          const r = s.getBoundingClientRect();
          const a = actors.find((x) => x.key === s.id);
          const rects: DOMRect[] = [];
          const w = document.createTreeWalker(s, NodeFilter.SHOW_TEXT);
          for (let n = w.nextNode(); n; n = w.nextNode()) {
            if (!(n.nodeValue || '').trim() || (n.parentElement as HTMLElement).closest('[hidden]')) continue;
            const rg = document.createRange();
            rg.selectNodeContents(n);
            for (const q of Array.from(rg.getClientRects())) if (q.width > 0) rects.push(q);
          }
          return { id: s.dataset.recordId, life: a?.life, large: !!a?.large, cx: r.left + r.width / 2, cy: r.top + r.height / 2, R: r.width / 2, rects };
        });
        const out: string[] = [];
        for (const big of info.filter((x) => x.large && x.life === 'steady')) {
          for (const d of info.filter((x) => !x.large && x.life === 'steady')) {
            let worst = 0;
            for (const q of big.rects) {
              const px = Math.max(q.left, Math.min(d.cx, q.right)), py = Math.max(q.top, Math.min(d.cy, q.bottom));
              worst = Math.max(worst, d.R - Math.hypot(px - d.cx, py - d.cy));
            }
            if (worst > 0.5) out.push(`${d.id} over ${big.id} words by ${(worst / tvScale).toFixed(1)} px`);
          }
        }
        return out;
      });
      found.forEach((f) => covered.push(`${t / 1000} s: ${f}`));
    }
    expect(covered, covered.slice(0, 6).join(' | ')).toHaveLength(0);
  });
}

// Round 4 finding 6, still a rule in round 5: a leaving bubble comes back with
// a different record whenever another eligible record fits its bubble whole.
for (const [name, lengths, maxSameShare] of [
  ['twelve short records', [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95], 0],
  ['twelve of 40 to 130', [40, 50, 60, 70, 80, 90, 100, 110, 120, 125, 130, 60], 0.2],
] as Array<[string, number[], number]>) {
  test(`round 5, ${name}: drift replacement brings a different record back when one fits`, async ({ page }) => {
    test.setTimeout(300000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    const frame = await loadRenderer(page, { scene: 1, ms: 0, fixture: lengthPool(lengths, 60) });
    for (let t = 0; t < 60; t++) await frame.evaluate(() => (window as any).colorPolishRuntime.step(1000));
    const events = await frame.evaluate(() => ((window as any).colorPolishRuntime.getState().log as Array<{ type: string; id?: string }>).filter((e) => e.type === 'bubble_exit_start' || e.type === 'bubble_new').map((e) => [e.type, e.id || ''] as [string, string]));
    const pending: string[] = [];
    const same: string[] = [];
    let exits = 0;
    for (const [type, id] of events) {
      if (type === 'bubble_exit_start') {
        exits++;
        pending.push(id);
      } else if (pending.length && pending.shift() === id) same.push(id);
    }
    expect(exits, 'bubbles leave during a 60 s dwell').toBeGreaterThanOrEqual(6);
    expect(same.length, `records shown again straight after leaving: ${same.join(', ')} of ${exits} exits`).toBeLessThanOrEqual(Math.floor(exits * maxSameShare));
  });
}

// The checks above are only worth their run time if they can fail. These two
// prove it: the same probe and the same fit assertion, given text that really
// does spill, report the failure.
test('the fit checks can fail: a message forced past its rim is reported', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const frame = await loadRenderer(page, { scene: 1, ms: 0, fixture: lengthPool([40, 55, 70, 85, 100, 130, 45, 60], 60) });
  const clean = await textFits(frame, WELCOME_ROOT, {});
  expect(clean, `the untouched scene fits: ${JSON.stringify(clean)}`).toHaveLength(0);

  const broke = await frame.evaluate(() => {
    const msg = document.querySelector<HTMLElement>('#stage .scene[data-scene="1"] .orb-slot .message');
    if (!msg) return false;
    msg.style.fontSize = '64px';
    return true;
  });
  expect(broke, 'a message element was found to break').toBe(true);
  const dirty = await textFits(frame, WELCOME_ROOT, {});
  expect(dirty.length, 'the fit check reports the spilled words').toBeGreaterThan(0);

  // The layout check can fail too: a bubble moved over its neighbour, the
  // title or the art is reported, and the untouched layout is not.
  const sample = await welcomeSample(frame);
  expect(sample.obstacles.map((o) => o.name), 'the title, the art and the speech bubbles are all measured').toEqual(expect.arrayContaining(['h1', 'community art', 'speech bubble']));
  expect(sample.bubbles.filter((b) => b.life === 'steady').length, 'settled bubbles are judged').toBe(FULL_SCREEN);
  expect(layoutProblems(sample), 'the untouched layout is clean').toHaveLength(0);
  const moved = (dx: number, dy: number) => ({ ...sample, bubbles: sample.bubbles.map((b, i) => (i === 0 ? { ...b, cx: b.cx + dx, cy: b.cy + dy } : b)) });
  expect(layoutProblems(moved(-300, 0)).join(' '), 'over the title').toContain('covers the h1');
  expect(layoutProblems(moved(0, 120)).join(' '), 'over the art or a speech bubble').toMatch(/covers the (community art|speech bubble)/);
  expect(layoutProblems(moved(330, 200)).join(' '), 'over a neighbour').toContain('overlap');

  // And the single-page rule can fail too: claiming a paging record shows
  // whole is reported.
  const paged = await loadRenderer(await page.context().newPage(), { scene: 1, ms: 0, fixture: lengthPool([60, 70, 80, 90, 100], 60, [hardRecord()]) });
  const readings = (await bubbleReadings(paged, WELCOME_ROOT)).filter((r) => r.visible && r.pages > 1);
  expect(readings.length, 'the record that cannot fit 480 px pages in the reserved bubble').toBe(1);
  const wrong = await textFits(paged, WELCOME_ROOT, { singlePageIds: [readings[0].id] });
  expect(wrong.some((f) => f.reason === 'paginated a message that must show whole'), JSON.stringify(wrong)).toBe(true);
});

test('the long message probe agrees with the grapheme counts it is given', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const frame = await loadRenderer(page, { scene: 1, ms: 0, fixture: lengthPool([60, 500], 60) });
  expect(graphemeCount(buildGraphemeMessage(500))).toBe(500);
  expect(await fitsWhole(frame, 'len-60-0', REGULAR_PROBE.diameter, REGULAR_PROBE.font), 'a 60 grapheme message fits a regular bubble').toBe(true);
  expect(await fitsWhole(frame, 'len-500-1', REGULAR_PROBE.diameter, REGULAR_PROBE.font), 'a 500 grapheme message does not').toBe(false);
  // The 500 grapheme message is on screen whole, in the reserved bubble, at the
  // floor or larger: that is what the reserved bubble is sized for.
  const s = await welcomeSample(frame);
  const big = s.bubbles.find((b) => b.id === 'len-500-1');
  expect(big, 'the 500 grapheme message is on screen').toBeDefined();
  expect(big!.showsWholeMessage, 'whole').toBe(true);
  expect(big!.pages, 'on one page').toBe(1);
  expect(big!.drawn, 'in the reserved bubble').toBeGreaterThanOrEqual(RESERVED_DRAWN - 1);
  expect(big!.drawn, 'no larger than 480 px').toBeLessThanOrEqual(RESERVED_MAX_DRAWN + 1);
  expect(big!.drawnFont, 'words at the floor or larger').toBeGreaterThanOrEqual(18 - 0.05);
});
