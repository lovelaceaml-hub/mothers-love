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
// The Lane 10 review then brought the reserved bubble to the same behaviour as
// the one on We Are Peacemakers (it changes its message where it stands, a
// message stays at least 18 seconds, and the next one is only taken if there
// is time left to read it), and redrew the heart as a smooth, glossy solid a
// little under half as thick as it is wide.
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

// A pool with this scene's seconds set in the saved playlist, which is where
// the TV reads the dwell from.
const playlistFixture = (records: unknown[], seconds = 60) => buildActiveDisplayFixture({
  recognitions: records,
  presentation: {
    version: 'color-polish-v6',
    enabled: true,
    playlist: [
      ['welcome', 60],
      ['garden', 180],
      ['featured', 60],
      ['calendar', 60],
      ['peacemakers', 60],
      ['status', 60],
      ['expressions', 60],
      ['peace-in-practice', seconds],
      ['orbit', 60],
      ['milestone', 60],
    ].map(([id, durationSeconds]) => ({ id, enabled: true, durationSeconds })),
  },
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

const RESERVED_CENTRE = { x: 1500, y: 332 };
// The illustration (turning heart, raised hands, flowers) and the title copy,
// in stage pixels: the scene's own two keep out boxes.
const ARTWORK = { x: 0, y: 250, w: 700, h: 386 };
const TITLE = { x: 0, y: 10, w: 870, h: 276 };

type Actor = { key: string; id: string; life: string; x: number; y: number; d: number; opacity: number; reserved: boolean };

// Every bubble as the TV is drawing it this frame (screen position, so a
// bubble that is flying in is measured where it is, not where it will rest).
async function actorsNow(frame: Frame): Promise<Actor[]> {
  return await frame.evaluate(() => {
    const key = (window as any).pipReservedSlotKey();
    const visual = (0, eval)('V');
    return visual.actors.map((actor: any) => ({
      key: actor.key,
      id: actor.id,
      life: actor.life,
      x: actor.screenX ?? actor.x,
      y: actor.screenY ?? actor.y,
      d: actor.d,
      opacity: actor.opacity ?? 1,
      reserved: actor.key === key,
    }));
  });
}

// How far a circle reaches into a box, in pixels (negative when it is clear).
function reachInto(actor: { x: number; y: number; d: number }, box: { x: number; y: number; w: number; h: number }) {
  const nearestX = Math.min(Math.max(actor.x, box.x), box.x + box.w);
  const nearestY = Math.min(Math.max(actor.y, box.y), box.y + box.h);
  return actor.d / 2 - Math.hypot(actor.x - nearestX, actor.y - nearestY);
}

async function reservedReports(frame: Frame) {
  return await frame.evaluate(() => ((window as any).colorPolishRuntime.getState().log || [])
    .filter((entry: any) => entry.type === 'pip_reserved'));
}

// Bounding box of the painted pixels of the heart canvas, in canvas pixels.
// Reading the canvas back is what makes the flat card case fail: a flat image
// turned ninety degrees has almost no width, a solid keeps most of it.
async function heartSilhouette(frame: Frame) {
  return await frame.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(`#heart-host canvas.pip-heart`);
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
    const rowWidth = new Array(canvas.height).fill(0);
    const columnTop = new Array(canvas.width).fill(-1);
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (data[(y * canvas.width + x) * 4 + 3] > 16) {
          painted++;
          rowWidth[y]++;
          if (columnTop[x] < 0) columnTop[x] = y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!painted) return { width: 0, height: 0, painted: 0, upperWidth: 0, lowerWidth: 0, widestAt: 0, cleft: 0, canvasWidth: canvas.width, drawnWidth: canvas.offsetWidth * (document.getElementById('tv')!.getBoundingClientRect().width / 1920) };
    const height = maxY - minY + 1;
    let widest = 0;
    let widestRow = minY;
    for (let y = minY; y <= maxY; y++) if (rowWidth[y] > widest) { widest = rowWidth[y]; widestRow = y; }
    return {
      width: maxX - minX + 1,
      height,
      painted,
      // Painted width a quarter of the way down and four fifths of the way
      // down, and how far down the widest row sits (0 top, 1 bottom).
      upperWidth: rowWidth[Math.round(minY + height * 0.25)],
      lowerWidth: rowWidth[Math.round(minY + height * 0.8)],
      widestAt: (widestRow - minY) / height,
      // How far the dip between the two lobes drops below the lobe tops, as a
      // share of the height, on the middle column.
      cleft: (columnTop[Math.round((minX + maxX) / 2)] - minY) / height,
      canvasWidth: canvas.width,
      drawnWidth: canvas.offsetWidth * (document.getElementById('tv')!.getBoundingClientRect().width / 1920),
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

test('with no very long recognition waiting, the reserved bubble still refreshes, in place and never empty', async ({ page }) => {
  test.setTimeout(180000);
  const frame = await loadRenderer(page, { fixture: allShortFixture, scene: 9, ms: 1000 });
  const seen = new Set<string>();
  const texts = messagesOf(allShortFixture);

  for (let second = 0; second < 58; second++) {
    const actors = await actorsNow(frame);
    const reserved = actors.find((actor) => actor.reserved);
    // Never empty, never moved, never burst or flown off, at any moment.
    expect(reserved, `no reserved bubble at ${second} s`).toBeTruthy();
    expect(reserved!.id).toBeTruthy();
    expect(reserved!.life).toBe('steady');
    expect(reserved!.opacity).toBe(1);
    expect(Math.abs(reserved!.x - RESERVED_CENTRE.x)).toBeLessThan(1);
    expect(Math.abs(reserved!.y - RESERVED_CENTRE.y)).toBeLessThan(1);
    seen.add(reserved!.id);
    // No message is on screen twice, and every settled bubble shows its whole message.
    expect(new Set(actors.map((actor) => actor.id)).size).toBe(actors.length);
    for (const bubble of await bubbles(frame)) {
      expect(bubble.pages).toBe(1);
      expect(bubble.text).toBe(texts.get(bubble.id));
    }
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(1000));
  }

  // Over a 60 second showing the biggest bubble shows more than one message,
  // and each one stays at least 18 seconds.
  expect(seen.size).toBeGreaterThanOrEqual(2);
  const reports = await reservedReports(frame);
  expect(reports.length).toBeGreaterThanOrEqual(2);
  for (let i = 1; i < reports.length; i++) {
    expect(reports[i].at - reports[i - 1].at).toBeGreaterThanOrEqual(18);
  }
});

test('on the live playlist, the reserved bubble only takes a message there is still time to read', async ({ page }) => {
  test.setTimeout(180000);
  const frame = await loadRenderer(page, { fixture: playlistFixture(threeLongFixture.recognitions as unknown[]), scene: 9 });
  // The probe harness pins the scene, which the church TV does not. Unpin it
  // so the scene runs on its playlist dwell, as it does on the TV.
  await frame.evaluate(() => { (0, eval)('S').sceneControlled = false; });

  for (let step = 0; step < 31; step++) {
    const scene = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().scene);
    if (scene !== 9) break;
    const reserved = (await bubbles(frame)).find((bubble) => bubble.large);
    expect(reserved?.pages).toBe(1);
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(2000));
  }

  const reports = await reservedReports(frame);
  expect(reports.length).toBeGreaterThanOrEqual(2);
  expect(reports[0].veryLong).toBe(true);
  for (const report of reports) {
    expect(report.pages).toBe(1);
    expect(report.dwell).toBe(60);
    expect(report.sceneAge + report.readSeconds, `${report.id} arrived too late to be read`).toBeLessThanOrEqual(report.dwell);
  }
});

test('the scene reads its dwell from the saved playlist, not from a constant', async ({ page }) => {
  const frame = await loadRenderer(page, { fixture: playlistFixture(allShortFixture.recognitions as unknown[], 45), scene: 9 });
  const reports = await reservedReports(frame);
  expect(reports[0].dwell).toBe(45);
});

test('the reserved bubble eases to the size the next message needs, and its words are whole at every size', async ({ page }) => {
  test.setTimeout(180000);
  const pool = [
    short(1), short(2), short(3),
    record({ id: 'pip-grow-250', recipient: 'Grow Friend A', message: message(250), expressionIds: [4] }),
    record({ id: 'pip-grow-500', recipient: 'Grow Friend B', message: message(500), expressionIds: [6] }),
  ];
  const fixture = buildActiveDisplayFixture({ recognitions: pool });
  const frame = await loadRenderer(page, { fixture, scene: 9 });
  const texts = messagesOf(fixture);
  const sizes = new Map<string, number>();
  const fonts = new Map<string, number>();
  let between = 0;
  for (let step = 0; step < 300; step++) {
    const reserved = (await bubbles(frame)).find((bubble) => bubble.large)!;
    if ([456, 504, 552].includes(reserved.d)) {
      sizes.set(reserved.id, reserved.d);
      fonts.set(reserved.id, reserved.fontPx);
      expect(reserved.text).toBe(texts.get(reserved.id));
      expect(reserved.pages).toBe(1);
      expect(reserved.fontPx).toBeGreaterThanOrEqual(18);
    } else {
      between++;
    }
    expect(Math.round(reserved.x + reserved.d / 2)).toBe(RESERVED_CENTRE.x);
    expect(Math.round(reserved.y + reserved.d / 2)).toBe(RESERVED_CENTRE.y);
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(250));
  }
  // The longer the message, the larger the circle and the smaller the words.
  expect(sizes.get('pip-grow-250')).toBe(504);
  expect(sizes.get('pip-grow-500')).toBe(552);
  expect(fonts.get('pip-grow-500')!).toBeLessThan(fonts.get('pip-grow-250')!);
  // The change of size was eased, not a jump: some frames were in between.
  expect(between).toBeGreaterThan(0);
});

