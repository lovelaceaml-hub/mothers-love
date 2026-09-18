import { expect, test, type Frame } from '@playwright/test';
import {
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
  test.setTimeout(180000);
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
const EXPRESSIONS_DWELL_SAMPLES_MS = (() => {
  const times = new Set<number>();
  for (let i = 0; i < 30; i++) times.add(i * 1000);
  for (const rampStart of [6000, 16000, 26000]) {
    for (let t = rampStart; t <= rampStart + 2400; t += 200) times.add(t);
  }
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

// Every card's painted reach against the scene box and the viewport: its rendered rect (which
// already includes tilt and depth) widened by its computed box-shadow, which is scaled by the
// same depth. Finished transitions (currentTime past their end) mean a card that has just gained
// focus is measured with its full glow.
async function measureExpressionReach(frame: Frame, floor: number) {
  return await frame.evaluate((floor) => {
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
    scene.querySelectorAll<HTMLElement>('.edu-card').forEach((card) => {
      cardCount++;
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
    return { cardCount, focusedGlow, failures };
  }, floor);
}

for (const { width, height, floor } of EXPRESSIONS_EDGE_CASES) {
  test(`every card, border and glow stays ${floor}px inside the scene box and the ${width}x${height} screen for nine full visits`, async ({
    page,
  }) => {
    test.setTimeout(240000);
    await page.setViewportSize({ width, height });
    const frame = await loadRenderer(page, { scene: 7 });
    const failures: string[] = [];
    let focusedSamples = 0;

    for (let visit = 0; visit < EXPRESSIONS_VISITS; visit++) {
      await enterExpressionsVisit(frame, visit);
      let at = 0;
      for (const t of EXPRESSIONS_DWELL_SAMPLES_MS) {
        if (t > at) {
          await frame.evaluate((ms) => (window as any).colorPolishRuntime.step(ms), t - at);
          at = t;
        }
        const state = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().scene);
        expect(state, `visit ${visit + 1} t=${t}ms still on scene 7`).toBe(7);
        const result = await measureExpressionReach(frame, floor);
        expect(result.cardCount).toBe(9);
        if (result.focusedGlow > 0) focusedSamples++;
        for (const failure of result.failures) failures.push(`visit ${visit + 1} t=${t}ms ${failure}`);
      }
    }

    // The glow was really measured (55px blur plus 3px ring, times depth), not skipped.
    expect(focusedSamples).toBeGreaterThan(0);
    expect(failures.slice(0, 40), `${failures.length} edge failures`).toEqual([]);
  });
}

for (const { width, height, floor } of EXPRESSIONS_EDGE_CASES) {
  test(`at ${width}x${height} every card's words fit, the title and footnote sit clear, and nothing is shrunk`, async ({
    page,
  }) => {
    test.setTimeout(180000);
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
      test.setTimeout(180000);
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

// When focus moves on, the card that had it jumps to its compact slot. Its glow must not fade out
// there over the 700 ms transition, because the compact slots sit closer to the scene edge than the
// glow reaches: sample the first 300 ms after every leave (t = 16 s and 26 s of each visit, so every
// card leaves focus twice) with the transitions paused at that time, and require the leaving card's
// painted reach to stay inside the scene box.
for (const { width, height, floor } of EXPRESSIONS_EDGE_CASES) {
  test(`at ${width}x${height} a card leaving focus keeps its glow ${floor}px inside the scene box`, async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width, height });
    const frame = await loadRenderer(page, { scene: 7 });
    const failures: string[] = [];
    const leftIds = new Set<number>();

    for (let visit = 0; visit < EXPRESSIONS_VISITS; visit++) {
      await enterExpressionsVisit(frame, visit);
      let at = 0;
      for (const leaveAt of [16000, 26000]) {
        await frame.evaluate((ms) => (window as any).colorPolishRuntime.step(ms), leaveAt - 2000 - at);
        at = leaveAt - 2000;
        const leaving = await frame.evaluate(
          () => Number(document.querySelector<HTMLElement>('#stage .scene[data-scene="7"] .edu-card.focused')?.dataset.expressionId),
        );
        expect(leaving, `visit ${visit + 1} a card is in focus before ${leaveAt}ms`).toBeGreaterThan(0);
        await frame.evaluate((ms) => (window as any).colorPolishRuntime.step(ms), 2000);
        at = leaveAt;
        for (const ms of [0, 50, 100, 150, 200, 250, 300]) {
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
              for (const layer of getComputedStyle(card).boxShadow.split(/,(?![^(]*\))/)) {
                if (/\binset\b/.test(layer)) continue;
                const [x = 0, y = 0, blur = 0, spread = 0] = (layer.replace(/[a-z-]+\([^)]*\)/gi, '').match(/-?[\d.]+px/g) || []).map(parseFloat);
                reach.left = Math.max(reach.left, blur + spread - x);
                reach.right = Math.max(reach.right, blur + spread + x);
                reach.top = Math.max(reach.top, blur + spread - y);
                reach.bottom = Math.max(reach.bottom, blur + spread + y);
              }
              return {
                compact: card.classList.contains('compact'),
                margins: {
                  left: rect.left - reach.left * scale - box.left,
                  right: box.right - (rect.right + reach.right * scale),
                  top: rect.top - reach.top * scale - box.top,
                  bottom: box.bottom - (rect.bottom + reach.bottom * scale),
                },
              };
            },
            { id: leaving, ms },
          );
          expect(r.compact, `visit ${visit + 1} card ${leaving} is compact after leaving focus at ${leaveAt}ms`).toBe(true);
          for (const [side, margin] of Object.entries(r.margins)) {
            if (margin < floor) failures.push(`visit ${visit + 1} t=${leaveAt}+${ms}ms card ${leaving} ${side} margin ${margin.toFixed(1)}px < ${floor}px`);
          }
        }
        leftIds.add(leaving);
        // Let the sampled transitions finish so later samples start clean.
        await frame.evaluate(() => document.getAnimations().forEach((animation) => { animation.currentTime = 1e7; }));
      }
    }
    expect(leftIds.size).toBe(9);
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
// inside scene 7 (document.getAnimations()). Every grid and focused card also keeps the 700 ms ease
// box-shadow transition (the glow fades in on gaining focus); Plan 17 drops it to 0 s on compact
// cards only, so a card leaving focus loses its glow at once instead of fading it past the edge.
const EXPRESSIONS_BASE_ANIMATIONS: Record<string, unknown> = {
  wordSpark: {"duration": 18000, "easing": "linear", "iterations": "infinite", "keyframes": [{"offset": 0, "easing": "ease-in-out", "opacity": "0", "transform": "scale(0.35) rotate(0deg)"}, {"offset": 0.46, "easing": "ease-in-out", "opacity": "0", "transform": "scale(0.35) rotate(0deg)"}, {"offset": 0.53, "easing": "ease-in-out", "opacity": "0.93", "transform": "scale(1) rotate(35deg)"}, {"offset": 0.61, "easing": "ease-in-out", "opacity": "0.93", "transform": "scale(1) rotate(35deg)"}, {"offset": 0.72, "easing": "ease-in-out", "opacity": "0", "transform": "scale(0.35) rotate(0deg)"}, {"offset": 1, "easing": "ease-in-out", "opacity": "0", "transform": "scale(0.35) rotate(0deg)"}]},
  wordSheen: {"duration": 19000, "easing": "linear", "iterations": "infinite", "keyframes": [{"offset": 0, "easing": "ease-in-out", "backgroundPositionX": "160%", "backgroundPositionY": "0px"}, {"offset": 0.45, "easing": "ease-in-out", "backgroundPositionX": "160%", "backgroundPositionY": "0px"}, {"offset": 0.68, "easing": "ease-in-out", "backgroundPositionX": "-160%", "backgroundPositionY": "0px"}, {"offset": 1, "easing": "ease-in-out", "backgroundPositionX": "-160%", "backgroundPositionY": "0px"}]},
  decorOrbit: {"duration": 36000, "easing": "linear", "iterations": "infinite", "keyframes": [{"offset": 0, "easing": "linear", "transform": "none"}, {"offset": 1, "easing": "linear", "transform": "rotate(360deg)"}]},
  iconLift: {"duration": 17000, "easing": "linear", "iterations": "infinite", "keyframes": [{"offset": 0, "easing": "ease-in-out", "transform": "translateY(0px) rotate(0deg)"}, {"offset": 0.68, "easing": "ease-in-out", "transform": "translateY(0px) rotate(0deg)"}, {"offset": 0.75, "easing": "ease-in-out", "transform": "translateY(-5px) rotate(-2deg)"}, {"offset": 0.82, "easing": "ease-in-out", "transform": "translateY(0px) rotate(0deg)"}, {"offset": 1, "easing": "ease-in-out", "transform": "translateY(0px) rotate(0deg)"}]},
};

test('tilt, drift, timing and keyframes are exactly the Plan 15 values', async ({ page }) => {
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
  // Sampled at 16.6 s: one card in focus, eight compact.
  expect(animations.transitions.filter((transition) => transition.compact)).toHaveLength(8);
  for (const { compact, ...transition } of animations.transitions) {
    expect(transition).toEqual({ property: 'box-shadow', duration: compact ? '0s' : '0.7s', easing: 'ease' });
  }
});
