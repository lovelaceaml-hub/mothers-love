import { expect, test, type Frame } from '@playwright/test';

import { loadRenderer } from './helpers';

// Anthony, September 19: when the TV changes scene the bubbles were already
// there. They now come in one at a time, at uneven moments, and every bubble
// has settled within about 3.5 seconds of the change.
const BUBBLE_SCENES = [
  { id: 2, name: 'Garden' },
  { id: 4, name: 'Featured Expressions' },
  { id: 8, name: 'We Are Peacemakers' },
  { id: 9, name: 'Peace in Practice' },
  { id: 10, name: 'Expression Orbit' },
  { id: 1, name: 'Welcome' },
];

const SETTLED_BY_SECONDS = 3.6;

async function bubbleStates(frame: Frame, sceneId: number) {
  return frame.evaluate((id) => {
    const scene = document.querySelector(`#stage > .scene[data-scene="${id}"]`);
    return [...(scene?.querySelectorAll('.orb-slot') ?? [])].map((slot) => {
      const inner = slot.querySelector('.orb-life');
      return {
        arriving: slot.hasAttribute('data-arriving'),
        opacity: inner ? Number(getComputedStyle(inner).opacity) : 1,
      };
    });
  }, sceneId);
}

test('each bubble scene brings its bubbles in one at a time after a scene change', async ({ page }) => {
  const frame = await loadRenderer(page);

  for (const scene of BUBBLE_SCENES) {
    await frame.evaluate((id) => (window as any).colorPolishRuntime.setScene(id), scene.id);
    const start = await frame.evaluate(() => (window as any).colorPolishRuntime.getState());
    expect(start.scene, scene.name).toBe(scene.id);
    expect(start.bubbleEntrance, `${scene.name} starts an entrance`).not.toBeNull();

    const atChange = await bubbleStates(frame, scene.id);
    expect(atChange.length, `${scene.name} has bubbles`).toBeGreaterThan(0);
    expect(atChange.every((bubble) => bubble.arriving && bubble.opacity === 0), `${scene.name} bubbles hidden at the change`).toBe(true);

    const delays: number[] = start.bubbleEntrance.delays;
    expect(Math.min(...delays)).toBeGreaterThanOrEqual(0.5);
    expect(start.bubbleEntrance.end).toBeLessThanOrEqual(SETTLED_BY_SECONDS);
    expect(new Set(delays.map((delay) => delay.toFixed(3))).size, `${scene.name} bubbles start at different moments`).toBe(delays.length);

    const firstSeen: Array<number | null> = atChange.map(() => null);
    for (let ms = 100; ms <= 4000; ms += 100) {
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(100));
      const states = await bubbleStates(frame, scene.id);
      states.forEach((bubble, index) => {
        if (firstSeen[index] === null && bubble.opacity > 0.5) firstSeen[index] = ms;
      });
    }

    expect(firstSeen.every((ms) => ms !== null), `${scene.name} every bubble shows`).toBe(true);
    if (firstSeen.length > 1) {
      expect(Math.max(...(firstSeen as number[])) - Math.min(...(firstSeen as number[])), `${scene.name} bubbles are spread out`).toBeGreaterThanOrEqual(700);
    }

    const settled = await bubbleStates(frame, scene.id);
    expect(settled.every((bubble) => !bubble.arriving && bubble.opacity === 1), `${scene.name} bubbles settled`).toBe(true);
    const end = await frame.evaluate(() => (window as any).colorPolishRuntime.getState());
    expect(end.bubbleEntrance).toBeNull();
  }
});

test('a still display changes scene with every bubble already in place', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const frame = await loadRenderer(page);
  expect(await frame.evaluate(() => (window as any).colorPolishRuntime.getState().still)).toBe(true);

  await frame.evaluate(() => (window as any).colorPolishRuntime.setScene(2));
  const state = await frame.evaluate(() => (window as any).colorPolishRuntime.getState());
  expect(state.scene).toBe(2);
  expect(state.bubbleEntrance).toBeNull();
  const bubbles = await bubbleStates(frame, 2);
  expect(bubbles.length).toBeGreaterThan(0);
  expect(bubbles.every((bubble) => !bubble.arriving && bubble.opacity === 1)).toBe(true);
});
