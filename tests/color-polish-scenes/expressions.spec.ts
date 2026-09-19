import { expect, test, type Frame } from '@playwright/test';
import {
  buildActiveDisplayFixture,
  circularity,
  loadRenderer,
  noOverflow,
  openStudioScene,
  reducedMotionScene,
  studioClickDoesNotAdvance,
} from './helpers';

// Scene changes and scene age only advance when the renderer clock is stepped,
// and `setScene` defers to S.pendingScene while a transition is running. Plan
// 15 lengthened transitions from 1.15 s to about 2.5 s, so a test that calls
// setScene and then waits, without stepping, waits forever: the transition
// never completes because nothing advances its clock. And the bloom's own
// progress is ease((S.eduAge - 6) / 3), where S.eduAge advances in tickAge,
// which does not run during a transition either, so a fixed `ms` no longer
// guarantees a focused card exists.
//
// These two helpers drive the renderer to the state the assertion needs rather
// than assuming a wall-clock offset produces it.
async function settleOnScene(frame: import('@playwright/test').Frame, sceneId: number) {
  await frame.evaluate((id) => (window as any).colorPolishRuntime.setScene(id), sceneId);
  for (let i = 0; i < 60; i++) {
    const state = await frame.evaluate(() => {
      const s = (window as any).colorPolishRuntime.getState();
      return { scene: s.scene, transition: s.transition };
    });
    if (state.scene === sceneId && !state.transition) return;
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(250));
  }
  throw new Error(`scene ${sceneId} never settled`);
}

async function waitForFocusedCard(frame: import('@playwright/test').Frame) {
  for (let i = 0; i < 80; i++) {
    const found = await frame.evaluate(
      () => !!document.querySelector('#stage .scene[data-scene="7"] .edu-card.focused'),
    );
    if (found) return;
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(500));
  }
  throw new Error('no .edu-card.focused appeared');
}
async function evaluateFocusedCard(frame: Frame) {
  return await frame.evaluate(() => {
    const card = document.querySelector<HTMLElement>('.edu-card.focused');
    if (!card) throw new Error('No .edu-card.focused element found');
    const id = parseInt(card.dataset.expressionId || '0', 10);
    const detail = card.querySelector<HTMLElement>('.edu-detail');
    if (!detail) throw new Error('No .edu-detail element found in focused card');
    const explanation = detail.querySelector<HTMLElement>('.edu-explanation');
    if (!explanation) throw new Error('No .edu-explanation element found in focused card');
    const source = detail.querySelector<HTMLElement>('.edu-source');
    if (!source) throw new Error('No .edu-source element found in focused card');

    const cardRect = card.getBoundingClientRect();
    const expRect = explanation.getBoundingClientRect();
    const srcRect = source.getBoundingClientRect();

    const detailScrollFits =
      detail.scrollHeight <= card.clientHeight && detail.scrollWidth <= card.clientWidth;

    const explanationBottomRel = expRect.bottom - cardRect.top;
    const percent = (explanationBottomRel / cardRect.height) * 100;
    const sourceBelowExplanation = srcRect.top >= expRect.bottom;

    return {
      id,
      detailScrollFits,
      percent,
      sourceBelowExplanation,
    };
  });
}

async function evaluateGridCards(frame: Frame) {
  return await frame.evaluate(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.edu-card'));
    if (cards.length !== 9) {
      throw new Error(`Expected 9 .edu-card elements, found ${cards.length}`);
    }
    const firstWidth = cards[0].clientWidth;
    const firstHeight = cards[0].clientHeight;

    const cardResults = cards.map((card, index) => {
      const front = card.querySelector<HTMLElement>('.edu-front');
      if (!front) throw new Error(`Card ${index} has no .edu-front`);
      const phrase = front.querySelector<HTMLElement>('.edu-phrase');
      if (!phrase) throw new Error(`Card ${index} has no .edu-phrase in .edu-front`);

      const cardRect = card.getBoundingClientRect();
      const phraseRect = phrase.getBoundingClientRect();
      const phraseSlack = cardRect.bottom - phraseRect.bottom;

      return {
        index,
        sameWidth: Math.abs(card.clientWidth - firstWidth) <= 1,
        sameHeight: Math.abs(card.clientHeight - firstHeight) <= 1,
        frontFits:
          front.scrollHeight <= card.clientHeight && front.scrollWidth <= card.clientWidth,
        phraseSlack,
      };
    });

    return {
      count: cards.length,
      cardResults,
    };
  });
}

async function evaluateCompactCards(frame: Frame) {
  return await frame.evaluate(() => {
    const compactCards = Array.from(document.querySelectorAll<HTMLElement>('.edu-card.compact'));
    if (compactCards.length !== 8) {
      throw new Error(`Expected 8 .edu-card.compact elements, found ${compactCards.length}`);
    }

    const cardResults = compactCards.map((card, index) => {
      const front = card.querySelector<HTMLElement>('.edu-front');
      if (!front) throw new Error(`Compact card ${index} has no .edu-front`);
      const phrase = front.querySelector<HTMLElement>('.edu-phrase');
      if (!phrase) throw new Error(`Compact card ${index} has no .edu-phrase in .edu-front`);

      const cardRect = card.getBoundingClientRect();
      const phraseRect = phrase.getBoundingClientRect();
      const phraseSlack = cardRect.bottom - phraseRect.bottom;

      return {
        index,
        frontFits:
          front.scrollHeight <= card.clientHeight && front.scrollWidth <= card.clientWidth,
        phraseSlack,
      };
    });

    return {
      count: compactCards.length,
      cardResults,
    };
  });
}

test('expressions renders with circular medallions and no overflow at 14 s', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'expressions', 14000);
  const circleResult = await circularity(frame);
  expect(circleResult.failures).toHaveLength(0);

  const medallionCircularity = await frame.evaluate(() => {
    const medallions = Array.from(document.querySelectorAll<HTMLElement>('.medallion'));
    const failures: Array<{ width: number; height: number; radius: string }> = [];
    for (const m of medallions) {
      const rect = m.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const widthHeightOk = Math.abs(rect.width - rect.height) <= 1;
      const style = window.getComputedStyle(m);
      const radiusOk = style.borderRadius.includes('50%');
      if (!widthHeightOk || !radiusOk) {
        failures.push({ width: rect.width, height: rect.height, radius: style.borderRadius });
      }
    }
    return { count: medallions.length, failures };
  });
  expect(medallionCircularity.count).toBeGreaterThan(0);
  expect(medallionCircularity.failures).toHaveLength(0);

  const overflow = await noOverflow(frame);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);

  const clickResult = await studioClickDoesNotAdvance(page, frame);
  expect(clickResult.before).toBe(clickResult.after);
});

test('grid cards fit with slack', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'expressions', 0);
  const gridResult = await evaluateGridCards(frame);
  expect(gridResult.count).toBe(9);
  for (const card of gridResult.cardResults) {
    expect(card.frontFits).toBe(true);
    expect(card.phraseSlack).toBeGreaterThanOrEqual(12);
    expect(card.sameWidth).toBe(true);
    expect(card.sameHeight).toBe(true);
  }
});

test('compact cards fit', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'expressions', 14000);
  const compactResult = await evaluateCompactCards(frame);
  expect(compactResult.count).toBe(8);
  for (const card of compactResult.cardResults) {
    expect(card.frontFits).toBe(true);
    expect(card.phraseSlack).toBeGreaterThanOrEqual(12);
  }
});

test('the focused card is balanced', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'expressions', 14000);
  const focused = await evaluateFocusedCard(frame);
  expect(focused.detailScrollFits).toBe(true);
  expect(focused.percent).toBeGreaterThanOrEqual(70);
  expect(focused.percent).toBeLessThanOrEqual(92);
  expect(focused.sourceBelowExplanation).toBe(true);
});

test('every expression can be the focused one', async ({ page }) => {
  test.setTimeout(600000);
  // Through loadRenderer, not the Studio. This loop drives eighteen scene
  // visits, and Plan 13's own runner lesson (carried into Plan 15's common
  // scene spec) is that any multi-sample timeline longer than a few seconds
  // must use the direct renderer harness, because the Studio host remounts
  // scenes underneath a long timeline. Driving setScene against the Studio's
  // own control is what left this test with no focused card at all.
  const frame = await loadRenderer(page, { scene: 7 });
  const seenIds = new Set<number>();

  for (let round = 0; round < 18 && seenIds.size < 9; round++) {
    // Settle the scene change by stepping the clock, then drive until the bloom
    // has actually produced a focused card. A fixed 14000 ms step is no longer
    // sufficient: the bloom's progress is ease((S.eduAge - 6) / 3) and S.eduAge
    // does not advance during a transition, which Plan 15 lengthened to about
    // 2.5 s, so the scene could still be at p = 0 with no .focused element.
    // Leave and re-enter. The focused card is S.bloomIndex, which advances in
    // requestScene on each ENTRY to scene 7, so re-issuing setScene(7) while
    // already on 7 does not move to the next expression. Go via scene 1, the
    // same route the sibling three-visit test uses and which passes.
    if (round > 0) {
      await settleOnScene(frame, 1);
      await settleOnScene(frame, 7);
    }
    await waitForFocusedCard(frame);

    await frame.evaluate((checkpointMs) => {
      document.getAnimations().forEach((animation) => {
        animation.pause();
        animation.currentTime = checkpointMs;
      });
    }, 14000);

    const focused = await evaluateFocusedCard(frame);
    seenIds.add(focused.id);
    expect(focused.detailScrollFits).toBe(true);
    expect(focused.percent).toBeGreaterThanOrEqual(70);
    expect(focused.percent).toBeLessThanOrEqual(92);
    expect(focused.sourceBelowExplanation).toBe(true);

    if (seenIds.size >= 9) break;
  }

  expect(seenIds.size).toBe(9);
});

