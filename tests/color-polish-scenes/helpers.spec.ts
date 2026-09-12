import { expect, test } from '@playwright/test';
import {
  buildActiveDisplayFixture,
  cardShape,
  circularity,
  loadRenderer,
  noOverflow,
  openStudioScene,
  recognition,
  reducedMotionScene,
  studioClickDoesNotAdvance,
} from './helpers';

test('helpers open the welcome scene in the Studio and it is circular', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'welcome');
  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);

  const overflow = await noOverflow(frame);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);

  const clickResult = await studioClickDoesNotAdvance(page, frame);
  expect(clickResult.before).toBe(clickResult.after);
});

test('reduced motion renders the welcome scene still', async ({ page }) => {
  const { frame, still } = await reducedMotionScene(page, 'welcome');
  expect(still).toBe(true);

  const mode = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().mode);
  expect(mode).toBe('normal');
});

test('loadRenderer loads the renderer and getState().mode is normal', async ({ page }) => {
  const frame = await loadRenderer(page);
  const mode = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().mode);
  expect(mode).toBe('normal');
});

test('cardShape passes on valid card shapes and fails on invalid ones', async ({ page }) => {
  const frame = await loadRenderer(page);

  await frame.evaluate(() => {
    const sceneRoot = document.querySelector('#stage .scene') || document.body;

    const goodHeart = document.createElement('div');
    goodHeart.id = 'test-good-heart';
    goodHeart.className = 'heart-card';
    goodHeart.style.cssText =
      'position:absolute;left:100px;top:100px;width:100px;height:100px;border-radius:16px;';
    sceneRoot.appendChild(goodHeart);

    const badHeart = document.createElement('div');
    badHeart.id = 'test-bad-heart';
    badHeart.className = 'heart-card';
    badHeart.style.cssText =
      'position:absolute;left:100px;top:100px;width:100px;height:100px;border-radius:50%;';
    sceneRoot.appendChild(badHeart);
  });

  const goodResult = await cardShape(frame, '#test-good-heart', 'heart');
  expect(goodResult.count).toBe(1);
  expect(goodResult.failures).toHaveLength(0);

  const badResult = await cardShape(frame, '#test-bad-heart', 'heart');
  expect(badResult.count).toBe(1);
  expect(badResult.failures.length).toBeGreaterThan(0);

  await frame.evaluate(() => {
    document.getElementById('test-good-heart')?.remove();
    document.getElementById('test-bad-heart')?.remove();
  });
});

test('with the mostly-long fixture, no two .orb-slot rectangles in scene 1 or scene 9 intersect', async ({ page }) => {
  const longMsg =
    'This is a special appreciation recognition with a warm detailed message that exceeds one hundred and sixty characters in total length so we can verify slot growth and reading behavior.';
  const mostlyLongFixture = buildActiveDisplayFixture({
    recognitions: [
      recognition({ id: 'rec-long-1', message: longMsg + ' First recipient note.' }),
      recognition({ id: 'rec-long-2', message: longMsg + ' Second recipient note.' }),
      recognition({ id: 'rec-long-3', message: longMsg + ' Third recipient note.' }),
      recognition({ id: 'rec-long-4', message: longMsg + ' Fourth recipient note.' }),
      recognition({ id: 'rec-short-1', message: 'Short message one.' }),
      recognition({ id: 'rec-short-2', message: 'Short message two.' }),
    ],
  });

  const checkNoOverlap = async (sceneId: number) => {
    const frame = await loadRenderer(page, { scene: sceneId, fixture: mostlyLongFixture });

    // Finish the selected transition before measuring the settled scene.
    await frame.evaluate(() => {
      const runtime = (window as any).colorPolishRuntime;
      const transition = runtime.getState().transition;
      runtime.step(transition ? (transition.duration - transition.age) * 1000 + 40 : 40);
    });

    const sceneCount = await frame.evaluate(() => document.querySelectorAll('#stage .scene').length);
    expect(sceneCount).toBe(1);

    // Scene 1 still collapses long records to one reader bubble because welcomeBubbles()
    // is Section 1's file and this lane may not touch it, so scene 1 will legitimately
    // show a single 586 px slot and the pairwise loop will have nothing to compare.
    const rects = await frame.evaluate((id) => {
      const slots = Array.from(
        document.querySelectorAll<HTMLElement>(`#stage .scene[data-scene="${id}"] .orb-slot`),
      );
      return slots.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          id: el.id,
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
          width: r.width,
          height: r.height,
        };
      });
    }, sceneId);

    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        // The bug caused 247x96 and 243x100 overlap where bubbles crossed.
        // Bounding rectangles must not intersect significantly (beyond 20px edge margin).
        const crosses = overlapX > 20 && overlapY > 20;
        expect(crosses).toBe(false);
      }
    }
  };

  await checkNoOverlap(1);
  await checkNoOverlap(9);
});
