import { expect, test } from '@playwright/test';
import {
  buildActiveDisplayFixture,
  cardShape,
  circularity,
  loadRenderer,
  noOverflow,
  openStudioScene,
  readyStudioFrame,
  recognition,
  reducedMotionScene,
  SCENE_IDS,
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

test('readyStudioFrame accepts the arrival scene while Studio selects welcome', async ({ page }) => {
  const arrivalFrame = await loadRenderer(page, { scene: SCENE_IDS.arrival });
  const readyFrame = await readyStudioFrame(page, SCENE_IDS.welcome, SCENE_IDS.arrival);
  expect(readyFrame).toBe(arrivalFrame);
  expect(await readyFrame.evaluate(() => (window as any).colorPolishRuntime.getState().scene)).toBe(SCENE_IDS.arrival);
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

type BubbleCircle = { id: string; life: string; cx: number; cy: number; radius: number; opacity: number };

/**
 * What a viewer would see as two recognition bubbles covering each other, in
 * stage px. The bubbles are circles, so their square bounding rectangles may
 * cross at the corners while the circles stay well apart: circles are judged,
 * not rectangles. Two settled bubbles may not touch at all. A bubble that is
 * flying in or out is motion and may pass a neighbour's rim, but the word
 * areas (the inner 80 percent of each circle) may never meet.
 */
function bubbleOverlapProblems(bubbles: BubbleCircle[], when: string): string[] {
  const problems: string[] = [];
  const seen = bubbles.filter((b) => b.opacity > 0.3);
  for (let i = 0; i < seen.length; i++) {
    for (let j = i + 1; j < seen.length; j++) {
      const a = seen[i];
      const b = seen[j];
      const gap = Math.hypot(a.cx - b.cx, a.cy - b.cy);
      const settled = a.life === 'steady' && b.life === 'steady' && a.opacity > 0.9 && b.opacity > 0.9;
      if (settled && a.radius + b.radius - gap > 0.5) {
        problems.push(`${when}: settled ${a.id} and ${b.id} overlap by ${(a.radius + b.radius - gap).toFixed(1)} px`);
      }
      if (0.8 * (a.radius + b.radius) - gap > 0.5) {
        problems.push(`${when}: the words of ${a.id} and ${b.id} cover each other by ${(0.8 * (a.radius + b.radius) - gap).toFixed(1)} px`);
      }
    }
  }
  return problems;
}

test('the bubble overlap rule catches touching circles and ignores rectangle corners', () => {
  const at = (id: string, cx: number, cy: number, radius: number, life = 'steady', opacity = 1): BubbleCircle => ({ id, life, cx, cy, radius, opacity });
  // Rectangles cross by 60 px each way at the corner, the circles are about 80 px apart: fine.
  expect(bubbleOverlapProblems([at('a', 200, 200, 200), at('b', 540, 540, 200)], 't')).toHaveLength(0);
  // Settled circles that touch are a defect.
  expect(bubbleOverlapProblems([at('a', 200, 200, 200), at('b', 480, 480, 200)], 't').join(' ')).toContain('settled a and b overlap');
  // A bubble flying in may cross a rim, but not the words.
  expect(bubbleOverlapProblems([at('a', 200, 200, 200), at('b', 480, 480, 200, 'entering', 0.6)], 't')).toHaveLength(0);
  expect(bubbleOverlapProblems([at('a', 200, 200, 200), at('b', 400, 400, 200, 'entering', 0.6)], 't').join(' ')).toContain('words of a and b');
  // A bubble that has all but faded out is not judged.
  expect(bubbleOverlapProblems([at('a', 200, 200, 200), at('b', 210, 210, 200, 'leaving', 0.1)], 't')).toHaveLength(0);
});

test('with the mostly-long fixture, no two bubbles in scene 1 or scene 9 cover each other across a 60 second showing', async ({ page }) => {
  test.setTimeout(180000);
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
    // loadRenderer finishes the scene's entrance transition and freezes the
    // renderer clock, so every sample below is an exact, repeatable frame.
    const frame = await loadRenderer(page, { scene: sceneId, fixture: mostlyLongFixture });
    const sceneCount = await frame.evaluate(() => document.querySelectorAll('#stage .scene').length);
    expect(sceneCount).toBe(1);

    const problems: string[] = [];
    let settledPairs = 0;
    for (let step = 0; step < 120; step++) {
      const sample = await frame.evaluate((id) => {
        const runtime = (window as any).colorPolishRuntime;
        runtime.step(500);
        const state = runtime.getState();
        const scene = document.querySelector<HTMLElement>(`#stage .scene[data-scene="${id}"]`);
        if (!scene) return { scene: state.scene as number, age: state.sceneAge as number, bubbles: [] };
        const sceneBox = scene.getBoundingClientRect();
        const toStage = 1812 / sceneBox.width;
        const actors = (0, eval)('V').actors as Array<{ key: string; life: string }>;
        const slots = Array.from(scene.querySelectorAll<HTMLElement>('.orb-slot')).filter(
          (slot) => !slot.closest('[data-welcome-measure]'),
        );
        return {
          scene: state.scene as number,
          age: state.sceneAge as number,
          bubbles: slots.map((slot) => {
            // Measured from the drawn box, so a bubble in flight is judged
            // where the viewer sees it, not where it will come to rest.
            const box = slot.getBoundingClientRect();
            return {
              id: slot.id,
              life: actors.find((actor) => actor.key === slot.id)?.life ?? '',
              cx: (box.left + box.width / 2 - sceneBox.left) * toStage,
              cy: (box.top + box.height / 2 - sceneBox.top) * toStage,
              radius: (box.width / 2) * toStage,
              squareness: Math.abs(box.width - box.height),
              opacity: parseFloat(getComputedStyle(slot).opacity),
            };
          }),
        };
      }, sceneId);

      expect(sample.scene, `scene ${sceneId} stays on screen for the showing`).toBe(sceneId);
      const when = `scene ${sceneId} at ${sample.age.toFixed(1)} s`;
      for (const bubble of sample.bubbles) {
        expect(bubble.squareness, `${when}: ${bubble.id} is drawn as a circle`).toBeLessThan(1.5);
      }
      settledPairs += sample.bubbles.filter((b) => b.life === 'steady' && b.opacity > 0.9).length >= 2 ? 1 : 0;
      problems.push(...bubbleOverlapProblems(sample.bubbles, when));
    }

    // The check compared something: both scenes show at least two settled
    // bubbles side by side for most of the showing.
    expect(settledPairs, `scene ${sceneId} samples with two or more settled bubbles`).toBeGreaterThan(60);
    expect(problems, problems.slice(0, 5).join('\n')).toHaveLength(0);
  };

  await checkNoOverlap(1);
  await checkNoOverlap(9);
});
