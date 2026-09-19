import { expect, test, type Frame, type Page } from '@playwright/test';
import { buildActiveDisplayFixture, circularity, loadRenderer } from './helpers';

// Scene 9, Peace in Practice.
//
// Plan 17 Lane 3 restored this scene to what the live TV shows today (Plan 12
// production, commit b7d92a0). Plan 17 Lane 10 adds the two changes Anthony
// asked for after watching the preview on the church TV on 2026-09-19:
//   1. One bubble is reserved for the very long recognitions. A very long
//      recognition only ever appears there; the other bubbles only take
//      messages that fit them whole; several very long ones take turns in it;
//      and the reserved bubble is never empty.
//   2. The big turning heart is a real solid with thickness, not a flat image
//      that thinned to a card edge as it span.
//
// These specs drive the renderer through loadRenderer's /probe harness rather
// than openStudioScene's /admin/login sign-in flow, which fails to reach
// /admin in this worktree's dev server for every color-polish scene spec, not
// only this one. That is a pre-existing environment issue outside this lane's
// allowlist. loadRenderer exercises the same renderer code and DOM.

const SCENE = '#stage .scene[data-scene="9"]';

// Plain ASCII, so one character is one grapheme and the counts below are the
// grapheme counts Intl.Segmenter reports.
const FILLER =
  'Thank you for the steady kindness you show to everyone who walks through our doors, '
  + 'for the patience you keep when the day is long, and for the quiet encouragement that '
  + 'helps every one of us begin again with hope and gladness in our hearts. ';

function message(graphemes: number) {
  let text = '';
  while (text.length < graphemes) text += FILLER;
  return text.slice(0, graphemes);
}

function record(overrides: {
  id: string;
  recipient: string;
  message: string;
  expressionIds?: number[];
}) {
  return {
    id: overrides.id,
    recipient: overrides.recipient,
    message: overrides.message,
    expressionIds: overrides.expressionIds ?? [2],
    createdAt: '2026-09-10T17:00:00Z',
    firstPublishedAt: '2026-09-10T17:00:00Z',
    expiresAt: '2026-09-17T17:00:00Z',
    version: 1,
    status: 'published',
    featured: false,
  };
}

const short = (n: number, extra: Partial<{ expressionIds: number[] }> = {}) =>
  record({
    id: `pip-short-${n}`,
    recipient: `Short Friend ${n}`,
    message: `Thank you for the kind welcome you gave me today, number ${n}.`,
    ...extra,
  });

// Pool A: every record fits a regular bubble whole.
const allShortFixture = buildActiveDisplayFixture({
  recognitions: [1, 2, 3, 4, 5, 6].map((n) => short(n)),
});

// Pool B: three short records plus one 250, one 400 and one 500 grapheme
// message, which is the longest a recognition may be.
const mixedFixture = buildActiveDisplayFixture({
  recognitions: [
    short(1),
    short(2),
    short(3),
    record({ id: 'pip-long-250', recipient: 'Long Friend A', message: message(250), expressionIds: [4] }),
    record({ id: 'pip-long-400', recipient: 'Long Friend B', message: message(400), expressionIds: [5] }),
    record({ id: 'pip-long-500', recipient: 'Long Friend C', message: message(500), expressionIds: [6] }),
  ],
});

// Pool C: nothing but very long records.
const threeLongFixture = buildActiveDisplayFixture({
  recognitions: [
    record({ id: 'pip-only-1', recipient: 'Only Long One', message: message(320), expressionIds: [1] }),
    record({ id: 'pip-only-2', recipient: 'Only Long Two', message: message(430), expressionIds: [2] }),
    record({ id: 'pip-only-3', recipient: 'Only Long Three', message: message(500), expressionIds: [3] }),
  ],
});

// Pool D: the hardest record the product allows, an 80 grapheme name, all nine
// expressions and a 500 grapheme message.
const worstCaseFixture = buildActiveDisplayFixture({
  recognitions: [
    record({
      id: 'pip-worst',
      recipient: 'Bartholomew Fitzwilliam Montgomery Abernathy Cunningham Featherstonehaugh Junior',
      message: message(500),
      expressionIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    }),
    short(1),
    short(2),
  ],
});