test('across a 60 second showing no bubble covers the heading, the artwork or the reserved bubble', async ({ page }) => {
  test.setTimeout(180000);
  const frame = await loadRenderer(page, { fixture: mixedFixture, scene: 9 });
  let steady = 0;
  let flying = 0;
  for (let step = 0; step < 120; step++) {
    const actors = await actorsNow(frame);
    const reserved = actors.find((actor) => actor.reserved)!;
    expect(reserved).toBeTruthy();
    for (const actor of actors) {
      if (actor.reserved || actor.opacity < 0.05) continue;
      const intoReserved = actor.d / 2 + reserved.d / 2 - Math.hypot(actor.x - reserved.x, actor.y - reserved.y);
      if (actor.life === 'steady') {
        steady++;
        expect(reachInto(actor, ARTWORK), `${actor.id} sits over the artwork at step ${step}`).toBeLessThan(24);
        expect(reachInto(actor, TITLE), `${actor.id} sits over the heading at step ${step}`).toBeLessThan(24);
        expect(intoReserved, `${actor.id} sits over the reserved bubble at step ${step}`).toBeLessThan(36);
      } else {
        // A bubble on its way in rises from below its resting place, so it
        // never slides under the reserved bubble or across the heading.
        flying++;
        expect(intoReserved, `${actor.id} flies under the reserved bubble at step ${step}`).toBeLessThan(70);
        expect(reachInto(actor, TITLE), `${actor.id} flies across the heading at step ${step}`).toBeLessThan(24);
      }
    }
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(500));
  }
  expect(steady).toBeGreaterThan(100);
  expect(flying).toBeGreaterThan(4);
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

test('the turning heart is a solid a little under half as thick as it is wide, at 1920 and at 3840', async ({ page }) => {
  test.setTimeout(240000);
  for (const width of [1920, 3840]) {
    const frame = await loadAt(page, width, { fixture: allShortFixture, scene: 9 });

    const faceAngle = await stepToAngle(frame, 180);
    expect(Math.abs(faceAngle - 180)).toBeLessThan(1);
    const face = await heartSilhouette(frame);
    expect(face, `no heart canvas at ${width}`).toBeTruthy();
    expect(face!.painted).toBeGreaterThan(10000);
    // Face on it is a heart: about as wide as it is tall, with a dip between
    // the two lobes. The live artwork is 278 px wide in the 390 px box.
    expect(face!.width / face!.height).toBeGreaterThan(0.95);
    expect(face!.width / face!.height).toBeLessThan(1.08);
    expect(face!.cleft, 'no dip between the lobes').toBeGreaterThan(0.06);
    expect(face!.width / face!.canvasWidth).toBeGreaterThan(0.69);
    expect(face!.width / face!.canvasWidth).toBeLessThan(0.74);

    const edgeAngle = await stepToAngle(frame, 270);
    expect(Math.abs(edgeAngle - 270)).toBeLessThan(1);
    const edge = await heartSilhouette(frame);

    // A flat card turned edge on has a width near zero (the live image
    // measured 0.03). A puffed balloon heart is 40 to 50 percent as thick as
    // it is wide; the first solid drawn for this lane was 0.66 and read as an
    // egg. Both must fail here.
    const thickness = edge!.width / face!.width;
    expect(thickness, `edge on width ${edge!.width} against face on width ${face!.width} at ${width}`).toBeGreaterThan(0.4);
    expect(thickness, `edge on width ${edge!.width} against face on width ${face!.width} at ${width}`).toBeLessThan(0.5);
    expect(edge!.height).toBeGreaterThan(face!.height * 0.95);
    // Edge on it still hints at a heart: fuller behind the lobes, tapering to
    // the point. An egg is widest in the middle and as wide below as above.
    expect(edge!.widestAt, 'the widest part should be in the upper half').toBeLessThan(0.45);
    expect(edge!.upperWidth / edge!.lowerWidth, 'edge on, the heart should taper toward the point').toBeGreaterThan(1.6);

    // One canvas pixel per TV pixel: 390 across at 1920, 780 across at 3840.
    expect(edge!.canvasWidth).toBe(width === 3840 ? 780 : 390);
    expect(edge!.drawnWidth).toBeCloseTo(edge!.canvasWidth, 0);
  }
});

test('the heart surface is smooth: no bands, streaks or seam, at 1920 and at 3840', async ({ page }) => {
  test.setTimeout(240000);
  for (const width of [1920, 3840]) {
    const frame = await loadAt(page, width, { fixture: allShortFixture, scene: 9 });
    await stepToAngle(frame, 180);
    const surface = await frame.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('#heart-host canvas.pip-heart')!;
      const copy = document.createElement('canvas');
      copy.width = canvas.width;
      copy.height = canvas.height;
      const context = copy.getContext('2d')!;
      context.drawImage(canvas, 0, 0);
      const W = canvas.width;
      const H = canvas.height;
      const data = context.getImageData(0, 0, W, H).data;
      const scale = W / 390;
      const margin = Math.round(4 * scale);
      const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && data[(y * W + x) * 4 + 3] === 255;
      const light = (x: number, y: number) => {
        const k = (y * W + x) * 4;
        return 0.2126 * data[k] + 0.7152 * data[k + 1] + 0.0722 * data[k + 2];
      };
      // Interior pixels only: a few pixels in from the outline.
      const inside = (x: number, y: number) => solid(x, y) && solid(x - margin, y) && solid(x + margin, y) && solid(x, y - margin) && solid(x, y + margin);
      let largestStep = 0;
      let largestBend = 0;
      let seam = 0;
      let measured = 0;
      const middle = Math.round(W / 2);
      for (let y = 1; y < H - 1; y++) {
        for (let x = 2; x < W - 2; x++) {
          if (!inside(x, y) || !inside(x + 1, y) || !inside(x - 1, y) || !inside(x, y + 1) || !inside(x, y - 1)) continue;
          measured++;
          const here = light(x, y);
          const across = Math.abs(light(x + 1, y) - here);
          const down = Math.abs(light(x, y + 1) - here);
          if (across > largestStep) largestStep = across;
          if (down > largestStep) largestStep = down;
          // A band, a streak or a seam is a line where the shade changes
          // direction sharply; a smooth surface bends only gently.
          const bendAcross = Math.abs(light(x + 1, y) - 2 * here + light(x - 1, y));
          const bendDown = Math.abs(light(x, y + 1) - 2 * here + light(x, y - 1));
          if (bendAcross > largestBend) largestBend = bendAcross;
          if (bendDown > largestBend) largestBend = bendDown;
        }
      }
      // A seam down the middle shows as a jump in shade from just left of the
      // centre line to just right of it, over the lower two thirds.
      for (let y = Math.round(H * 0.4); y < Math.round(H * 0.8); y++) {
        const gap = Math.round(3 * scale);
        if (!inside(middle - gap, y) || !inside(middle + gap, y)) continue;
        seam = Math.max(seam, Math.abs(light(middle - gap, y) - light(middle + gap, y)));
      }
      return { largestStep, largestBend, seam, measured, scale };
    });
    expect(surface.measured).toBeGreaterThan(20000);
    expect(surface.largestStep, `a hard step in shade at ${width}`).toBeLessThan(9);
    expect(surface.largestBend, `a band or streak at ${width}`).toBeLessThan(5);
    expect(surface.seam, `a seam down the middle at ${width}`).toBeLessThan(8);
  }
});