test('reduced motion renders the scene still and matches G6', async ({ page }) => {
  const { frame, still } = await reducedMotionScene(page, 'expressions');
  expect(still).toBe(true);

  const focused = await evaluateFocusedCard(frame);
  expect(focused.detailScrollFits).toBe(true);
  expect(focused.percent).toBeGreaterThanOrEqual(70);
  expect(focused.percent).toBeLessThanOrEqual(92);
  expect(focused.sourceBelowExplanation).toBe(true);

  const bloomCheck = await frame.evaluate(() => {
    const focusedCard = document.querySelector<HTMLElement>('.edu-card.focused');
    const bloom = focusedCard?.querySelector<HTMLElement>('.edu-bloom');
    const bloomOpacity = bloom ? parseFloat(window.getComputedStyle(bloom).opacity) : 0;
    const compacts = Array.from(document.querySelectorAll<HTMLElement>('.edu-card.compact'));
    const compactOpacities = compacts.map((c) => parseFloat(window.getComputedStyle(c).opacity));

    return {
      hasBloom: !!bloom,
      bloomOpacity,
      compactCount: compacts.length,
      compactOpacities,
    };
  });

  expect(bloomCheck.bloomOpacity).toBe(0);
  expect(bloomCheck.compactCount).toBe(8);
  for (const op of bloomCheck.compactOpacities) {
    expect(op).toBeCloseTo(0.7, 1);
  }
});

test('the same holds at 3840', async ({ page }) => {
  await page.setViewportSize({ width: 3840, height: 2160 });

  const { frame: gridFrame } = await openStudioScene(page, 'expressions', 0);
  const gridResult = await evaluateGridCards(gridFrame);
  expect(gridResult.count).toBe(9);
  for (const card of gridResult.cardResults) {
    expect(card.frontFits).toBe(true);
    expect(card.phraseSlack).toBeGreaterThanOrEqual(12);
    expect(card.sameWidth).toBe(true);
    expect(card.sameHeight).toBe(true);
  }

  const { frame: focusedFrame } = await openStudioScene(page, 'expressions', 14000);
  const focused = await evaluateFocusedCard(focusedFrame);
  expect(focused.detailScrollFits).toBe(true);
  expect(focused.percent).toBeGreaterThanOrEqual(70);
  expect(focused.percent).toBeLessThanOrEqual(92);
  expect(focused.sourceBelowExplanation).toBe(true);
});

test('focused card has positive translateZ and phrase rendered at least 1.6x grid phrase size', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'expressions', 14000);

  const result = await frame.evaluate(() => {
    const focused = document.querySelector<HTMLElement>('.edu-card.focused');
    if (!focused) throw new Error('No focused card found');

    const style = window.getComputedStyle(focused);
    const transform = style.transform;

    let hasPositiveTranslateZ = false;
    if (transform.startsWith('matrix3d(')) {
      const values = transform.slice(9, -1).split(',').map((s) => parseFloat(s.trim()));
      hasPositiveTranslateZ = values[14] > 0;
    } else if (focused.style.transform.includes('translateZ') || focused.style.transform.includes('translate3d')) {
      const match = focused.style.transform.match(/translate[3d|Z]\([^)]*?([0-9.]+)px/);
      if (match && parseFloat(match[1]) > 0) {
        hasPositiveTranslateZ = true;
      }
    }

    const focusedPhrase = focused.querySelector<HTMLElement>('.edu-detail .edu-phrase');
    if (!focusedPhrase) throw new Error('No focused phrase found');
    const focusedPhraseFontSize = parseFloat(window.getComputedStyle(focusedPhrase).fontSize);

    const compactFrontPhrase = document.querySelector<HTMLElement>('.edu-card.compact .edu-front .edu-phrase');
    const defaultFrontPhrase = document.querySelector<HTMLElement>('.edu-card .edu-front .edu-phrase');
    const gridRefPhrase = compactFrontPhrase || defaultFrontPhrase;
    const gridPhraseFontSize = gridRefPhrase ? parseFloat(window.getComputedStyle(gridRefPhrase).fontSize) : 25;

    const h2 = focused.querySelector<HTMLElement>('.edu-detail h2');
    const principle = focused.querySelector<HTMLElement>('.edu-detail .edu-principle');
    const explanation = focused.querySelector<HTMLElement>('.edu-detail .edu-explanation');
    const h2Size = h2 ? parseFloat(window.getComputedStyle(h2).fontSize) : 0;
    const principleSize = principle ? parseFloat(window.getComputedStyle(principle).fontSize) : 0;
    const explanationSize = explanation ? parseFloat(window.getComputedStyle(explanation).fontSize) : 0;
    const isLargest =
      focusedPhraseFontSize > h2Size &&
      focusedPhraseFontSize > principleSize &&
      focusedPhraseFontSize > explanationSize;

    return {
      hasPositiveTranslateZ,
      transform,
      focusedPhraseFontSize,
      gridPhraseFontSize,
      ratio: focusedPhraseFontSize / gridPhraseFontSize,
      isLargest,
    };
  });

  expect(result.hasPositiveTranslateZ).toBe(true);
  expect(result.ratio).toBeGreaterThanOrEqual(1.6);
  expect(result.isLargest).toBe(true);
});

test('visible layer scrollWidth and scrollHeight never exceed client size in grid and bloomed states at both widths', async ({ page }) => {
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 3840, height: 2160 },
  ]) {
    await page.setViewportSize(viewport);

    const { frame: gridFrame } = await openStudioScene(page, 'expressions', 0);
    const gridFits = await gridFrame.evaluate(() => {
      const cards = Array.from(document.querySelectorAll<HTMLElement>('.edu-card'));
      return cards.map((card, i) => {
        const front = card.querySelector<HTMLElement>('.edu-front');
        if (!front) throw new Error(`Card ${i} missing .edu-front`);
        return {
          idx: i,
          fitsWidth: front.scrollWidth <= card.clientWidth,
          fitsHeight: front.scrollHeight <= card.clientHeight,
        };
      });
    });
    for (const f of gridFits) {
      expect(f.fitsWidth).toBe(true);
      expect(f.fitsHeight).toBe(true);
    }

    const { frame: bloomedFrame } = await openStudioScene(page, 'expressions', 14000);
    const bloomedFits = await bloomedFrame.evaluate(() => {
      const focused = document.querySelector<HTMLElement>('.edu-card.focused');
      if (!focused) throw new Error('Missing focused card');
      const detail = focused.querySelector<HTMLElement>('.edu-detail');
      if (!detail) throw new Error('Missing detail in focused card');
      const focusedFits = {
        fitsWidth: detail.scrollWidth <= focused.clientWidth,
        fitsHeight: detail.scrollHeight <= focused.clientHeight,
      };

      const compacts = Array.from(document.querySelectorAll<HTMLElement>('.edu-card.compact'));
      const compactFits = compacts.map((card, i) => {
        const front = card.querySelector<HTMLElement>('.edu-front');
        if (!front) throw new Error(`Compact card ${i} missing front`);
        return {
          idx: i,
          fitsWidth: front.scrollWidth <= card.clientWidth,
          fitsHeight: front.scrollHeight <= card.clientHeight,
        };
      });

      return { focusedFits, compactFits };
    });

    expect(bloomedFits.focusedFits.fitsWidth).toBe(true);
    expect(bloomedFits.focusedFits.fitsHeight).toBe(true);
    for (const cf of bloomedFits.compactFits) {
      expect(cf.fitsWidth).toBe(true);
      expect(cf.fitsHeight).toBe(true);
    }
  }
});

test('eight unfocused cards computed opacity is about 0.7 while focused is 1', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'expressions', 14000);

  const opacityData = await frame.evaluate(() => {
    const focused = document.querySelector<HTMLElement>('.edu-card.focused');
    const compacts = Array.from(document.querySelectorAll<HTMLElement>('.edu-card.compact'));

    const focusedOpacity = focused ? parseFloat(window.getComputedStyle(focused).opacity) : 0;
    const compactOpacities = compacts.map((c) => parseFloat(window.getComputedStyle(c).opacity));

    return {
      focusedOpacity,
      compactCount: compacts.length,
      compactOpacities,
    };
  });

  expect(opacityData.focusedOpacity).toBeCloseTo(1, 1);
  expect(opacityData.compactCount).toBe(8);
  for (const op of opacityData.compactOpacities) {
    expect(op).toBeGreaterThanOrEqual(0.65);
    expect(op).toBeLessThanOrEqual(0.75);
  }
});

test('across three separate visits to scene 7 through loadRenderer, three different cards take focus matching S.bloomIndex', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 7, ms: 14000 });
  const focusedIds: number[] = [];

  for (let visit = 0; visit < 3; visit++) {
    if (visit > 0) {
      await settleOnScene(frame, 1);
      await settleOnScene(frame, 7);

      await frame.evaluate((ms) => {
        (window as any).colorPolishRuntime.step(ms);
      }, 14000);
    }

    const id = await frame.evaluate(() => {
      const card = document.querySelector<HTMLElement>('.edu-card.focused');
      return card ? parseInt(card.dataset.expressionId || '0', 10) : 0;
    });

    focusedIds.push(id);
  }

  expect(focusedIds).toHaveLength(3);
  expect(new Set(focusedIds).size).toBe(3);
  expect(focusedIds[1]).toBe((focusedIds[0] % 9) + 1);
  expect(focusedIds[2]).toBe((focusedIds[1] % 9) + 1);
});