type Bubble = {
  id: string;
  x: number;
  y: number;
  d: number;
  large: boolean;
  pages: number;
  pageLengths: number[];
  fontPx: number;
  text: string;
};

async function bubbles(frame: Frame): Promise<Bubble[]> {
  return await frame.evaluate(() => {
    const state = (window as any).colorPolishRuntime.getState();
    return state.slots.map((slot: any) => {
      const element = document.getElementById(slot.key);
      const messageElement = element?.querySelector<HTMLElement>('.message');
      return {
        id: slot.id,
        x: slot.x,
        y: slot.y,
        d: slot.d,
        large: !!slot.large,
        pages: slot.reading?.pages.length ?? 0,
        pageLengths: (slot.reading?.pages ?? []).map((page: string) => page.length),
        fontPx: messageElement ? parseFloat(window.getComputedStyle(messageElement).fontSize) : 0,
        text: messageElement?.textContent ?? '',
      };
    });
  });
}

// The message each fixture record carries, by id, so a bubble's drawn text can
// be compared with the whole message it was given.
function messagesOf(fixture: Record<string, unknown>) {
  const map = new Map<string, string>();
  for (const entry of (fixture.recognitions as Array<{ id: string; message: string }>) ?? []) {
    map.set(entry.id, entry.message);
  }
  return map;
}

// Bounding box of the painted pixels of the heart canvas, in canvas pixels.
// Reading the canvas back is what makes the flat card case fail: a flat image
// turned ninety degrees has almost no width, a solid keeps most of it.
async function heartSilhouette(frame: Frame) {
  return await frame.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(`#heart-host canvas`);
    if (!canvas) return null;
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext('2d');
    if (!context) return null;
    context.drawImage(canvas, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let painted = 0;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (data[(y * canvas.width + x) * 4 + 3] > 16) {
          painted++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!painted) return { width: 0, height: 0, painted: 0, canvasWidth: canvas.width, drawnWidth: canvas.getBoundingClientRect().width };
    return {
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      painted,
      canvasWidth: canvas.width,
      drawnWidth: canvas.getBoundingClientRect().width,
    };
  });
}

// The heart's turn is driven by the scene clock: the renderer calls
// draw(clock * 0.55 + 6) and the drawn angle is that value times 7.5 degrees.
const angleAt = (clock: number) => clock * 0.55 * 7.5 + 45;

async function stepToAngle(frame: Frame, target: number) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const clock = await frame.evaluate(() => (window as any).colorPolishRuntime.visualState().clock);
    const delta = (((target - angleAt(clock)) % 360) + 360) % 360;
    if (delta < 0.2) break;
    await frame.evaluate((ms) => (window as any).colorPolishRuntime.step(ms), (delta / 4.125) * 1000);
  }
  const clock = await frame.evaluate(() => (window as any).colorPolishRuntime.visualState().clock);
  return ((angleAt(clock) % 360) + 360) % 360;
}

async function loadAt(page: Page, width: number, options: Parameters<typeof loadRenderer>[1]) {
  await page.setViewportSize({ width, height: Math.round((width * 9) / 16) });
  return loadRenderer(page, options);
}

test('with an all short pool the reserved bubble plus two regular bubbles are filled, and none is empty', async ({ page }) => {
  const frame = await loadRenderer(page, { fixture: allShortFixture, scene: 9, ms: 2000 });
  const drawn = await bubbles(frame);

  expect(drawn).toHaveLength(3);
  const reserved = drawn.filter((bubble) => bubble.large);
  expect(reserved).toHaveLength(1);
  // Rule 3: with no very long record in the pool the reserved bubble still
  // shows a regular one rather than sitting empty.
  expect(reserved[0].id).toBeTruthy();
  expect(reserved[0].text.length).toBeGreaterThan(0);
  const texts = messagesOf(allShortFixture);
  for (const bubble of drawn) {
    expect(bubble.pages, `${bubble.id} should fit whole`).toBe(1);
    expect(bubble.text).toBe(texts.get(bubble.id));
  }
  const ids = new Set(drawn.map((bubble) => bubble.id));
  expect(ids.size).toBe(3);
});

