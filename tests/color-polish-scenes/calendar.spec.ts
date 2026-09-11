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
  expect(pulseState.iterationCount).toContain('1');

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

test('calendar wave, today halo or ring, and fx canvas render at 6000 ms', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'calendar', 6000);

  const state = await frame.evaluate(() => {
    const pastDay = document.querySelector<HTMLElement>('.day.past');
    const todayDay = document.querySelector<HTMLElement>('.day.today');
    const fxCanvas = document.querySelector<HTMLCanvasElement>('canvas.calendar-fx');

    return {
      hasPastDay: Boolean(pastDay),
      pastAnim: pastDay ? window.getComputedStyle(pastDay).animationName : '',
      hasTodayDay: Boolean(todayDay),
      todayAnim: todayDay ? window.getComputedStyle(todayDay).animationName : '',
      todayAfterAnim: todayDay ? window.getComputedStyle(todayDay, '::after').animationName : '',
      hasFxCanvas: Boolean(fxCanvas),
      fxPointerEvents: fxCanvas ? window.getComputedStyle(fxCanvas).pointerEvents : '',
    };
  });

  expect(state.hasPastDay).toBe(true);
  expect(state.pastAnim).toContain('calendarWave');
  if (state.hasTodayDay) {
    const matchesToday =
      state.todayAnim.includes('calendarTodayRing') ||
      state.todayAnim.includes('calendar-today-ring') ||
      state.todayAnim.includes('calendarTodayHalo') ||
      state.todayAnim.includes('calendar-today-halo') ||
      state.todayAfterAnim.includes('calendarTodayHalo') ||
      state.todayAfterAnim.includes('calendar-today-halo');
    expect(matchesToday).toBe(true);
  }
  expect(state.hasFxCanvas).toBe(true);
  expect(state.fxPointerEvents).toBe('none');
});

test('fx canvas is not blank over the month panel at 6000 ms', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'calendar', 6000);

  const hasNonBlankPixel = await frame.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas.calendar-fx');
    const monthPanel = document.querySelector<HTMLElement>('.calendar-month');
    if (!canvas || !monthPanel) return false;

    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    const root = document.querySelector<HTMLElement>('#stage .scene[data-scene="5"]');
    const rootRect = root ? root.getBoundingClientRect() : { left: 0, top: 0, width: 1812 };
    const scale = rootRect.width > 0 ? rootRect.width / 1812 : 1;

    const mRect = monthPanel.getBoundingClientRect();
    const mx = Math.max(0, Math.floor((mRect.left - rootRect.left) / scale));
    const my = Math.max(0, Math.floor((mRect.top - rootRect.top) / scale));
    const mw = Math.min(canvas.width - mx, Math.floor(mRect.width / scale));
    const mh = Math.min(canvas.height - my, Math.floor(mRect.height / scale));

    const imgData = ctx.getImageData(mx, my, mw, mh);
    const data = imgData.data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) {
        return true;
      }
    }
    return false;
  });

  expect(hasNonBlankPixel).toBe(true);
});

test('Studio day click selects a day and the scene still does not advance', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'calendar', 6000);

  const beforeScene = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().scene);
  expect(beforeScene).toBe(5);

  const pastDay = frame.locator('.day.past[data-day]').first();
  const targetDay = await pastDay.getAttribute('data-day');
  expect(targetDay).toBeTruthy();
  await pastDay.click();
  await page.waitForTimeout(300);

  const afterState = await frame.evaluate(() => {
    const runtime = (window as any).colorPolishRuntime;
    const todayEl = document.querySelector<HTMLElement>('.day.today');
    return {
      scene: runtime.getState().scene,
      selectedDay: todayEl?.dataset.day ?? null,
    };
  });

  expect(afterState.scene).toBe(5);
  expect(afterState.selectedDay).toBe(targetDay);
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