test('three columns carry distinct rotateY values and rows carry distinct translateZ values in grid state', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'expressions', 0);

  const arcData = await frame.evaluate(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.edu-card'));
    if (cards.length !== 9) throw new Error(`Expected 9 cards, got ${cards.length}`);

    const cardTransforms = cards.map((card, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const styleTransform = card.style.transform;
      const computedTransform = window.getComputedStyle(card).transform;

      let rotY = 0;
      const rotYMatch = styleTransform.match(/rotateY\(\s*(-?[\d.]+)\s*deg\)/);
      if (rotYMatch) {
        rotY = parseFloat(rotYMatch[1]);
      }

      let tz = 0;
      const tzMatch = styleTransform.match(/translate[3d|Z]\([^)]*?(-?[\d.]+)px/);
      if (tzMatch) {
        tz = parseFloat(tzMatch[1]);
      } else if (computedTransform.startsWith('matrix3d(')) {
        const parts = computedTransform.slice(9, -1).split(',').map((s) => parseFloat(s.trim()));
        tz = parts[14];
      }

      return { idx, col, row, rotY, tz };
    });

    const col0RotY = cardTransforms.find((c) => c.col === 0)?.rotY ?? 0;
    const col1RotY = cardTransforms.find((c) => c.col === 1)?.rotY ?? 0;
    const col2RotY = cardTransforms.find((c) => c.col === 2)?.rotY ?? 0;

    const row0Tz = cardTransforms.find((c) => c.row === 0)?.tz ?? 0;
    const row1Tz = cardTransforms.find((c) => c.row === 1)?.tz ?? 0;
    const row2Tz = cardTransforms.find((c) => c.row === 2)?.tz ?? 0;

    return {
      cardTransforms,
      colRotYs: [col0RotY, col1RotY, col2RotY],
      rowTzs: [row0Tz, row1Tz, row2Tz],
    };
  });

  const distinctCols = new Set(arcData.colRotYs);
  expect(distinctCols.size).toBe(3);
  expect(arcData.colRotYs[0]).toBeGreaterThan(0);
  expect(arcData.colRotYs[1]).toBe(0);
  expect(arcData.colRotYs[2]).toBeLessThan(0);

  expect(arcData.rowTzs[0]).toBeLessThan(0);
  expect(arcData.rowTzs[1]).toBe(0);
  expect(arcData.rowTzs[2]).toBeLessThan(0);
  const distinctRows = new Set(arcData.rowTzs);
  expect(distinctRows.size).toBeGreaterThanOrEqual(2);
});

test('no .orb exists in expressions scene', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'expressions', 14000);

  const orbCount = await frame.evaluate(() => {
    return document.querySelectorAll('#stage .scene[data-scene="7"] .orb').length;
  });

  expect(orbCount).toBe(0);
});

// --- Plan 17 Lane 2: edges, fit, title and footnote, and motion preservation -------------------
//
// Anthony's TV photos (September 18) show this scene's grid and in-focus view cut off at the sides.
// The TV cuts at the scene box, not the screen: `.scene` has overflow:hidden and at 1920 wide spans
// x 54 to 1866 and y 126 to 762, so anything past it, box or glow, ends in a hard edge. These specs
// drive the renderer directly through loadRenderer (a long timeline needs the direct harness, and
// the admin Studio needs backend settings this lane's dev server does not have).

const EXPRESSIONS_EDGE_CASES = [
  { width: 1920, height: 1080, floor: 16 },
  { width: 3840, height: 2160, floor: 32 },
] as const;

// The scene's full 30 s dwell: 30 evenly spaced samples (every second, 0 to 29 s), plus every
// 200 ms through each 2.4 s focus ramp (at 6, 16 and 26 s), where cards move while still tilted.
//
// Plan 17 Lane 7 made every change of view a 1.1 s glide (grid to focus at 6 s, focus to the next
// focus at 16 s, focus back to the grid at 26 s on a 30 s dwell), so each glide is also sampled at
// 30 evenly spaced points from its first moving frame to its landing.
const EXPRESSIONS_MOVE_MS = 1100;
const EXPRESSIONS_MOVE_STARTS_MS = [6000, 16000, 26000];
const EXPRESSIONS_MOVE_SAMPLES_MS = EXPRESSIONS_MOVE_STARTS_MS.flatMap((start) =>
  Array.from({ length: 30 }, (_, i) => start + Math.round(((i + 1) * EXPRESSIONS_MOVE_MS) / 30)),
);
const EXPRESSIONS_DWELL_SAMPLES_MS = (() => {
  const times = new Set<number>();
  for (let i = 0; i < 30; i++) times.add(i * 1000);
  for (const rampStart of EXPRESSIONS_MOVE_STARTS_MS) {
    for (let t = rampStart; t <= rampStart + 2400; t += 200) times.add(t);
  }
  for (const t of EXPRESSIONS_MOVE_SAMPLES_MS) times.add(t);
  return [...times].sort((a, b) => a - b);
})();

// Nine visits: each entry to the scene advances S.bloomIndex by one and each visit focuses three
// cards, so nine visits put every card in focus in every cycle position and every card through
// every compact slot it can reach.
const EXPRESSIONS_VISITS = 9;

async function enterExpressionsVisit(frame: Frame, visit: number) {
  if (visit === 0) return;
  await settleOnScene(frame, 1);
  await settleOnScene(frame, 7);
}

// Scene age in ms. Entering the scene leaves it a little past zero (the harness settles the
// entrance fade in whole steps), so timelines that must hit a glide exactly step to a scene age
// rather than by a fixed amount.
async function expressionsSceneAgeMs(frame: Frame) {
  return await frame.evaluate(() => (window as any).colorPolishRuntime.getState().sceneAge * 1000);
}

async function stepToSceneAge(frame: Frame, targetMs: number) {
  const now = await expressionsSceneAgeMs(frame);
  if (targetMs - now > 0.001) await frame.evaluate((ms) => (window as any).colorPolishRuntime.step(ms), targetMs - now);
}

// Every card's painted reach against the scene box and the viewport: its rendered rect (which
// already includes tilt and depth) widened by its computed box-shadow, which is scaled by the
// same depth. Finished transitions (currentTime past their end) mean a card that has just gained
// focus is measured with its full glow.
async function measureExpressionReach(frame: Frame, floor: number, targetMs: number | null = null) {
  return await frame.evaluate(({ floor, targetMs }) => {
    // Step to the wanted scene age and measure in one round trip (the sweep takes thousands).
    const runtime = (window as any).colorPolishRuntime;
    if (targetMs !== null) {
      const ahead = targetMs - runtime.getState().sceneAge * 1000;
      if (ahead > 0.001) runtime.step(ahead);
    }
    const sceneId = runtime.getState().scene as number;
    document.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = 1e7;
    });
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="7"]');
    if (!scene) throw new Error('scene 7 is not on stage');
    const box = scene.getBoundingClientRect();
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
    const shadowReach = (value: string) => {
      const reach = { left: 0, right: 0, top: 0, bottom: 0 };
      if (!value || value === 'none') return reach;
      for (const layer of value.split(/,(?![^(]*\))/)) {
        if (/\binset\b/.test(layer)) continue;
        const numbers = (layer.replace(/[a-z-]+\([^)]*\)/gi, '').match(/-?[\d.]+px/g) || []).map(parseFloat);
        const [x = 0, y = 0, blur = 0, spread = 0] = numbers;
        reach.left = Math.max(reach.left, blur + spread - x);
        reach.right = Math.max(reach.right, blur + spread + x);
        reach.top = Math.max(reach.top, blur + spread - y);
        reach.bottom = Math.max(reach.bottom, blur + spread + y);
      }
      return reach;
    };
    const failures: string[] = [];
    let cardCount = 0;
    let focusedGlow = 0;
    let glidingCards = 0;
    scene.querySelectorAll<HTMLElement>('.edu-card').forEach((card) => {
      cardCount++;
      // A card really in flight: the script has put a translate() scale() in front of its pose.
      if (/^translate\([^)]*\) scale\([^)]*\) translate3d/.test(card.style.transform)) glidingCards++;
      const rect = card.getBoundingClientRect();
      const scale = Math.max(rect.width / card.offsetWidth, rect.height / card.offsetHeight);
      const reach = shadowReach(getComputedStyle(card).boxShadow);
      if (card.classList.contains('focused')) focusedGlow = reach.left * scale;
      const painted = {
        left: rect.left - reach.left * scale,
        right: rect.right + reach.right * scale,
        top: rect.top - reach.top * scale,
        bottom: rect.bottom + reach.bottom * scale,
      };
      const label = `card ${card.dataset.expressionId} (${card.className.trim()})`;
      const checks: Array<[string, number]> = [
        ['scene left', painted.left - box.left],
        ['scene right', box.right - painted.right],
        ['scene top', painted.top - box.top],
        ['scene bottom', box.bottom - painted.bottom],
        ['viewport left', painted.left],
        ['viewport right', viewWidth - painted.right],
        ['viewport top', painted.top],
        ['viewport bottom', viewHeight - painted.bottom],
      ];
      for (const [side, margin] of checks) {
        if (margin < floor) failures.push(`${label} ${side} margin ${margin.toFixed(1)}px < ${floor}px`);
      }
    });
    return { sceneId, cardCount, focusedGlow, glidingCards, failures };
  }, { floor, targetMs });
}

