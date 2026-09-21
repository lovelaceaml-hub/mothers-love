import { expect, test, type Frame, type Page } from '@playwright/test';
import { buildActiveDisplayFixture, loadRenderer, withoutWebGL2 } from './helpers';

// Scene 9, Peace in Practice: the volumetric heart and the heavenly ribbons.
//
// Anthony, 2026-09-20: the rose solid and its thick gold hoops are replaced by
// the approved three dimensional study (Mothers_Love_Heavenly_Ribbons_3D.html):
// a sculpted rose heart with sheer pearl and champagne ribbons, drawn with
// WebGL 2 by public/color-polish/scenes/peace-in-practice-heart3d.js.
//
// These specs check what the handoff asked of the integration, on the real
// renderer page with synthetic records:
//   - the sculpture is what the scene shows, in the live heart's place, its
//     ribbons keep the study's full sweep with the heading's words drawn on
//     top of their tips, and it never takes a pointer;
//   - the ribbons unfold by themselves after the scene opens, keep moving, and
//     lie over the heart in places (sheer silk in front of a solid);
//   - motion off holds it still, whole and unrolled;
//   - leaving the scene gives the graphics context back, coming back builds
//     exactly one heart, and a redraw in place keeps the same one;
//   - a lost context, or no WebGL 2 at all, shows the Canvas 2D heart instead.
//
// The default test browser has no WebGL 2 at all (which is why the rest of the
// suite sees the Canvas 2D heart). This file asks for the software renderer,
// which is also a fair stand in for a display with no graphics acceleration.
test.use({ launchOptions: { args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } });

const record = (n: number) => ({
  id: `pip3d-${n}`,
  recipient: `Kind Friend ${n}`,
  message: `Thank you for the kind welcome you gave me today, number ${n}.`,
  expressionIds: [2],
  createdAt: '2026-09-10T17:00:00Z',
  firstPublishedAt: '2026-09-10T17:00:00Z',
  expiresAt: '2026-09-17T17:00:00Z',
  version: 1,
  status: 'published',
  featured: false,
});
const fixture = buildActiveDisplayFixture({ recognitions: [1, 2, 3, 4, 5, 6].map(record) });