test('a 250, a 400 and a 500 grapheme message only ever appear in the reserved bubble', async ({ page }) => {
  const frame = await loadRenderer(page, { fixture: mixedFixture, scene: 9, ms: 2000 });
  const drawn = await bubbles(frame);
  expect(drawn.length).toBeGreaterThanOrEqual(2);

  const reserved = drawn.find((bubble) => bubble.large);
  expect(reserved, 'a reserved bubble should be drawn').toBeTruthy();
  const regular = drawn.filter((bubble) => !bubble.large);

  const veryLongIds = ['pip-long-250', 'pip-long-400', 'pip-long-500'];
  const texts = messagesOf(mixedFixture);
  // Rule 1: a very long recognition never takes one of the other bubbles.
  for (const bubble of regular) {
    expect(veryLongIds, `${bubble.id} is very long and must not be in a regular bubble`).not.toContain(bubble.id);
    expect(bubble.pages).toBe(1);
    expect(bubble.text).toBe(texts.get(bubble.id));
  }
  // The reserved bubble took a very long record, since the pool holds three.
  expect(veryLongIds).toContain(reserved!.id);
  expect(reserved!.pages).toBe(1);
  expect(reserved!.text).toBe(texts.get(reserved!.id));
});

test('a 500 grapheme message fits the reserved bubble whole, above the 18 px floor', async ({ page }) => {
  const single = buildActiveDisplayFixture({
    recognitions: [
      record({ id: 'pip-long-500', recipient: 'Long Friend C', message: message(500), expressionIds: [6] }),
      short(1),
      short(2),
    ],
  });
  const frame = await loadRenderer(page, { fixture: single, scene: 9, ms: 2000 });
  const drawn = await bubbles(frame);
  const reserved = drawn.find((bubble) => bubble.large);

  expect(reserved?.id).toBe('pip-long-500');
  expect(reserved!.pages, 'the longest message a recognition may be must fit whole').toBe(1);
  expect(reserved!.text).toBe(message(500));
  expect(reserved!.text).not.toContain('…');
  expect(reserved!.fontPx).toBeGreaterThanOrEqual(18);
  expect(reserved!.d).toBeLessThanOrEqual(552);
});

test('several very long recognitions take turns in the reserved bubble and leave the other bubbles alone', async ({ page }) => {
  test.setTimeout(90000);
  const frame = await loadRenderer(page, { fixture: threeLongFixture, scene: 9, ms: 1000 });

  const seen = new Set<string>();
  let regularEverVeryLong = false;
  for (let round = 0; round < 8; round++) {
    const drawn = await bubbles(frame);
    const reserved = drawn.find((bubble) => bubble.large);
    if (reserved) seen.add(reserved.id);
    // Every record in this pool is very long, so no regular bubble may hold one.
    if (drawn.some((bubble) => !bubble.large)) regularEverVeryLong = true;
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(20000));
  }

  expect(regularEverVeryLong, 'no regular bubble may hold a very long recognition').toBe(false);
  expect(seen.size, `the reserved bubble should show more than one of the very long records, saw ${[...seen].join(', ')}`).toBeGreaterThan(1);
});