for (const { width, height, floor } of EXPRESSIONS_EDGE_CASES) {
  test(`every card, border and glow stays ${floor}px inside the scene box and the ${width}x${height} screen for nine full visits`, async ({
    page,
  }) => {
    test.setTimeout(900000);
    await page.setViewportSize({ width, height });
    const frame = await loadRenderer(page, { scene: 7 });
    const failures: string[] = [];
    let focusedSamples = 0;
    let glidingSamples = 0;

    for (let visit = 0; visit < EXPRESSIONS_VISITS; visit++) {
      await enterExpressionsVisit(frame, visit);
      for (const t of EXPRESSIONS_DWELL_SAMPLES_MS) {
        const result = await measureExpressionReach(frame, floor, t);
        expect(result.sceneId, `visit ${visit + 1} t=${t}ms still on scene 7`).toBe(7);
        expect(result.cardCount).toBe(9);
        if (result.focusedGlow > 0) focusedSamples++;
        // Every one of the 30 points inside a glide (all but its landing point) must catch all nine
        // cards in flight, or the sweep is not measuring the movement it claims to.
        const insideGlide = EXPRESSIONS_MOVE_STARTS_MS.some((start) => t > start && t < start + EXPRESSIONS_MOVE_MS - 20);
        if (insideGlide && EXPRESSIONS_MOVE_SAMPLES_MS.includes(t)) {
          expect(result.glidingCards, `visit ${visit + 1} t=${t}ms all nine cards in flight`).toBe(9);
          glidingSamples++;
        }
        for (const failure of result.failures) failures.push(`visit ${visit + 1} t=${t}ms ${failure}`);
      }
    }

    // 29 in-flight points for each of the three glides of each of the nine visits.
    expect(glidingSamples).toBe(EXPRESSIONS_VISITS * EXPRESSIONS_MOVE_STARTS_MS.length * 29);

    // The glow was really measured (55px blur plus 3px ring, times depth), not skipped.
    expect(focusedSamples).toBeGreaterThan(0);
    expect(failures.slice(0, 40), `${failures.length} edge failures`).toEqual([]);
  });
}

for (const { width, height, floor } of EXPRESSIONS_EDGE_CASES) {
  test(`at ${width}x${height} every card's words fit, the title and footnote sit clear, and nothing is shrunk`, async ({
    page,
  }) => {
    test.setTimeout(600000);
    await page.setViewportSize({ width, height });
    const frame = await loadRenderer(page, { scene: 7 });
    const k = width / 1920;
    const focusedIds = new Set<number>();

    for (let visit = 0; visit < EXPRESSIONS_VISITS; visit++) {
      await enterExpressionsVisit(frame, visit);
      for (const phase of ['grid', 'hold'] as const) {
        if (phase === 'hold') await frame.evaluate(() => (window as any).colorPolishRuntime.step(14000));
        const r = await frame.evaluate(() => {
          document.getAnimations().forEach((animation) => {
            animation.pause();
            animation.currentTime = 1e7;
          });
          const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="7"]')!;
          const box = scene.getBoundingClientRect();
          const title = scene.querySelector<HTMLElement>('h1.heading')!.getBoundingClientRect();
          const captionEl = scene.querySelector<HTMLElement>('.edu-caption')!;
          const caption = captionEl.getBoundingClientRect();
          const overlaps = (a: DOMRect, b: DOMRect) =>
            a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
          const cards = [...scene.querySelectorAll<HTMLElement>('.edu-card')].map((card) => {
            const rect = card.getBoundingClientRect();
            const scale = rect.height / card.offsetHeight;
            const front = card.querySelector<HTMLElement>('.edu-front')!;
            const detail = card.querySelector<HTMLElement>('.edu-detail')!;
            const explanation = detail.querySelector<HTMLElement>('.edu-explanation')!.getBoundingClientRect();
            const source = detail.querySelector<HTMLElement>('.edu-source')!.getBoundingClientRect();
            const texts = [...detail.querySelectorAll<HTMLElement>('.edu-phrase, .edu-principle, .edu-explanation')];
            return {
              id: Number(card.dataset.expressionId),
              state: card.classList.contains('focused') ? 'focused' : card.classList.contains('compact') ? 'compact' : 'grid',
              left: rect.left,
              right: rect.right,
              top: rect.top,
              frontFits: front.scrollHeight <= card.clientHeight && front.scrollWidth <= card.clientWidth,
              phraseSlack: rect.bottom - front.querySelector<HTMLElement>('.edu-phrase')!.getBoundingClientRect().bottom,
              detailFits: detail.scrollHeight <= card.clientHeight && detail.scrollWidth <= card.clientWidth,
              fill: ((explanation.bottom - rect.top) / rect.height) * 100,
              sourceBelow: source.top >= explanation.bottom,
              smallestTextPx: Math.min(...texts.map((el) => parseFloat(getComputedStyle(el).fontSize) * scale)),
              coversCaption: overlaps(rect, caption),
            };
          });
          return {
            titleBottom: title.bottom,
            // The footnote is positioned against the scene, not derived from it, so this can fail:
            // it must sit inside the scene box (where the TV cuts) with none of its words clipped.
            captionInside:
              caption.left >= box.left &&
              caption.right <= box.right &&
              caption.top >= box.top &&
              caption.bottom <= box.bottom &&
              captionEl.scrollWidth <= captionEl.clientWidth &&
              captionEl.scrollHeight <= captionEl.clientHeight,
            cards,
          };
        });

        const label = `visit ${visit + 1} ${phase}`;
        expect(r.captionInside, `${label}: footnote inside the scene box, unclipped`).toBe(true);
        for (const card of r.cards) {
          expect(card.coversCaption, `${label} card ${card.id}: footnote uncovered`).toBe(false);
        }
        if (phase === 'grid') {
          for (const card of r.cards) {
            expect(card.state, `${label} card ${card.id}`).toBe('grid');
            expect(card.frontFits, `${label} card ${card.id} words fit`).toBe(true);
            expect(card.phraseSlack, `${label} card ${card.id} phrase slack`).toBeGreaterThanOrEqual(12 * k);
          }
          // The title sits clear above the top row (its outer cards tilt their top edge upward).
          const topRow = Math.min(...r.cards.map((card) => card.top));
          expect(topRow - r.titleBottom, `${label} title clearance above the grid`).toBeGreaterThanOrEqual(floor);
          continue;
        }
        const focused = r.cards.filter((card) => card.state === 'focused');
        const compact = r.cards.filter((card) => card.state === 'compact');
        expect(focused).toHaveLength(1);
        expect(compact).toHaveLength(8);
        const panel = focused[0];
        focusedIds.add(panel.id);
        expect(panel.detailFits, `${label} focus ${panel.id} words fit`).toBe(true);
        expect(panel.fill, `${label} focus ${panel.id} explanation fill`).toBeGreaterThanOrEqual(70);
        expect(panel.fill, `${label} focus ${panel.id} explanation fill`).toBeLessThanOrEqual(92);
        expect(panel.sourceBelow, `${label} focus ${panel.id} source below explanation`).toBe(true);
        expect(panel.smallestTextPx, `${label} focus ${panel.id} text floor`).toBeGreaterThanOrEqual(18 * k);
        // The title sits clear above the focused panel's top border.
        expect(panel.top - r.titleBottom, `${label} title clearance`).toBeGreaterThanOrEqual(floor);
        for (const card of compact) {
          expect(card.frontFits, `${label} compact ${card.id} words fit`).toBe(true);
          expect(card.phraseSlack, `${label} compact ${card.id} phrase slack`).toBeGreaterThanOrEqual(12 * k);
          expect(card.left - panel.right, `${label} compact ${card.id} clear of the panel`).toBeGreaterThanOrEqual(floor);
        }
      }
    }
    expect(focusedIds.size).toBe(9);
  });
}

