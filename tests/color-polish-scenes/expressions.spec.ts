import { expect, test, type Frame } from '@playwright/test';
import {
  circularity,
  noOverflow,
  openStudioScene,
  reducedMotionScene,
  studioClickDoesNotAdvance,
} from './helpers';

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
  const { frame } = await openStudioScene(page, 'expressions', 14000);
  const seenIds = new Set<number>();

  for (let round = 0; round < 18 && seenIds.size < 9; round++) {
    await frame.evaluate(() => {
      (window as any).colorPolishRuntime.setScene(7);
    });

    await frame.waitForFunction(() => {
      const runtime = (window as any).colorPolishRuntime;
      const state = runtime?.getState();
      return state?.mode === 'normal' && state?.scene === 7;
    });

    await frame.evaluate((checkpointMs) => {
      (window as any).colorPolishRuntime.step(checkpointMs);
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

test('reduced motion renders the scene still', async ({ page }) => {
  const { frame, still } = await reducedMotionScene(page, 'expressions');
  expect(still).toBe(true);

  const focused = await evaluateFocusedCard(frame);
  expect(focused.detailScrollFits).toBe(true);
  expect(focused.percent).toBeGreaterThanOrEqual(70);
  expect(focused.percent).toBeLessThanOrEqual(92);
  expect(focused.sourceBelowExplanation).toBe(true);
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