// Reading pixels or the error flag back makes the software driver log a
// performance note. That is this file's doing, not the scene's.
const ours = (text: string) => !/GL Driver Message \(OpenGL, Performance/.test(text);

const step = (frame: Frame, ms: number) => frame.evaluate((value) => (window as any).colorPolishRuntime.step(value), ms);

async function hasWebGL2(page: Page) {
  return await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
}

async function heartState(frame: Frame) {
  return await frame.evaluate(() => {
    const held = (window as any).pipHeartRenderer;
    return {
      technique: held?.technique ?? null,
      stats: held?.stats ?? null,
      glError: held?.technique === 'webgl2-volumetric' ? held.glError : 0,
      sculptures: document.querySelectorAll('canvas.pip-heart3d').length,
      solids: document.querySelectorAll('canvas.pip-heart').length,
    };
  });
}

// The sculpture as it is painted right now: drawn afresh and read back in the
// same turn, because a WebGL canvas only keeps its picture until it is shown.
async function picture(frame: Frame) {
  return await frame.evaluate(() => {
    const held = (window as any).pipHeartRenderer;
    const canvas = document.querySelector<HTMLCanvasElement>('#heart-host canvas.pip-heart3d')!;
    held.draw(0, true);
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext('2d')!;
    context.drawImage(canvas, 0, 0);
    const data = context.getImageData(0, 0, copy.width, copy.height).data;
    const at = (x: number, y: number) => { const i = (Math.round(y) * copy.width + Math.round(x)) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };
    let painted = 0, rose = 0, silkOnRose = 0, silk = 0, sum = 0;
    let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity;
    // The heart's own place on the canvas: a box about its centre, well inside the solid.
    const tv = document.getElementById('tv')!.getBoundingClientRect().width / 1920;
    const box = canvas.getBoundingClientRect();
    const k = canvas.width / (box.width / tv);
    const cx = 360 * k, cy = 313.5 * k, reach = 60 * k;
    for (let y = 0; y < copy.height; y++) for (let x = 0; x < copy.width; x++) {
      const i = (y * copy.width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      sum = (sum * 31 + r + g * 3 + a * 7) >>> 0;
      if (a <= 24) continue;
      painted++;
      // Silk: more solid than the soft glow behind the heart ever is, not rose, and
      // counted only beside the heart, whose own gloss is as pale as silk.
      if (a > 150 && g > r * 0.7 && Math.abs(x - cx) > 145 * k) silk++;
      if (y < top) top = y; if (y > bottom) bottom = y; if (x < left) left = x; if (x > right) right = x;
      if (Math.abs(x - cx) < reach && Math.abs(y - cy) < reach && a > 235) {
        // Rose: red well above green. Silk laid over rose lifts the green toward the red.
        if (g < r * 0.62 && b < r * 0.9) rose++; else if (g > r * 0.7 && r > 120) silkOnRose++;
      }
    }
    return {
      width: copy.width, height: copy.height, painted, rose, silkOnRose, silk, sum, centre: at(cx, cy),
      corners: [at(1, 1), at(copy.width - 2, 1), at(1, copy.height - 2), at(copy.width - 2, copy.height - 2)],
      // The painted box in stage pixels (the stage is 1812 x 636).
      stage: (() => {
        const stage = document.getElementById('stage')!.getBoundingClientRect();
        const px = (box.width / tv) / copy.width;
        const x0 = (box.left - stage.left) / tv, y0 = (box.top - stage.top) / tv;
        return { top: y0 + top * px, bottom: y0 + bottom * px, left: x0 + left * px, right: x0 + right * px };
      })(),
    };
  });
}

test('the scene shows the sculpted heart and its ribbons, in the live heart\'s place, with the words above drawn on top', async ({ page }) => {
  const frame = await loadRenderer(page, { fixture, scene: 9, ms: 6000 });
  test.skip(!(await hasWebGL2(page)), 'this browser has no WebGL 2, even in software');
  const state = await heartState(frame);
  expect(state.technique).toBe('webgl2-volumetric');
  expect(state.sculptures, 'one sculpture canvas').toBe(1);
  expect(state.solids, 'the Canvas 2D solid and its gold hoops must be gone from the live scene').toBe(0);
  expect(state.glError, 'WebGL reported an error').toBe(0);
  expect(state.stats.triangles, 'real meshes, not a flat picture').toBeGreaterThan(50000);

  const layout = await frame.evaluate(() => {
    const host = document.getElementById('heart-host')!;
    const rig = document.querySelector<HTMLElement>('#heart-host .pip-heart3d-rig')!;
    const tv = document.getElementById('tv')!.getBoundingClientRect().width / 1920;
    const stage = document.getElementById('stage')!.getBoundingClientRect();
    const words = document.querySelector<HTMLElement>('.scene[data-scene="9"] .subheading')!.getBoundingClientRect();
    return {
      host: { left: host.style.left, top: host.style.top, width: host.style.width, height: host.style.height },
      pointer: getComputedStyle(rig).pointerEvents,
      hostFilter: getComputedStyle(host).filter,
      wordsBottom: (words.bottom - stage.top) / tv,
      wordsLayer: Number(getComputedStyle(document.querySelector<HTMLElement>('.scene[data-scene="9"] .scene-copy')!).zIndex),
      heartLayer: Number(getComputedStyle(host).zIndex),
      studio: document.querySelectorAll('#heart-host input, #heart-host button, #heart-host select, #heart-host dialog').length,
    };
  });
  // The heart keeps its place and size from the live scene.
  expect(layout.host).toEqual({ left: '198px', top: '232px', width: '390px', height: '363px' });
  expect(layout.pointer, 'a click on the TV must still reach the scene').toBe('none');
  expect(layout.hostFilter).toBe('none');
  expect(layout.studio, 'none of the study\'s controls belong on the TV').toBe(0);

  const shot = await picture(frame);
  // A rose, opaque heart at the centre; a clear canvas at the corners.
  expect(shot.centre[3]).toBeGreaterThan(250);
  expect(shot.centre[0], 'the centre of the heart should be rose').toBeGreaterThan(shot.centre[1] * 1.5);
  for (const corner of shot.corners) expect(corner[3], 'the canvas corners must be clear').toBeLessThan(4);
  expect(shot.rose, 'the solid heart should fill its own middle').toBeGreaterThan(1500);
  // The ribbons keep the study's full sweep (Anthony, 2026-09-20: "too bunched
  // together"), so they reach well above and below the heart, and their tips
  // may rise behind the heading. The words are drawn on top of them, the solid
  // heart itself stays under the subheading, and the silk stays left of the
  // bubbles' ground.
  expect(shot.stage.bottom - shot.stage.top, 'the ribbons should sweep far above and below the heart').toBeGreaterThan(420);
  expect(layout.wordsLayer, 'the heading must be drawn on top of the ribbons').toBeGreaterThan(layout.heartLayer);
  expect(413.5 - 1.6 * 90, 'the top of the solid heart must stay under the subheading').toBeGreaterThan(layout.wordsBottom);
  expect(shot.stage.left).toBeGreaterThan(0);
  expect(shot.stage.right).toBeLessThan(790);
});

test('the ribbons unfold by themselves, keep flowing, and lie over the heart in places', async ({ page }) => {
  test.setTimeout(120000);
  const frame = await loadRenderer(page, { fixture, scene: 9, ms: 60 });
  test.skip(!(await hasWebGL2(page)), 'this browser has no WebGL 2, even in software');
  const opening = await picture(frame);
  await step(frame, 5000);
  const unrolled = await picture(frame);
  // Nothing was clicked or dragged: the silk unrolled on the scene's own clock.
  expect(unrolled.silk, 'the ribbons should have unrolled').toBeGreaterThan(opening.silk * 3 + 3000);
  const age = (await heartState(frame)).stats.age;
  expect(age).toBeGreaterThan(4.5);

  // It keeps moving, and at some moment sheer silk lies across the solid heart.
  let silkOnRose = unrolled.silkOnRose;
  let last = unrolled.sum;
  let changes = 0;
  for (let i = 0; i < 6; i++) {
    await step(frame, 2500);
    const now = await picture(frame);
    if (now.sum !== last) changes++;
    last = now.sum;
    silkOnRose = Math.max(silkOnRose, now.silkOnRose);
    // The heart is never hidden by its ribbons: they are sheer.
    expect(now.rose + now.silkOnRose, 'the heart must stay visible').toBeGreaterThan(1500);
  }
  expect(changes, 'every sampled moment should differ from the one before').toBe(6);
  expect(silkOnRose, 'a ribbon should pass in front of the heart').toBeGreaterThan(300);
});

test('with motion off the sculpture holds still, whole and unrolled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const frame = await loadRenderer(page, { fixture, scene: 9 });
  test.skip(!(await hasWebGL2(page)), 'this browser has no WebGL 2, even in software');
  expect(await frame.evaluate(() => (window as any).colorPolishRuntime.getState().still)).toBe(true);
  const before = await picture(frame);
  const paints = (await heartState(frame)).stats.paints;
  await step(frame, 4000);
  const state = await heartState(frame);
  expect(state.technique).toBe('webgl2-volumetric');
  expect(state.stats.paints, 'the core must not redraw the heart while motion is off').toBe(paints);
  const after = await picture(frame);
  expect(after.sum, 'the still picture must not change').toBe(before.sum);
  // Whole: the ribbons are already unrolled in the still picture.
  expect(before.painted).toBeGreaterThan(before.rose * 2);
});

test('leaving the scene gives the graphics context back, and coming back builds exactly one heart', async ({ page }) => {
  test.setTimeout(120000);
  const notes: string[] = [];
  page.on('console', (message) => { if (['error', 'warning'].includes(message.type()) && ours(message.text())) notes.push(message.text()); });
  page.on('pageerror', (error) => notes.push(error.message));
  const frame = await loadRenderer(page, { fixture, scene: 9, ms: 3000 });
  test.skip(!(await hasWebGL2(page)), 'this browser has no WebGL 2, even in software');
  for (let round = 0; round < 4; round++) {
    const context = await frame.evaluateHandle(() => document.querySelector<HTMLCanvasElement>('canvas.pip-heart3d')!.getContext('webgl2'));
    await frame.evaluate((id) => (window as any).colorPolishRuntime.setScene(id), round % 2 ? 1 : 7);
    await step(frame, 1600);
    await page.waitForTimeout(60);
    const away = await heartState(frame);
    expect(away.sculptures, 'no sculpture canvas may outlive the scene').toBe(0);
    expect(away.technique, 'the heart must be let go').toBeNull();
    expect(await context.evaluate((gl) => (gl as WebGL2RenderingContext).isContextLost()), 'the graphics context must be given back').toBe(true);

    await frame.evaluate(() => (window as any).colorPolishRuntime.setScene(9));
    await step(frame, 1600);
    await page.waitForTimeout(60);
    const back = await heartState(frame);
    expect(back.technique).toBe('webgl2-volumetric');
    expect(back.sculptures, 'exactly one sculpture after coming back').toBe(1);
    expect(back.solids).toBe(0);
    expect(back.glError).toBe(0);
    expect(back.stats.age, 'a new showing unfolds again from the start').toBeLessThan(2);
  }
  expect(notes, 'the browser console must stay clean').toEqual([]);
});

test('a redraw in place keeps the same heart, and its motion does not start over', async ({ page }) => {
  const frame = await loadRenderer(page, { fixture, scene: 9, ms: 8000 });
  test.skip(!(await hasWebGL2(page)), 'this browser has no WebGL 2, even in software');
  const result = await frame.evaluate(async () => {
    const before = (window as any).pipHeartRenderer;
    const age = before.stats.age;
    // What the core does when a new recognition reaches the scene it is showing.
    (window as any).renderNow(9, { keepAge: true });
    await new Promise((resolve) => setTimeout(resolve, 40));
    const after = (window as any).pipHeartRenderer;
    return { same: before === after, alive: after?.solid?.alive === true, age, ageAfter: after.stats.age, sculptures: document.querySelectorAll('canvas.pip-heart3d').length };
  });
  expect(result.same, 'the same heart must be kept').toBe(true);
  expect(result.alive).toBe(true);
  expect(result.sculptures).toBe(1);
  expect(result.ageAfter, 'the ribbons must not unfold again').toBeGreaterThanOrEqual(result.age);
});

test('a lost graphics context puts the Canvas 2D heart in its place', async ({ page }) => {
  const frame = await loadRenderer(page, { fixture, scene: 9, ms: 3000 });
  test.skip(!(await hasWebGL2(page)), 'this browser has no WebGL 2, even in software');
  await frame.evaluate(() => {
    const gl = document.querySelector<HTMLCanvasElement>('canvas.pip-heart3d')!.getContext('webgl2')!;
    gl.getExtension('WEBGL_lose_context')!.loseContext();
  });
  await expect.poll(async () => (await heartState(frame)).technique).toBe('canvas2d-per-pixel');
  const state = await heartState(frame);
  expect(state.sculptures).toBe(0);
  expect(state.solids).toBe(1);
  // And the scene carries on: the core keeps drawing the heart it now has.
  await step(frame, 2000);
  expect((await heartState(frame)).technique).toBe('canvas2d-per-pixel');
});

test('without WebGL 2 the scene shows the Canvas 2D heart, with nothing broken', async ({ page }) => {
  const notes: string[] = [];
  page.on('console', (message) => { if (['error', 'warning'].includes(message.type()) && ours(message.text())) notes.push(message.text()); });
  page.on('pageerror', (error) => notes.push(error.message));
  await withoutWebGL2(page);
  const frame = await loadRenderer(page, { fixture, scene: 9, ms: 3000 });
  const state = await heartState(frame);
  expect(state.technique).toBe('canvas2d-per-pixel');
  expect(state.sculptures).toBe(0);
  expect(state.solids).toBe(1);
  expect(notes).toEqual([]);
});