// The focused panel's text is set in Georgia, which most TV browsers lack, so the TV's fallback
// serif can run wider than Chrome's here. Widen every letter inside the panel by a fraction of its
// own font size (stricter than one inherited absolute value on .edu-detail) and require that each of
// the nine panels still keeps its explanation above the source note with nothing clipped.
for (const letterSpacing of [0.03, 0.05]) {
  for (const { width, height } of EXPRESSIONS_EDGE_CASES) {
    test(`at ${width}x${height} with ${letterSpacing}em wider letters every focused panel still fits above its source note`, async ({
      page,
    }) => {
      test.setTimeout(600000);
      await page.setViewportSize({ width, height });
      const frame = await loadRenderer(page, { scene: 7 });
      const k = width / 1920;
      const focusedIds = new Set<number>();

      for (let visit = 0; visit < EXPRESSIONS_VISITS; visit++) {
        await enterExpressionsVisit(frame, visit);
        await frame.evaluate((em) => {
          let style = document.getElementById('tv17-wider-letters');
          if (!style) {
            style = document.createElement('style');
            style.id = 'tv17-wider-letters';
            document.head.appendChild(style);
          }
          style.textContent = `#stage .scene[data-scene="7"] .edu-detail, #stage .scene[data-scene="7"] .edu-detail * { letter-spacing: ${em}em !important; }`;
        }, letterSpacing);
        await frame.evaluate(() => (window as any).colorPolishRuntime.step(14000));
        const panel = await frame.evaluate(() => {
          document.getAnimations().forEach((animation) => {
            animation.pause();
            animation.currentTime = 1e7;
          });
          const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="7"]')!;
          const box = scene.getBoundingClientRect();
          const card = scene.querySelector<HTMLElement>('.edu-card.focused');
          if (!card) throw new Error('no focused card');
          const rect = card.getBoundingClientRect();
          const scale = rect.height / card.offsetHeight;
          const detail = card.querySelector<HTMLElement>('.edu-detail')!;
          const explanationEl = detail.querySelector<HTMLElement>('.edu-explanation')!;
          const explanation = explanationEl.getBoundingClientRect();
          const source = detail.querySelector<HTMLElement>('.edu-source')!.getBoundingClientRect();
          const texts = [...detail.querySelectorAll<HTMLElement>('.eyebrow, h2, .edu-phrase, .edu-principle, .edu-explanation, .edu-source')];
          const inside = (r: DOMRect, outer: DOMRect) =>
            r.left >= outer.left - 0.5 && r.right <= outer.right + 0.5 && r.top >= outer.top - 0.5 && r.bottom <= outer.bottom + 0.5;
          // The card is the clip box (overflow hidden), so measure each text's rendered extent (its
          // content range, which includes any inline overflow of its own box) against the card.
          const textRange = (el: HTMLElement) => {
            const range = document.createRange();
            range.selectNodeContents(el);
            return range.getBoundingClientRect();
          };
          const explanationStyle = getComputedStyle(explanationEl);
          return {
            id: Number(card.dataset.expressionId),
            fontPx: parseFloat(explanationStyle.fontSize),
            spacingPx: parseFloat(explanationStyle.letterSpacing),
            sourceGap: (source.top - explanation.bottom) / scale,
            fill: ((explanation.bottom - rect.top) / rect.height) * 100,
            detailFits: detail.scrollHeight <= card.clientHeight && detail.scrollWidth <= card.clientWidth,
            textsInsideCard: texts.every((el) => inside(el.getBoundingClientRect(), rect) && inside(textRange(el), rect)),
            cardInsideScene: inside(rect, box),
            smallestTextPx: Math.min(
              ...texts
                .filter((el) => !el.matches('.eyebrow, .edu-source'))
                .map((el) => parseFloat(getComputedStyle(el).fontSize) * scale),
            ),
          };
        });
        const label = `visit ${visit + 1} focus ${panel.id} at ${letterSpacing}em`;
        focusedIds.add(panel.id);
        // The wider letters really apply to the panel's text (em of the element's own font size).
        expect(panel.spacingPx / panel.fontPx, `${label} letter spacing applied`).toBeCloseTo(letterSpacing, 3);
        expect(panel.sourceGap, `${label} source note below the explanation`).toBeGreaterThanOrEqual(0);
        expect(panel.detailFits, `${label} words fit`).toBe(true);
        expect(panel.textsInsideCard, `${label} every text block and its rendered words inside the panel`).toBe(true);
        expect(panel.cardInsideScene, `${label} panel inside the scene box`).toBe(true);
        expect(panel.fill, `${label} explanation fill`).toBeGreaterThanOrEqual(70);
        expect(panel.fill, `${label} explanation fill`).toBeLessThanOrEqual(92);
        expect(panel.smallestTextPx, `${label} text floor`).toBeGreaterThanOrEqual(18 * k);
      }
      expect(focusedIds.size).toBe(9);
    });
  }
}

// When focus moves on, the card that had it glides to its compact slot (16 s) or back to its grid
// place (26 s on a 30 s dwell). Its glow must never be carried along or fade out on the way, because
// those places sit closer to the scene edge than the glow reaches (Lane 2 measured up to 31.8px past
// the edge with a 700 ms fade). Sample every 100 ms from take-off to landing with any running
// box-shadow transition paused at the time elapsed since take-off (so a fade, if one came back,
// is caught half-way with its full geometry), and require the leaving card's painted reach to stay
// inside the scene box and the card to land in its new look.
for (const { width, height, floor } of EXPRESSIONS_EDGE_CASES) {
  test(`at ${width}x${height} a card leaving focus keeps its glow ${floor}px inside the scene box`, async ({ page }) => {
    test.setTimeout(900000);
    await page.setViewportSize({ width, height });
    const frame = await loadRenderer(page, { scene: 7 });
    const failures: string[] = [];
    const leftIds = new Set<number>();
    const landedAs = new Set<string>();

    for (let visit = 0; visit < EXPRESSIONS_VISITS; visit++) {
      await enterExpressionsVisit(frame, visit);
      for (const [leaveAt, landing] of [[16000, 'compact'], [26000, 'grid']] as const) {
        await stepToSceneAge(frame, leaveAt - 2000);
        const before = await frame.evaluate(() => {
          document.getAnimations().forEach((animation) => { animation.currentTime = 1e7; });
          const card = document.querySelector<HTMLElement>('#stage .scene[data-scene="7"] .edu-card.focused');
          return { id: Number(card?.dataset.expressionId), shadow: card ? getComputedStyle(card).boxShadow : 'none' };
        });
        expect(before.id, `visit ${visit + 1} a card is in focus before ${leaveAt}ms`).toBeGreaterThan(0);
        // The glow is really there to lose: three shadow layers on the resting focused card.
        expect(before.shadow.split(/,(?![^(]*\))/).length, `visit ${visit + 1} resting glow layers`).toBe(3);
        for (let ms = 20; ms <= EXPRESSIONS_MOVE_MS + 100; ms += 100) {
          await stepToSceneAge(frame, leaveAt + ms);
          const r = await frame.evaluate(
            ({ id, ms }) => {
              document.getAnimations().forEach((animation: any) => {
                animation.pause();
                animation.currentTime = animation.transitionProperty ? ms : 1e7;
              });
              const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="7"]')!;
              const box = scene.getBoundingClientRect();
              const card = scene.querySelector<HTMLElement>(`.edu-card[data-expression-id="${id}"]`)!;
              const rect = card.getBoundingClientRect();
              const scale = Math.max(rect.width / card.offsetWidth, rect.height / card.offsetHeight);
              const reach = { left: 0, right: 0, top: 0, bottom: 0 };
              const shadow = getComputedStyle(card).boxShadow;
              if (shadow !== 'none') {
                for (const layer of shadow.split(/,(?![^(]*\))/)) {
                  if (/\binset\b/.test(layer)) continue;
                  const [x = 0, y = 0, blur = 0, spread = 0] = (layer.replace(/[a-z-]+\([^)]*\)/gi, '').match(/-?[\d.]+px/g) || []).map(parseFloat);
                  reach.left = Math.max(reach.left, blur + spread - x);
                  reach.right = Math.max(reach.right, blur + spread + x);
                  reach.top = Math.max(reach.top, blur + spread - y);
                  reach.bottom = Math.max(reach.bottom, blur + spread + y);
                }
              }
              return {
                look: card.classList.contains('focused') ? 'focused' : card.classList.contains('compact') ? 'compact' : 'grid',
                gliding: card.classList.contains('edu-moving'),
                margins: {
                  left: rect.left - reach.left * scale - box.left,
                  right: box.right - (rect.right + reach.right * scale),
                  top: rect.top - reach.top * scale - box.top,
                  bottom: box.bottom - (rect.bottom + reach.bottom * scale),
                },
              };
            },
            { id: before.id, ms },
          );
          if (ms < EXPRESSIONS_MOVE_MS) expect(r.gliding, `visit ${visit + 1} card ${before.id} in flight at ${leaveAt}+${ms}ms`).toBe(true);
          else {
            expect(r.gliding, `visit ${visit + 1} card ${before.id} landed by ${leaveAt}+${ms}ms`).toBe(false);
            expect(r.look, `visit ${visit + 1} card ${before.id} look after leaving focus at ${leaveAt}ms`).toBe(landing);
            landedAs.add(landing);
          }
          for (const [side, margin] of Object.entries(r.margins)) {
            if (margin < floor) failures.push(`visit ${visit + 1} t=${leaveAt}+${ms}ms card ${before.id} ${side} margin ${margin.toFixed(1)}px < ${floor}px`);
          }
        }
        leftIds.add(before.id);
        // Let the sampled transitions finish so later samples start clean.
        await frame.evaluate(() => document.getAnimations().forEach((animation) => { animation.currentTime = 1e7; }));
      }
    }
    expect(leftIds.size).toBe(9);
    expect([...landedAs].sort()).toEqual(['compact', 'grid']);
    expect(failures.slice(0, 40), `${failures.length} leaving-focus glow failures`).toEqual([]);
  });
}

