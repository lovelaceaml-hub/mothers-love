import { expect, test, type Frame } from '@playwright/test';
import {
  circularity,
  noOverflow,
  openStudioScene,
  reducedMotionScene,
  studioClickDoesNotAdvance,
} from './helpers';

async function assertDayCellsCornerAndCenter(frame: Frame) {
  const cells = await frame.evaluate(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>('.day:not(.blank):not(.future)'),
    );
    return elements.map((cell) => {
      const cellRect = cell.getBoundingClientRect();
      const span = cell.querySelector('span');
      const spanRect = span ? span.getBoundingClientRect() : null;
      const b = cell.querySelector('b');
      const bRect = b ? b.getBoundingClientRect() : null;
      const cellCenterX = cellRect.left + cellRect.width / 2;
      const cellCenterY = cellRect.top + cellRect.height / 2;
      const bCenterX = bRect ? bRect.left + bRect.width / 2 : null;
      const bCenterY = bRect ? bRect.top + bRect.height / 2 : null;

      return {
        hasSpan: Boolean(spanRect),
        spanLeftOffset: spanRect ? Math.abs(spanRect.left - cellRect.left) : Infinity,
        spanTopOffset: spanRect ? Math.abs(spanRect.top - cellRect.top) : Infinity,
        hasB: Boolean(bRect),
        bCenterXDiff: bCenterX !== null ? Math.abs(bCenterX - cellCenterX) : Infinity,
        bCenterYDiff: bCenterY !== null ? Math.abs(bCenterY - cellCenterY) : Infinity,
        scrollWidth: cell.scrollWidth,
        clientWidth: cell.clientWidth,
        scrollHeight: cell.scrollHeight,
        clientHeight: cell.clientHeight,
      };
    });
  });

  expect(cells.length).toBeGreaterThan(0);
  for (const cell of cells) {
    expect(cell.hasSpan).toBe(true);
    expect(cell.spanLeftOffset).toBeLessThanOrEqual(20);
    expect(cell.spanTopOffset).toBeLessThanOrEqual(20);
    expect(cell.hasB).toBe(true);
    expect(cell.bCenterXDiff).toBeLessThanOrEqual(2);
    expect(cell.bCenterYDiff).toBeLessThanOrEqual(2);
    expect(cell.scrollWidth).toBeLessThanOrEqual(cell.clientWidth);
    expect(cell.scrollHeight).toBeLessThanOrEqual(cell.clientHeight);
  }
}

test('calendar renders circular orbs and no overflow at 14 s', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'calendar', 14000);
  const circleResult = await circularity(frame);
  expect(circleResult.failures.length).toBe(0);
  test.info().annotations.push({
    type: 'circular-orbs',
    description: `count: ${circleResult.count}`,
  });

  const overflow = await noOverflow(frame);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);

  const clickResult = await studioClickDoesNotAdvance(page, frame);
  expect(clickResult.before).toBe(clickResult.after);
});

test('day cells keep the corner date and centered count', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'calendar', 14000);
  await assertDayCellsCornerAndCenter(frame);
});

test('past days pulse once on entry and settle', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'calendar', 300);

  const pulseState = await frame.evaluate(() => {
    const anims = document.getAnimations();
    const hasPulse = anims.some((anim) => {
      const cssAnim = anim as CSSAnimation;
      if (cssAnim.animationName !== 'calendar-entry-pulse') return false;
      const target = (cssAnim.effect as KeyframeEffect)?.target as HTMLElement | null;
      return target?.classList.contains('past') ?? false;
    });

    const pastDay = document.querySelector<HTMLElement>('.day.past');
    const iterationCount = pastDay
      ? window.getComputedStyle(pastDay).animationIterationCount
      : null;

    return { hasPulse, iterationCount };
  });

  expect(pulseState.hasPulse).toBe(true);
  expect(pulseState.iterationCount).toBe('1');

  const freshPage = await page.context().newPage();
  try {
    const { frame: freshFrame } = await openStudioScene(freshPage, 'calendar', 6000);
    const { pastDayCount, timings } = await freshFrame.evaluate(() => {
      const anims = document.getAnimations();
      const pulseAnims = anims.filter(
        (anim) => (anim as CSSAnimation).animationName === 'calendar-entry-pulse',
      );
      const pastDays = document.querySelectorAll('.day.past');
      const timings = pulseAnims.map((anim) => {
        const computed = anim.effect ? anim.effect.getComputedTiming() : null;
        return {
          endTime: typeof computed?.endTime === 'number' ? computed.endTime : Number(computed?.endTime ?? 0),
          currentTime: typeof anim.currentTime === 'number' ? anim.currentTime : Number(anim.currentTime ?? 0),
        };
      });
      return {
        pastDayCount: pastDays.length,
        timings,
      };
    });

    expect(timings.length).toBe(pastDayCount);
    expect(timings.length).toBeGreaterThan(0);
    for (const timing of timings) {
      expect(timing.endTime).toBeLessThanOrEqual(timing.currentTime);
    }
  } finally {
    await freshPage.close();
  }
});

test('reduced motion renders the calendar still with no pulse', async ({ page }) => {
  const { frame, still } = await reducedMotionScene(page, 'calendar');
  expect(still).toBe(true);

  const animationNames = await frame.evaluate(() => {
    const pastDays = Array.from(document.querySelectorAll<HTMLElement>('.day.past'));
    return pastDays.map((el) => window.getComputedStyle(el).animationName);
  });

  expect(animationNames.length).toBeGreaterThan(0);
  for (const name of animationNames) {
    expect(name).toBe('none');
  }
});

test('the same holds at 3840', async ({ page }) => {
  await page.setViewportSize({ width: 3840, height: 2160 });
  const { frame } = await openStudioScene(page, 'calendar', 14000);
  await assertDayCellsCornerAndCenter(frame);
});