test('the reserved bubble clears the heading, the heart artwork and the other bubbles', async ({ page }) => {
  const frame = await loadRenderer(page, { fixture: mixedFixture, scene: 9, ms: 2000 });
  const drawn = await bubbles(frame);
  const reserved = drawn.find((bubble) => bubble.large)!;
  const centreX = reserved.x + reserved.d / 2;
  const centreY = reserved.y + reserved.d / 2;

  expect(Math.round(centreX)).toBe(1500);
  expect(Math.round(centreY)).toBe(332);
  // Inside the 1812 x 636 stage.
  expect(reserved.x).toBeGreaterThanOrEqual(0);
  expect(reserved.y).toBeGreaterThanOrEqual(0);
  expect(reserved.x + reserved.d).toBeLessThanOrEqual(1812);
  expect(reserved.y + reserved.d).toBeLessThanOrEqual(636);

  // Clear of the title keep out box and of the heart host, measured as the
  // distance from the circle's centre to the nearest point of each rectangle.
  const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
  for (const box of [
    { name: 'title', x: 0, y: 10, w: 870, h: 276 },
    { name: 'heart host', x: 198, y: 232, w: 390, h: 363 },
  ]) {
    const nearestX = clamp(centreX, box.x, box.x + box.w);
    const nearestY = clamp(centreY, box.y, box.y + box.h);
    const distance = Math.hypot(centreX - nearestX, centreY - nearestY);
    expect(distance, `the reserved bubble overlaps the ${box.name}`).toBeGreaterThan(reserved.d / 2);
  }

  for (const other of drawn.filter((bubble) => !bubble.large)) {
    const distance = Math.hypot(
      centreX - (other.x + other.d / 2),
      centreY - (other.y + other.d / 2),
    );
    expect(distance, `the reserved bubble overlaps ${other.id}`).toBeGreaterThan(reserved.d / 2 + other.d / 2);
  }
});

test('the hardest record the product allows is never truncated, and any paging finishes inside the scene dwell', async ({ page }) => {
  const frame = await loadRenderer(page, { fixture: worstCaseFixture, scene: 9, ms: 2000 });
  const drawn = await bubbles(frame);
  const reserved = drawn.find((bubble) => bubble.large)!;

  expect(reserved.id).toBe('pip-worst');
  expect(reserved.fontPx).toBeGreaterThanOrEqual(18);
  // Nothing is ever dropped: the pages put back together are the whole message.
  const rebuilt = await frame.evaluate(() => {
    const state = (window as any).colorPolishRuntime.getState();
    const slot = state.slots.find((entry: any) => entry.large);
    return (slot?.reading?.pages ?? []).join('');
  });
  expect(rebuilt).toBe(message(500));

  // The dwell is read from state, never hardcoded.
  const dwell = await frame.evaluate(() => (window as any).colorPolishRuntime.visualState().dwell[9]);
  expect(dwell).toBeGreaterThan(0);
  const readingSeconds = reserved.pageLengths.reduce((total, length) => total + Math.max(9, length / 14), 0);
  expect(readingSeconds, `paging takes ${readingSeconds} s but the scene lasts ${dwell} s`).toBeLessThanOrEqual(dwell);
});

test('no message text drops below the 18 px floor, and the TV is drawn at double size on a 3840 screen', async ({ page }) => {
  const frame = await loadAt(page, 3840, { fixture: mixedFixture, scene: 9, ms: 6000 });
  const drawn = await bubbles(frame);
  expect(drawn.length).toBeGreaterThan(0);
  for (const bubble of drawn) {
    expect(bubble.fontPx, `${bubble.id} is below the floor`).toBeGreaterThanOrEqual(18);
  }
  const scale = await frame.evaluate(() => {
    const tv = document.getElementById('tv');
    return tv ? tv.getBoundingClientRect().width / 1920 : 0;
  });
  // 18 px drawn at 1920 is 36 px on a 3840 wide TV.
  expect(scale).toBeCloseTo(2, 1);
});

test('the turning heart keeps most of its width edge on at 1920 and at 3840', async ({ page }) => {
  test.setTimeout(120000);
  for (const width of [1920, 3840]) {
    const frame = await loadAt(page, width, { fixture: allShortFixture, scene: 9 });

    const faceAngle = await stepToAngle(frame, 180);
    expect(Math.abs(faceAngle - 180)).toBeLessThan(1);
    const face = await heartSilhouette(frame);
    expect(face, `no heart canvas at ${width}`).toBeTruthy();
    expect(face!.painted).toBeGreaterThan(10000);

    const edgeAngle = await stepToAngle(frame, 270);
    expect(Math.abs(edgeAngle - 270)).toBeLessThan(1);
    const edge = await heartSilhouette(frame);

    // A flat card turned edge on has a width near zero. A solid keeps its
    // thickness: this heart is 21 model units thick against 32 wide.
    expect(
      edge!.width / face!.width,
      `edge on width ${edge!.width} against face on width ${face!.width} at ${width}`,
    ).toBeGreaterThan(0.5);
    expect(edge!.height).toBeGreaterThan(face!.height * 0.9);
    // The canvas holds 780 pixels across a 390 px box, so it is one canvas
    // pixel per device pixel on the 3840 wide TV and supersampled at 1920.
    expect(edge!.canvasWidth).toBe(780);
    expect(edge!.drawnWidth).toBeCloseTo(width === 3840 ? 780 : 390, 0);
  }
});