// Captured from tv17/base (5a24f0b), the Plan 15 renderer, on the first visit: each card's
// [translateZ px, rotateY deg] at these scene ages. The card tilt and drift are driven from script
// each frame, so this is the behavior-level record of the motion; it holds whatever the layout is.
const EXPRESSIONS_BASE_MOTION: Record<number, Array<[number, number]>> = {
  0: [[-40,7],[-40,0],[-40,-7],[0,7],[0,0],[0,-7],[-40,7],[-40,0],[-40,-7]],
  6000: [[-39.833,6.991],[-39.949,0],[-39.949,-6.991],[0,6.991],[0,0],[0,-6.991],[-39.949,6.991],[-39.949,0],[-39.949,-6.991]],
  6600: [[-16.558,5.738],[-32.787,0],[-32.787,-5.738],[0,5.738],[0,0],[0,-5.738],[-32.787,5.738],[-32.787,0],[-32.787,-5.738]],
  7200: [[29.06,3.281],[-18.751,0],[-18.751,-3.281],[0,3.281],[0,0],[0,-3.281],[-18.751,3.281],[-18.751,0],[-18.751,-3.281]],
  7800: [[72.647,0.934],[-5.339,0],[-5.339,-0.934],[0,0.934],[0,0],[0,-0.934],[-5.339,0.934],[-5.339,0],[-5.339,-0.934]],
  8400: [[90,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],
  14000: [[90,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],
  16600: [[-32.787,5.738],[-16.558,0],[-32.787,-5.738],[0,5.738],[0,0],[0,-5.738],[-32.787,5.738],[-32.787,0],[-32.787,-5.738]],
};

// Captured from tv17/base (5a24f0b): the timing and keyframes of every CSS animation running
// inside scene 7 (document.getAnimations()). Every resting grid and focused card also keeps the
// 700 ms ease box-shadow transition (the glow fades in on gaining focus); Plan 17 drops it to 0 s on
// compact cards (Lane 2) and on any card in flight between views (Lane 7), so a card leaving focus
// loses its glow at once instead of fading it past the edge.
const EXPRESSIONS_BASE_ANIMATIONS: Record<string, unknown> = {
  wordSpark: {"duration": 18000, "easing": "linear", "iterations": "infinite", "keyframes": [{"offset": 0, "easing": "ease-in-out", "opacity": "0", "transform": "scale(0.35) rotate(0deg)"}, {"offset": 0.46, "easing": "ease-in-out", "opacity": "0", "transform": "scale(0.35) rotate(0deg)"}, {"offset": 0.53, "easing": "ease-in-out", "opacity": "0.93", "transform": "scale(1) rotate(35deg)"}, {"offset": 0.61, "easing": "ease-in-out", "opacity": "0.93", "transform": "scale(1) rotate(35deg)"}, {"offset": 0.72, "easing": "ease-in-out", "opacity": "0", "transform": "scale(0.35) rotate(0deg)"}, {"offset": 1, "easing": "ease-in-out", "opacity": "0", "transform": "scale(0.35) rotate(0deg)"}]},
  wordSheen: {"duration": 19000, "easing": "linear", "iterations": "infinite", "keyframes": [{"offset": 0, "easing": "ease-in-out", "backgroundPositionX": "160%", "backgroundPositionY": "0px"}, {"offset": 0.45, "easing": "ease-in-out", "backgroundPositionX": "160%", "backgroundPositionY": "0px"}, {"offset": 0.68, "easing": "ease-in-out", "backgroundPositionX": "-160%", "backgroundPositionY": "0px"}, {"offset": 1, "easing": "ease-in-out", "backgroundPositionX": "-160%", "backgroundPositionY": "0px"}]},
  decorOrbit: {"duration": 36000, "easing": "linear", "iterations": "infinite", "keyframes": [{"offset": 0, "easing": "linear", "transform": "none"}, {"offset": 1, "easing": "linear", "transform": "rotate(360deg)"}]},
  iconLift: {"duration": 17000, "easing": "linear", "iterations": "infinite", "keyframes": [{"offset": 0, "easing": "ease-in-out", "transform": "translateY(0px) rotate(0deg)"}, {"offset": 0.68, "easing": "ease-in-out", "transform": "translateY(0px) rotate(0deg)"}, {"offset": 0.75, "easing": "ease-in-out", "transform": "translateY(-5px) rotate(-2deg)"}, {"offset": 0.82, "easing": "ease-in-out", "transform": "translateY(0px) rotate(0deg)"}, {"offset": 1, "easing": "ease-in-out", "transform": "translateY(0px) rotate(0deg)"}]},
};

test('tilt, drift, timing and keyframes are exactly the Plan 15 values', async ({ page }) => {
  test.setTimeout(300000);
  const frame = await loadRenderer(page, { scene: 7 });
  let at = 0;
  for (const t of Object.keys(EXPRESSIONS_BASE_MOTION).map(Number).sort((a, b) => a - b)) {
    if (t > at) {
      await frame.evaluate((ms) => (window as any).colorPolishRuntime.step(ms), t - at);
      at = t;
    }
    const motion = await frame.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="7"] .edu-card')].map((card) => {
        const m = card.style.transform.match(/translate3d\(0px,\s*0px,\s*(-?[\d.e-]+)px\)\s*rotateY\((-?[\d.e-]+)deg\)/);
        return m ? [Number(m[1]), Number(m[2])] : [NaN, NaN];
      }),
    );
    const expected = EXPRESSIONS_BASE_MOTION[t];
    expect(motion).toHaveLength(9);
    motion.forEach(([z, rotY], i) => {
      expect(z, `t=${t}ms card ${i + 1} translateZ`).toBeCloseTo(expected[i][0], 2);
      expect(rotY, `t=${t}ms card ${i + 1} rotateY`).toBeCloseTo(expected[i][1], 2);
    });
  }

  const animations = await frame.evaluate(() => {
    const byName: Record<string, unknown> = {};
    for (const animation of document.getAnimations() as any[]) {
      const target = animation.effect?.target as Element | undefined;
      if (!target?.closest?.('#stage .scene[data-scene="7"]')) continue;
      const timing = animation.effect.getTiming();
      if (animation.transitionProperty) continue;
      if (byName[animation.animationName]) continue;
      byName[animation.animationName] = {
        duration: timing.duration,
        easing: timing.easing,
        iterations: timing.iterations === Infinity ? 'infinite' : timing.iterations,
        keyframes: animation.effect.getKeyframes().map((frame: Record<string, unknown>) => {
          const { composite, computedOffset, ...rest } = frame;
          return rest;
        }),
      };
    }
    const transitions = [...document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="7"] .edu-card')].map(
      (card) => {
        const style = getComputedStyle(card);
        return {
          compact: card.classList.contains('compact'),
          gliding: card.classList.contains('edu-moving'),
          property: style.transitionProperty,
          duration: style.transitionDuration,
          easing: style.transitionTimingFunction,
        };
      },
    );
    return { byName, transitions };
  });
  expect(animations.byName).toEqual(EXPRESSIONS_BASE_ANIMATIONS);
  expect(animations.transitions).toHaveLength(9);
  // Sampled at 16.6 s, past the half-way swap of the second glide: one card in the focused look,
  // eight compact, all nine still in flight, so none of them may fade a shadow.
  expect(animations.transitions.filter((transition) => transition.compact)).toHaveLength(8);
  expect(animations.transitions.filter((transition) => transition.gliding)).toHaveLength(9);
  for (const { compact, gliding, ...transition } of animations.transitions) {
    expect(transition).toEqual({ property: 'box-shadow', duration: '0s', easing: 'ease' });
  }

  // At rest (19 s) the Plan 15 timing is back: 0.7 s on the focused card, 0 s on the compact eight.
  await frame.evaluate((ms) => (window as any).colorPolishRuntime.step(ms), 19000 - at);
  const resting = await frame.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="7"] .edu-card')].map((card) => {
      const style = getComputedStyle(card);
      return {
        compact: card.classList.contains('compact'),
        gliding: card.classList.contains('edu-moving'),
        property: style.transitionProperty,
        duration: style.transitionDuration,
        easing: style.transitionTimingFunction,
      };
    }),
  );
  expect(resting.filter((transition) => transition.compact)).toHaveLength(8);
  expect(resting.filter((transition) => transition.gliding)).toHaveLength(0);
  for (const { compact, gliding, ...transition } of resting) {
    expect(transition).toEqual({ property: 'box-shadow', duration: compact ? '0s' : '0.7s', easing: 'ease' });
  }
});

// --- Plan 17 Lane 7: the view switch is a glide, not a cut ---------------------------------------
//
// Anthony on the church TV (September 19): the change between the all-nine grid and the
// one-in-focus view "is not smooth and just cuts out"; the cards should smoothly move and switch
// places when one is enlarging. These specs drive the renderer directly (loadRenderer), stepping
// its clock, so every number below is the rendered geometry at a known scene age.

function expressionsFixture(dwellSeconds: number, settingsOverrides: Record<string, unknown> = {}) {
  const fixture = buildActiveDisplayFixture() as any;
  for (const entry of fixture.presentation.playlist) {
    if (entry.id === 'expressions') entry.durationSeconds = dwellSeconds;
  }
  fixture.settings = { ...fixture.settings, ...settingsOverrides };
  return fixture;
}

type ExpressionsCardSample = {
  id: number;
  look: 'focused' | 'compact' | 'grid';
  gliding: boolean;
  left: number;
  top: number;
  right: number;
  bottom: number;
  opacity: number;
  zIndex: number;
  box: string;
  wordsOpacity: number;
  wordsStretch: number;
};

// One rendered sample of the nine live cards (the reduced-motion ghost copy is excluded).
async function sampleExpressionCards(frame: Frame): Promise<ExpressionsCardSample[]> {
  return await frame.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="7"] .educational:not(.edu-ghost) .edu-card')].map((card) => {
      const rect = card.getBoundingClientRect();
      const look = card.classList.contains('focused') ? 'focused' : card.classList.contains('compact') ? 'compact' : 'grid';
      const words = card.querySelector<HTMLElement>(look === 'focused' ? '.edu-detail' : '.edu-front')!;
      const wordsRect = words.getBoundingClientRect();
      // How far the words are stretched out of shape: rendered width over height against laid-out
      // width over height. 1 means the words keep their shape while the card around them stretches.
      const wordsStretch = (wordsRect.width / wordsRect.height) / (words.offsetWidth / words.offsetHeight);
      return {
        id: Number(card.dataset.expressionId),
        look: look as 'focused' | 'compact' | 'grid',
        gliding: card.classList.contains('edu-moving'),
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        opacity: parseFloat(getComputedStyle(card).opacity),
        zIndex: Number(getComputedStyle(card).zIndex) || 0,
        box: [card.style.left, card.style.top, card.style.width, card.style.height].join(' '),
        wordsOpacity: parseFloat(getComputedStyle(words).opacity),
        wordsStretch,
      };
    }),
  );
}