test('the heart is shaded, not a flat silhouette', async ({ page }) => {
  const frame = await loadRenderer(page, { fixture: allShortFixture, scene: 9, ms: 2000 });
  const tones = await frame.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#heart-host canvas.pip-heart');
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

// Plan 17 handoff, 2026-09-19: Anthony asked for flowing ribbons of gold around
// the heart, and for the heart to be dynamic.
async function ribbonReading(frame: Frame) {
  return await frame.evaluate(() => {
    const goldOn = (selector: string) => {
      const canvas = document.querySelector<HTMLCanvasElement>(selector);
      if (!canvas) return -1;
      const copy = document.createElement('canvas');
      copy.width = canvas.width;
      copy.height = canvas.height;
      const context = copy.getContext('2d')!;
      context.drawImage(canvas, 0, 0);
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum = (sum * 31 + data[i] + data[i + 3] * 7) >>> 0;
        if (data[i + 3] > 200 && data[i] > 160 && data[i] - data[i + 2] > 60) count++;
      }
      return { count, sum };
    };
    const rig = document.querySelector<HTMLElement>('#heart-host .pip-heart-rig');
    const life = (window as any).pipHeartRenderer.life;
    return { back: goldOn('#heart-host .pip-heart-back'), front: goldOn('#heart-host .pip-heart-front'), transform: rig ? rig.style.transform : '', frontPieces: life.frontPieces, backPieces: life.backPieces };
  });
}

test('ribbons of gold flow around the heart, behind it and in front of it, and the heart beats', async ({ page }) => {
  const frame = await loadRenderer(page, { fixture: allShortFixture, scene: 9, ms: 2000 });
  const first = await ribbonReading(frame);
  // Gold is really drawn on both sides of the solid.
  expect((first.back as any).count, 'no ribbon behind the heart').toBeGreaterThan(1500);
  expect((first.front as any).count, 'no ribbon in front of the heart').toBeGreaterThan(1500);
  expect(first.frontPieces).toBeGreaterThan(60);
  expect(first.backPieces).toBeGreaterThan(60);
  const transforms = new Set([first.transform]);
  const fronts = new Set([(first.front as any).sum]);
  for (let i = 0; i < 20; i++) {
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(100));
    const next = await ribbonReading(frame);
    transforms.add(next.transform);
    fronts.add((next.front as any).sum);
  }
  // They flow, and the heart beats, floats and leans.
  expect(fronts.size).toBeGreaterThan(15);
  expect(transforms.size).toBeGreaterThan(15);
  const swells = [...transforms].map((value) => Number(/scale\(([\d.]+)\)/.exec(value)?.[1] ?? 1));
  expect(Math.max(...swells)).toBeGreaterThan(1.015);
  expect(Math.max(...swells)).toBeLessThanOrEqual(1.0301);
});

test('reduced motion renders the scene still, with the heart held at a three quarter angle', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const frame = await loadRenderer(page, { fixture: allShortFixture, scene: 9 });
  const still = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().still === true);
  expect(still).toBe(true);

  const before = await heartSilhouette(frame);
  const ribbonsBefore = await ribbonReading(frame);
  expect(before!.painted).toBeGreaterThan(10000);
  // Three quarters on, so clearly narrower than face on (1.02 of the height)
  // and clearly wider than edge on (0.47 of the height): the still frame is a
  // shaded solid seen at an angle.
  expect(before!.width).toBeGreaterThan(before!.height * 0.75);
  expect(before!.width).toBeLessThan(before!.height * 0.95);

  await frame.evaluate(() => (window as any).colorPolishRuntime.step(9000));
  const after = await heartSilhouette(frame);
  expect(after!.width, 'the heart must not turn when motion is reduced').toBe(before!.width);
  // The ribbons are there, and they and the rig hold still too.
  const ribbonsAfter = await ribbonReading(frame);
  expect((ribbonsBefore.front as any).count).toBeGreaterThan(1500);
  expect(ribbonsBefore.transform).toBe('none');
  expect(ribbonsAfter).toEqual(ribbonsBefore);

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