test('the heart is shaded, not a flat silhouette', async ({ page }) => {
  const frame = await loadRenderer(page, { fixture: allShortFixture, scene: 9, ms: 2000 });
  const tones = await frame.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#heart-host canvas');
    if (!canvas) return null;
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext('2d')!;
    context.drawImage(canvas, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let darkest = 255;
    let brightest = 0;
    const distinct = new Set<number>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] <= 16) continue;
      const luminance = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
      if (luminance < darkest) darkest = luminance;
      if (luminance > brightest) brightest = luminance;
      distinct.add(luminance >> 2);
    }
    return { darkest, brightest, bands: distinct.size };
  });
  expect(tones).toBeTruthy();
  // A flat fill would give one tone. Real shading runs from a deep crimson
  // shadow to a near white highlight.
  expect(tones!.brightest - tones!.darkest).toBeGreaterThan(90);
  expect(tones!.bands).toBeGreaterThan(20);
});

test('reduced motion renders the scene still, with the heart held at a three quarter angle', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const frame = await loadRenderer(page, { fixture: allShortFixture, scene: 9 });
  const still = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().still === true);
  expect(still).toBe(true);

  const before = await heartSilhouette(frame);
  expect(before!.painted).toBeGreaterThan(10000);
  // Three quarters on, so clearly narrower than face on and clearly wider than
  // nothing: the still frame is a shaded solid, not an edge.
  expect(before!.width).toBeGreaterThan(before!.height * 0.7);
  expect(before!.width).toBeLessThan(before!.height * 1.15);

  await frame.evaluate(() => (window as any).colorPolishRuntime.step(9000));
  const after = await heartSilhouette(frame);
  expect(after!.width, 'the heart must not turn when motion is reduced').toBe(before!.width);

  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);
});

test('bubbles stay circular and inside the scene at 0.3 s, 6 s, 14 s and 21 s', async ({ page }) => {
  test.setTimeout(90000);
  for (const ms of [300, 6000, 14000, 21000]) {
    const frame = await loadRenderer(page, { fixture: mixedFixture, scene: 9, ms });
    const circleResult = await circularity(frame);
    expect(circleResult.count, `no circles at ${ms} ms`).toBeGreaterThan(0);
    expect(circleResult.failures, `not circular at ${ms} ms`).toHaveLength(0);

    // This scene's ambient hearts are SVGs whose markup carries a
    // <defs><radialGradient> block; <defs> content never paints, but the
    // shared noOverflow() helper measures raw scrollHeight, which Chromium
    // inflates from that invisible geometry. So this checks the bounding rects
    // of the visible elements directly instead.
    const overflow = await frame.evaluate((selector) => {
      const scene = document.querySelector<HTMLElement>(selector);
      if (!scene) return { offenders: ['no scene'], count: 0 };
      const sceneRect = scene.getBoundingClientRect();
      const visible = Array.from(
        scene.querySelectorAll<HTMLElement>('.scene-copy, img.art, #heart-host, .floating-heart, .orb-slot'),
      );
      const offenders: string[] = [];
      for (const element of visible) {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const inside =
          rect.left >= sceneRect.left - 1 &&
          rect.right <= sceneRect.right + 1 &&
          rect.top >= sceneRect.top - 1 &&
          rect.bottom <= sceneRect.bottom + 1;
        if (!inside) offenders.push(element.className || element.id || element.tagName);
      }
      return { offenders, count: visible.length };
    }, SCENE);
    expect(overflow.count).toBeGreaterThan(0);
    expect(overflow.offenders, `overflow at ${ms} ms`).toEqual([]);
  }
});