for (const { width, height } of EXPRESSIONS_EDGE_CASES) {
  test(`at ${width}x${height} no card ever jumps: every view change is a continuous, eased glide of about one second`, async ({ page }) => {
    test.setTimeout(900000);
    await page.setViewportSize({ width, height });
    const frame = await loadRenderer(page, { scene: 7, fixture: expressionsFixture(30) });
    const k = width / 1920;
    await stepToSceneAge(frame, 5000);
    let previous = await sampleExpressionCards(frame);
    const lastMove = new Map<number, number>();
    const jumps: string[] = [];
    const glideFrames = new Map<number, number>();
    let peak = 0;
    // 20 ms steps (finer than a 60 Hz TV frame) from 5 s to 29.5 s: all three view changes.
    for (let t = 5020; t <= 29500; t += 20) {
      await stepToSceneAge(frame, t);
      const cards = await sampleExpressionCards(frame);
      expect(cards).toHaveLength(9);
      for (let i = 0; i < 9; i++) {
        const now = cards[i];
        const was = previous[i];
        const move = Math.max(Math.abs(now.left - was.left), Math.abs(now.top - was.top), Math.abs(now.right - was.right), Math.abs(now.bottom - was.bottom)) / k;
        const before = lastMove.get(now.id) ?? 0;
        peak = Math.max(peak, move);
        // A cut shows up as a single step far larger than its neighbours. The old renderer moved a
        // card up to about 1390px in one step; a glide never exceeds 60px per 20 ms here, and the
        // step size itself changes by no more than 8px from one step to the next (eased start and
        // stop, no lurch at the half-way swap of box and look).
        if (move > 60) jumps.push(`t=${t}ms card ${now.id} moved ${move.toFixed(1)}px in one step`);
        if (Math.abs(move - before) > 8) jumps.push(`t=${t}ms card ${now.id} step changed from ${before.toFixed(1)}px to ${move.toFixed(1)}px`);
        if (Math.abs(now.opacity - was.opacity) > 0.03) jumps.push(`t=${t}ms card ${now.id} opacity ${was.opacity} to ${now.opacity}`);
        lastMove.set(now.id, move);
        if (now.gliding) glideFrames.set(now.id, (glideFrames.get(now.id) ?? 0) + 1);
      }
      previous = cards;
    }
    expect(jumps.slice(0, 20), `${jumps.length} jumps`).toEqual([]);
    // The cards really travelled (this is not a still scene passing a no-jump check).
    expect(peak).toBeGreaterThan(20);
    // Three glides of 1.1 s each: 54 or 55 in-flight samples per glide for every card, which is the
    // 0.8 to 1.2 s window Anthony's ruling allows (40 to 60 samples per glide).
    for (let id = 1; id <= 9; id++) {
      const perGlide = (glideFrames.get(id) ?? 0) / 3;
      expect(perGlide, `card ${id} in-flight samples per glide`).toBeGreaterThanOrEqual(40);
      expect(perGlide, `card ${id} in-flight samples per glide`).toBeLessThanOrEqual(60);
    }
  });
}

test('the chosen card grows from its grid place into focus while the others glide to their places, by transform and opacity only', async ({ page }) => {
  test.setTimeout(600000);
  const frame = await loadRenderer(page, { scene: 7, fixture: expressionsFixture(30) });
  await stepToSceneAge(frame, 5900);
  const grid = await sampleExpressionCards(frame);
  await stepToSceneAge(frame, 9000);
  const focus = await sampleExpressionCards(frame);
  const hero = focus.find((card) => card.look === 'focused')!;
  expect(hero, 'a card is in focus at 9 s').toBeTruthy();

  // Replay the same glide on a fresh visit and watch it.
  await settleOnScene(frame, 1);
  await settleOnScene(frame, 7);
  // The next visit focuses the next expression, so re-read the two resting states for this visit.
  await stepToSceneAge(frame, 5900);
  const from = await sampleExpressionCards(frame);
  const boxes = new Map<number, Set<string>>();
  const looks = new Map<number, Set<string>>();
  const swapOpacity: number[] = [];
  const stretch: number[] = [];
  const samples: ExpressionsCardSample[][] = [];
  let last = from;
  for (let t = 6020; t <= 7080; t += 20) {
    await stepToSceneAge(frame, t);
    const cards = await sampleExpressionCards(frame);
    samples.push(cards);
    cards.forEach((card, i) => {
      if (!boxes.has(card.id)) boxes.set(card.id, new Set());
      if (!looks.has(card.id)) looks.set(card.id, new Set());
      boxes.get(card.id)!.add(card.box);
      looks.get(card.id)!.add(card.look);
      // Whenever a card's laid-out box or look changes between two samples, its words must be
      // invisible on both sides of the change: that is what hides the one reflow per glide.
      if (card.box !== last[i].box || card.look !== last[i].look) swapOpacity.push(last[i].wordsOpacity, card.wordsOpacity);
      if (card.wordsOpacity > 0.05) stretch.push(card.wordsStretch);
    });
    last = cards;
  }
  await stepToSceneAge(frame, 9000);
  const to = await sampleExpressionCards(frame);
  const chosen = to.find((card) => card.look === 'focused')!;
  expect(chosen.id).toBe((hero.id % 9) + 1);

  for (let id = 1; id <= 9; id++) {
    // Left, top, width and height take exactly two values through the glide (the old box, then the
    // new one): layout changes once, everything else is transform and opacity.
    expect(boxes.get(id)!.size, `card ${id} laid-out boxes during the glide`).toBe(2);
    expect(looks.get(id)!.size, `card ${id} looks during the glide`).toBe(2);
  }
  expect(swapOpacity.length).toBe(18);
  for (const opacity of swapOpacity) expect(opacity).toBeLessThanOrEqual(0.02);
  // While words are visible they keep their shape to within 5 percent (the resting 7 degree tilt
  // and its perspective already account for about 3); without the counter-scale the words would be
  // stretched by up to 70 percent on the way.
  expect(stretch.length).toBeGreaterThan(200);
  expect(Math.min(...stretch)).toBeGreaterThan(0.95);
  expect(Math.max(...stretch)).toBeLessThan(1.05);

  // Half-way through, every card is strictly between where it started and where it lands.
  const mid = samples[Math.floor(samples.length / 2)];
  const start = from;
  for (let i = 0; i < 9; i++) {
    const a = start[i];
    const b = to[i];
    const m = mid[i];
    const centre = (card: ExpressionsCardSample) => ({ x: (card.left + card.right) / 2, y: (card.top + card.bottom) / 2 });
    const travelled = Math.hypot(centre(m).x - centre(a).x, centre(m).y - centre(a).y);
    const remaining = Math.hypot(centre(b).x - centre(m).x, centre(b).y - centre(m).y);
    const whole = Math.hypot(centre(b).x - centre(a).x, centre(b).y - centre(a).y);
    if (whole > 40) {
      expect(travelled, `card ${m.id} has left its grid place by half-way`).toBeGreaterThan(whole * 0.2);
      expect(remaining, `card ${m.id} has not landed by half-way`).toBeGreaterThan(whole * 0.2);
      // On the straight line between the two places (no detour past a screen edge).
      expect(travelled + remaining, `card ${m.id} path`).toBeLessThan(whole * 1.02 + 2);
    }
  }
  const heroMid = mid.find((card) => card.id === chosen.id)!;
  const heroFrom = start.find((card) => card.id === chosen.id)!;
  expect(heroMid.right - heroMid.left, 'the chosen card is growing').toBeGreaterThan((heroFrom.right - heroFrom.left) * 1.15);
  expect(heroMid.right - heroMid.left, 'the chosen card is not yet full size').toBeLessThan((chosen.right - chosen.left) * 0.9);
  // The unused first-visit samples pin that the grid and focus states of this scene exist at all.
  expect(grid.every((card) => card.look === 'grid')).toBe(true);
});

