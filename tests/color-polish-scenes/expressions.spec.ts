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