test('the regular bubbles keep the live drift and stay clear of the artwork', async ({ page }) => {
  test.setTimeout(90000);
  const frame = await loadRenderer(page, { fixture: mixedFixture, scene: 9, ms: 1000 });
  const start = await frame.evaluate(() =>
    (window as any).colorPolishRuntime.visualState().actors.map((actor: any) => ({ id: actor.id, x: actor.x, y: actor.y })),
  );

  await frame.evaluate(() => (window as any).colorPolishRuntime.step(20000));

  const moved = await frame.evaluate(() => {
    const visual = (window as any).colorPolishRuntime.visualState();
    const state = (window as any).colorPolishRuntime.getState();
    return visual.actors.map((actor: any) => {
      const slot = state.slots.find((entry: any) => entry.key === actor.key);
      return { id: actor.id, x: actor.x, y: actor.y, d: actor.d, large: !!slot?.large };
    });
  });

  const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
  for (const actor of moved) {
    if (actor.large) continue;
    // The artwork keep out box added with the reserved bubble.
    const box = { x: 0, y: 250, w: 700, h: 386 };
    const nearestX = clamp(actor.x, box.x, box.x + box.w);
    const nearestY = clamp(actor.y, box.y, box.y + box.h);
    const distance = Math.hypot(actor.x - nearestX, actor.y - nearestY);
    expect(distance, `${actor.id} drifted onto the artwork`).toBeGreaterThan(actor.d * 0.4);
  }

  // The drift itself is unchanged: the regular bubbles still move.
  const drifted = moved.some((actor: any) => {
    if (actor.large) return false;
    const before = start.find((entry: any) => entry.id === actor.id);
    return before && Math.hypot(actor.x - before.x, actor.y - before.y) > 5;
  });
  expect(drifted, 'the regular bubbles should still drift').toBe(true);
});

test('shows the production title copy, the hands banner artwork and fourteen ambient hearts', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 9, ms: 2000 });

  const content = await frame.evaluate((selector) => {
    const scene = document.querySelector<HTMLElement>(selector);
    return {
      eyebrow: scene?.querySelector<HTMLElement>('.eyebrow')?.textContent || '',
      heading: scene?.querySelector<HTMLElement>('h1')?.textContent || '',
      subheading: scene?.querySelector<HTMLElement>('.subheading')?.textContent || '',
      artSrc: scene?.querySelector<HTMLImageElement>('img.art')?.getAttribute('src') || '',
      ambientHearts: document.getElementById('heart-field')?.querySelectorAll('.floating-heart').length ?? 0,
      heartHost: (() => {
        const host = document.getElementById('heart-host');
        return host ? { left: host.style.left, top: host.style.top, width: host.style.width, height: host.style.height } : null;
      })(),
    };
  }, SCENE);

  expect(content.eyebrow).toBe('Peace in practice');
  expect(content.heading).toContain('love');
  expect(content.heading).toContain('peace');
  expect(content.subheading).toContain('Love expressed through words and actions.');
  expect(content.artSrc).toContain('/color-polish/assets/hands_banner.png');
  expect(content.ambientHearts).toBe(14);
  // The heart keeps its place and size from the live scene.
  expect(content.heartHost).toEqual({ left: '198px', top: '232px', width: '390px', height: '363px' });
});

test('a studio click does not advance away from the scene', async ({ page }) => {
  const frame = await loadRenderer(page, { fixture: allShortFixture, scene: 9, ms: 2000 });
  const before = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().scene);
  await frame.locator('body').click();
  await page.waitForTimeout(300);
  const after = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().scene);
  expect(after).toBe(before);
});

test('no recognition data is fetched from a live network endpoint', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await loadRenderer(page, { scene: 9, ms: 6000 });
  const live = requests.filter((url) => /supabase|recognitions|display\/color-polish/.test(url));
  expect(live).toHaveLength(0);
});