test('when focus moves on, the two cards switch places in view and the one gaining focus stays on top', async ({ page }) => {
  test.setTimeout(600000);
  const frame = await loadRenderer(page, { scene: 7, fixture: expressionsFixture(30) });
  await stepToSceneAge(frame, 15900);
  const before = await sampleExpressionCards(frame);
  const leaving = before.find((card) => card.look === 'focused')!;
  const gainingId = (leaving.id % 9) + 1;
  const gainingBefore = before.find((card) => card.id === gainingId)!;
  let overlapSamples = 0;
  for (let t = 16040; t <= 17080; t += 40) {
    await stepToSceneAge(frame, t);
    const onTop = await frame.evaluate(
      ({ a, b }) => {
        const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="7"]')!;
        const A = scene.querySelector<HTMLElement>(`.edu-card[data-expression-id="${a}"]`)!.getBoundingClientRect();
        const B = scene.querySelector<HTMLElement>(`.edu-card[data-expression-id="${b}"]`)!.getBoundingClientRect();
        const left = Math.max(A.left, B.left), right = Math.min(A.right, B.right);
        const top = Math.max(A.top, B.top), bottom = Math.min(A.bottom, B.bottom);
        if (right - left < 40 || bottom - top < 40) return null;
        const hit = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
        return Number(hit?.closest<HTMLElement>('.edu-card')?.dataset.expressionId);
      },
      { a: leaving.id, b: gainingId },
    );
    if (onTop === null) continue;
    overlapSamples++;
    expect(onTop, `t=${t}ms the card gaining focus is painted over the one leaving`).toBe(gainingId);
  }
  // They really cross each other on the way (a swap in view, not two separate fades).
  expect(overlapSamples).toBeGreaterThan(3);

  await stepToSceneAge(frame, 19000);
  const after = await sampleExpressionCards(frame);
  const gainingAfter = after.find((card) => card.id === gainingId)!;
  const leavingAfter = after.find((card) => card.id === leaving.id)!;
  expect(gainingAfter.look).toBe('focused');
  expect(leavingAfter.look).toBe('compact');
  // The card that left focus now rests where the card that gained it rested, and the reverse.
  expect(Math.abs(leavingAfter.left - gainingBefore.left)).toBeLessThan(1);
  expect(Math.abs(leavingAfter.top - gainingBefore.top)).toBeLessThan(1);
  expect(Math.abs(gainingAfter.left - leaving.left)).toBeLessThan(1);
  expect(Math.abs(gainingAfter.top - leaving.top)).toBeLessThan(1);
  // The seven cards that keep their slot do not drift away from it.
  for (const card of after) {
    if (card.id === leaving.id || card.id === gainingId) continue;
    const was = before.find((other) => other.id === card.id)!;
    expect(Math.abs(card.left - was.left), `card ${card.id} kept its slot`).toBeLessThan(1);
    expect(Math.abs(card.top - was.top), `card ${card.id} kept its slot`).toBeLessThan(1);
  }
});

// The dwell is read from state. 30 s and 60 s are the two values the TV uses; 40 s proves the plan
// follows the number rather than matching two hardcoded cases.
for (const { dwell, focusAt, gridFrom } of [
  { dwell: 30, focusAt: [10000, 20000], gridFrom: 26000 },
  { dwell: 40, focusAt: [10000, 20000, 30000], gridFrom: 36000 },
  { dwell: 60, focusAt: [10000, 20000, 30000, 40000, 50000], gridFrom: 56000 },
]) {
  test(`a ${dwell} s dwell shows ${focusAt.length} whole focuses and glides back to the grid at ${gridFrom / 1000} s`, async ({ page }) => {
    test.setTimeout(600000);
    const frame = await loadRenderer(page, { scene: 7, fixture: expressionsFixture(dwell) });
    const dwellInState = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().visual.dwell[7]);
    expect(dwellInState).toBe(dwell);
    await stepToSceneAge(frame, 3000);
    const grid = await sampleExpressionCards(frame);
    expect(grid.every((card) => card.look === 'grid')).toBe(true);

    const focusedIds: number[] = [];
    for (const t of focusAt) {
      await stepToSceneAge(frame, t);
      const cards = await sampleExpressionCards(frame);
      const focused = cards.filter((card) => card.look === 'focused');
      expect(focused, `one card in focus at ${t}ms`).toHaveLength(1);
      expect(cards.filter((card) => card.look === 'compact')).toHaveLength(8);
      expect(cards.some((card) => card.gliding), `at rest at ${t}ms`).toBe(false);
      focusedIds.push(focused[0].id);
    }
    // Consecutive expressions, each held for the full 10 s cycle.
    for (let i = 1; i < focusedIds.length; i++) expect(focusedIds[i]).toBe((focusedIds[i - 1] % 9) + 1);
    // The last focus is still fully held just before the return.
    await stepToSceneAge(frame, gridFrom - 200);
    const held = await sampleExpressionCards(frame);
    expect(held.find((card) => card.look === 'focused')?.id).toBe(focusedIds[focusedIds.length - 1]);
    expect(held.some((card) => card.gliding)).toBe(false);

    // The reverse glide: in flight half a second after the return starts.
    await stepToSceneAge(frame, gridFrom + 550);
    const returning = await sampleExpressionCards(frame);
    expect(returning.filter((card) => card.gliding)).toHaveLength(9);
    const label = await frame.evaluate(() => document.querySelector('#stage .scene[data-scene="7"] #edu-step')?.textContent);
    expect(label).toBe('01-09 · THE COMPLETE PHRASES');

    // Back on the all-nine grid, every card exactly where it began, before the dwell ends.
    await stepToSceneAge(frame, gridFrom + 2600);
    expect(gridFrom + 2600).toBeLessThan(dwell * 1000);
    const back = await sampleExpressionCards(frame);
    for (let i = 0; i < 9; i++) {
      expect(back[i].look).toBe('grid');
      expect(back[i].gliding).toBe(false);
      expect(back[i].opacity).toBeCloseTo(1, 2);
      expect(Math.abs(back[i].left - grid[i].left), `card ${back[i].id} left`).toBeLessThan(0.5);
      expect(Math.abs(back[i].top - grid[i].top), `card ${back[i].id} top`).toBeLessThan(0.5);
      expect(Math.abs(back[i].right - grid[i].right), `card ${back[i].id} right`).toBeLessThan(0.5);
      expect(Math.abs(back[i].bottom - grid[i].bottom), `card ${back[i].id} bottom`).toBeLessThan(0.5);
    }
    await stepToSceneAge(frame, dwell * 1000 - 100);
    const end = await sampleExpressionCards(frame);
    expect(end.every((card) => card.look === 'grid' && !card.gliding)).toBe(true);
  });
}

test('a scene held past its dwell repeats the plan and carries on to the following expressions', async ({ page }) => {
  test.setTimeout(600000);
  const frame = await loadRenderer(page, { scene: 7, fixture: expressionsFixture(30) });
  await stepToSceneAge(frame, 20000);
  const second = (await sampleExpressionCards(frame)).find((card) => card.look === 'focused')!;
  await stepToSceneAge(frame, 33000);
  expect((await sampleExpressionCards(frame)).every((card) => card.look === 'grid')).toBe(true);
  await stepToSceneAge(frame, 40000);
  const third = (await sampleExpressionCards(frame)).find((card) => card.look === 'focused');
  expect(third?.id).toBe((second.id % 9) + 1);
});

test('with reduced motion and a running scene the view change is a plain crossfade: nothing travels', async ({ page }) => {
  test.setTimeout(600000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Reduced motion normally makes the scene still (covered above). It only keeps running when the
  // owner forces lively motion, and that is where the crossfade applies.
  const frame = await loadRenderer(page, { scene: 7, fixture: expressionsFixture(30, { motion: 'lively' }) });
  const state = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().still);
  expect(state).toBe(false);
  await stepToSceneAge(frame, 5900);
  expect(await frame.evaluate(() => document.querySelectorAll('#stage .scene[data-scene="7"] .edu-ghost').length)).toBe(0);
  await stepToSceneAge(frame, 9000);
  const landed = await sampleExpressionCards(frame);

  await settleOnScene(frame, 1);
  await settleOnScene(frame, 7);
  await stepToSceneAge(frame, 5900);
  const opacities: Array<{ ghost: number; live: number }> = [];
  for (let t = 6100; t <= 7000; t += 100) {
    await stepToSceneAge(frame, t);
    const r = await frame.evaluate(() => {
      const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="7"]')!;
      const ghost = scene.querySelector<HTMLElement>('.educational.edu-ghost');
      const live = scene.querySelector<HTMLElement>('.educational:not(.edu-ghost)')!;
      return {
        ghost: ghost ? parseFloat(getComputedStyle(ghost).opacity) : -1,
        ghostCards: ghost ? ghost.querySelectorAll('.edu-card:not(.focused):not(.compact)').length : 0,
        ghostIds: ghost ? ghost.querySelectorAll('[id]').length : -1,
        live: parseFloat(getComputedStyle(live).opacity),
        travelling: [...live.querySelectorAll<HTMLElement>('.edu-card')].filter((card) => card.classList.contains('edu-moving') || /scale\(/.test(card.style.transform)).length,
        looks: [...live.querySelectorAll<HTMLElement>('.edu-card')].filter((card) => card.classList.contains('focused') || card.classList.contains('compact')).length,
      };
    });
    // The outgoing view is a frozen copy of the all-nine grid; the incoming view is already in its
    // final places underneath; no card carries a glide transform.
    expect(r.ghost, `t=${t}ms ghost present`).toBeGreaterThanOrEqual(0);
    expect(r.ghostCards).toBe(9);
    expect(r.ghostIds).toBe(0);
    expect(r.travelling).toBe(0);
    expect(r.looks).toBe(9);
    expect(r.ghost + r.live).toBeCloseTo(1, 2);
    opacities.push({ ghost: r.ghost, live: r.live });
  }
  for (let i = 1; i < opacities.length; i++) {
    expect(opacities[i].live).toBeGreaterThan(opacities[i - 1].live);
    expect(opacities[i].ghost).toBeLessThan(opacities[i - 1].ghost);
  }
  await stepToSceneAge(frame, 7200);
  const done = await frame.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="7"]')!;
    return { ghosts: scene.querySelectorAll('.edu-ghost').length, live: getComputedStyle(scene.querySelector<HTMLElement>('.educational')!).opacity };
  });
  expect(done).toEqual({ ghosts: 0, live: '1' });
  // Same resting layout as the moving version lands in.
  await stepToSceneAge(frame, 9000);
  const rested = await sampleExpressionCards(frame);
  expect(rested.filter((card) => card.look === 'compact')).toHaveLength(landed.filter((card) => card.look === 'compact').length);
  expect(rested.filter((card) => card.look === 'focused')).toHaveLength(1);
});
