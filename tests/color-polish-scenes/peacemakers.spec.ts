import { expect, test, type Frame } from '@playwright/test';
import { buildActiveDisplayFixture, circularity, loadRenderer, noOverflow, recognition } from './helpers';

// Scene 8, We Are Peacemakers: what the live TV shows today (Plan 12
// production, commit b7d92a0) plus the one change Anthony asked for on
// September 19 after watching the church TV, that one big bubble is reserved
// for the very long recognitions so they fit in the bubble.
//
// These specs drive the renderer through loadRenderer's /probe harness rather
// than openStudioScene's /admin/login sign-in flow: that sign-in flow fails to
// reach /admin in this worktree's dev server for every color-polish scene
// spec, not only this one (recorded by Lane 3 in this run's research folder).
// loadRenderer exercises the same renderer code and DOM without signing in.

// The scene's own geometry, restated here so a silent change to it fails.
const RESERVED = { x: 1168, y: 32, d: 572 };
const REGULAR = [[860, 14, 312], [860, 326, 304], [528, 320, 295]];
const FLOOR = 18;

const filler = ('thank you for the quiet patience and the warm greeting you offered when the '
  + 'room was full and nobody else made space for me today so I could sit down and rest '
  + 'a while with everyone who came in after the long walk across town').split(' ');

/** Builds a message of exactly `graphemes` graphemes out of ordinary words. */
function message(graphemes: number): string {
  let text = '';
  let index = 0;
  while (text.length < graphemes) {
    text += (text ? ' ' : '') + filler[index % filler.length];
    index++;
  }
  return text.slice(0, graphemes);
}

const short = (n: number) => recognition({
  id: `short-${n}`,
  recipient: `Short ${n}`,
  message: `Thank you for your kindness number ${n}.`,
  expressionIds: [(n % 9) + 1],
});

const longRecord = (id: string, graphemes: number, name: string) => recognition({
  id,
  recipient: name,
  message: message(graphemes),
  expressionIds: [4],
});

const poolFixture = (records: unknown[], peacemakersSeconds = 60) => buildActiveDisplayFixture({
  recognitions: records,
  presentation: {
    version: 'color-polish-v6',
    enabled: true,
    playlist: [
      ['welcome', 60],
      ['garden', 180],
      ['featured', 60],
      ['calendar', 60],
      ['peacemakers', peacemakersSeconds],
      ['status', 60],
      ['expressions', 60],
      ['peace-in-practice', 60],
      ['orbit', 60],
      ['milestone', 60],
    ].map(([id, durationSeconds]) => ({ id, enabled: true, durationSeconds })),
  },
});

const allShortPool = [short(1), short(2), short(3), short(4), short(5), short(6)];
const mixedLongPool = [
  short(1), short(2), short(3),
  longRecord('g250', 250, 'Two Fifty'),
  longRecord('g400', 400, 'Four Hundred'),
  longRecord('g500', 500, 'Five Hundred'),
];
const threeLongPool = [
  short(1), short(2), short(3), short(4),
  longRecord('long-a', 320, 'Long A'),
  longRecord('long-b', 360, 'Long B'),
  longRecord('long-c', 480, 'Long C'),
];

type Bubble = {
  id: string;
  reserved: boolean;
  diameter: number;
  x: number;
  y: number;
  fontSize: number;
  pages: number;
  pageIndicatorShown: boolean;
  whole: boolean;
  overflowing: boolean;
  graphemes: number;
  veryLong: boolean;
};

/** Reads every bubble on scene 8 with what the renderer actually drew in it. */
async function bubbles(frame: Frame): Promise<Bubble[]> {
  return await frame.evaluate(() => {
    const runtime = (window as any).colorPolishRuntime;
    const reservedKey = (window as any).peacemakersReservedSlotKey();
    const pool: any[] = (window as any).records();
    return runtime.getState().slots.map((slot: any) => {
      const element = document.getElementById(slot.key) as HTMLElement | null;
      const content = element?.querySelector('.orb-content') as HTMLElement | null;
      const messageNode = element?.querySelector('.message') as HTMLElement | null;
      const indicator = element?.querySelector('.orb-page-indicator') as HTMLElement | null;
      const record = pool.find((item) => item.id === slot.id);
      return {
        id: slot.id,
        reserved: slot.key === reservedKey,
        diameter: slot.d,
        x: slot.x,
        y: slot.y,
        fontSize: parseFloat(messageNode?.style.fontSize || '0') || 0,
        pages: slot.reading?.pages?.length ?? 0,
        pageIndicatorShown: indicator ? !indicator.hidden : false,
        whole: !!record && (messageNode?.textContent || '') === record.message,
        overflowing: !!content && content.scrollHeight > content.clientHeight,
        graphemes: record ? (window as any).peacemakersGraphemes(record.message) : 0,
        veryLong: !!record && (window as any).peacemakersVeryLong(record),
      };
    });
  });
}

/** Reads the reserved bubble's measured numbers, logged after it was fitted. */
async function reservedReport(frame: Frame) {
  return await frame.evaluate(() => {
    const entries = ((window as any).colorPolishRuntime.getState().log || [])
      .filter((entry: any) => entry.type === 'peacemakers_reserved');
    return entries[entries.length - 1] || null;
  });
}

test('with an all-short pool, one reserved bubble and three regular bubbles appear at the scene’s positions', async ({ page }) => {
  const frame = await loadRenderer(page, { fixture: poolFixture(allShortPool), scene: 8 });
  const drawn = await bubbles(frame);

  expect(drawn).toHaveLength(4);
  const reserved = drawn.filter((bubble) => bubble.reserved);
  expect(reserved).toHaveLength(1);
  expect(reserved[0].diameter).toBe(RESERVED.d);
  expect(reserved[0].x).toBeCloseTo(RESERVED.x, 0);
  expect(reserved[0].y).toBeCloseTo(RESERVED.y, 0);
  // Anthony's rule: with no very long message in the pool the reserved bubble
  // still shows a regular message, never nothing.
  expect(reserved[0].id).toBeTruthy();
  expect(reserved[0].veryLong).toBe(false);
  expect(reserved[0].whole).toBe(true);

  const regular = drawn.filter((bubble) => !bubble.reserved);
  expect(regular.map((bubble) => bubble.diameter).sort((a, b) => b - a)).toEqual(REGULAR.map(([, , d]) => d));
  regular.forEach((bubble, index) => {
    const position = REGULAR[index];
    expect(bubble.diameter).toBe(position[2]);
    // loadRenderer steps past the entrance, so a little drift has already run.
    expect(Math.abs(bubble.x - position[0])).toBeLessThan(120);
    expect(Math.abs(bubble.y - position[1])).toBeLessThan(120);
  });

  const ids = drawn.map((bubble) => bubble.id);
  expect(new Set(ids).size).toBe(4);
});

test('a very long recognition appears only in the reserved bubble, and the others fit whole', async ({ page }) => {
  const frame = await loadRenderer(page, { fixture: poolFixture(mixedLongPool), scene: 8, ms: 2000 });
  const drawn = await bubbles(frame);

  expect(drawn.length).toBeGreaterThan(1);
  const veryLong = drawn.filter((bubble) => bubble.veryLong);
  expect(veryLong).toHaveLength(1);
  expect(veryLong[0].reserved).toBe(true);

  for (const bubble of drawn) {
    expect(bubble.whole, `${bubble.id} is not showing its whole message`).toBe(true);
    expect(bubble.pages, `${bubble.id} was paginated`).toBe(1);
    expect(bubble.pageIndicatorShown).toBe(false);
    expect(bubble.overflowing, `${bubble.id} overflows its bubble`).toBe(false);
    expect(bubble.fontSize).toBeGreaterThanOrEqual(FLOOR);
  }

  // The pool holds three very long records; only the one in the reserved
  // bubble may be on screen, so the other two are absent.
  const shown = drawn.map((bubble) => bubble.id);
  expect(shown.filter((id) => ['g250', 'g400', 'g500'].includes(id))).toHaveLength(1);
});

test('the reserved bubble steps its font down toward the floor as the grapheme count rises', async ({ page }) => {
  test.setTimeout(150000);
  const sizes: number[] = [];
  for (const graphemes of [250, 400, 500]) {
    const pool = [short(1), short(2), short(3), longRecord(`g${graphemes}`, graphemes, 'Long Friend')];
    const frame = await loadRenderer(page, { fixture: poolFixture(pool), scene: 8 });
    const report = await reservedReport(frame);
    expect(report, 'the reserved bubble reported nothing').toBeTruthy();
    expect(report.graphemes).toBe(graphemes);
    expect(report.veryLong).toBe(true);
    expect(report.diameter).toBe(RESERVED.d);
    // Whole, never paged, never below the floor.
    expect(report.pages).toBe(1);
    expect(report.fontSize).toBeGreaterThanOrEqual(FLOOR);
    sizes.push(report.fontSize);
  }
  expect(sizes[1]).toBeLessThanOrEqual(sizes[0]);
  expect(sizes[2]).toBeLessThanOrEqual(sizes[1]);
  expect(sizes[2]).toBeLessThan(sizes[0]);
});

test('a 500 grapheme message fits the reserved bubble whole, within the scene’s own dwell', async ({ page }) => {
  const pool = [short(1), short(2), short(3), longRecord('g500', 500, 'Five Hundred')];
  const frame = await loadRenderer(page, { fixture: poolFixture(pool), scene: 8, ms: 6000 });
  const report = await reservedReport(frame);

  expect(report.id).toBe('g500');
  expect(report.graphemes).toBe(500);
  expect(report.pages).toBe(1);
  expect(report.fontSize).toBeGreaterThanOrEqual(FLOOR);
  // The dwell comes from the snapshot's playlist, never from a constant here.
  expect(report.dwell).toBe(60);
  expect(report.readSeconds).toBeLessThanOrEqual(report.dwell);

  const drawn = await bubbles(frame);
  const reserved = drawn.find((bubble) => bubble.reserved);
  expect(reserved?.whole).toBe(true);
  expect(reserved?.overflowing).toBe(false);
  expect(reserved?.pageIndicatorShown).toBe(false);
});

test('the reserved bubble reads its dwell from the snapshot, not from a constant', async ({ page }) => {
  const pool = [short(1), short(2), short(3), longRecord('g500', 500, 'Five Hundred')];
  const frame = await loadRenderer(page, { fixture: poolFixture(pool, 45), scene: 8 });
  const report = await reservedReport(frame);
  expect(report.dwell).toBe(45);
});

test('with three very long recognitions at once, they take turns in the reserved bubble', async ({ page }) => {
  test.setTimeout(150000);
  const frame = await loadRenderer(page, { fixture: poolFixture(threeLongPool), scene: 8 });

  const seenInReserved = new Set<string>();
  for (let step = 0; step < 6; step++) {
    const drawn = await bubbles(frame);
    const veryLong = drawn.filter((bubble) => bubble.veryLong);
    // Never more than the one reserved bubble, wherever the rotation is.
    expect(veryLong.length).toBeLessThanOrEqual(1);
    for (const bubble of veryLong) expect(bubble.reserved).toBe(true);
    for (const bubble of drawn) {
      expect(bubble.whole, `${bubble.id} is not showing its whole message`).toBe(true);
      expect(bubble.pageIndicatorShown).toBe(false);
    }
    const reserved = drawn.find((bubble) => bubble.reserved);
    if (reserved?.veryLong) seenInReserved.add(reserved.id);
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(22000));
  }

  expect(seenInReserved.size).toBeGreaterThanOrEqual(2);
  for (const id of seenInReserved) expect(['long-a', 'long-b', 'long-c']).toContain(id);
});

test('with no very long recognition waiting, the reserved bubble keeps the message it has', async ({ page }) => {
  test.setTimeout(150000);
  const frame = await loadRenderer(page, { fixture: poolFixture(allShortPool), scene: 8, ms: 2000 });
  const first = (await bubbles(frame)).find((bubble) => bubble.reserved);
  expect(first).toBeTruthy();

  await frame.evaluate(() => (window as any).colorPolishRuntime.step(40000));
  const later = (await bubbles(frame)).find((bubble) => bubble.reserved);
  expect(later?.id).toBe(first?.id);
  expect(later?.whole).toBe(true);

  // The live drift replacement carries a bubble off the stage and back, which
  // would leave the biggest bubble's place empty for several seconds.
  const exits = await frame.evaluate(() => {
    const reservedKey = (window as any).peacemakersReservedSlotKey();
    const state = (window as any).colorPolishRuntime.getState();
    const reservedId = state.slots.find((slot: any) => slot.key === reservedKey)?.id;
    return (state.log || []).filter((entry: any) => entry.type === 'bubble_exit_start' && entry.id === reservedId).length;
  });
  expect(exits).toBe(0);
});

test('the reserved bubble holds still while the other bubbles drift', async ({ page }) => {
  const frame = await loadRenderer(page, { fixture: poolFixture(allShortPool), scene: 8, ms: 2000 });
  const before = await bubbles(frame);
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(6000));
  const after = await bubbles(frame);

  const reservedBefore = before.find((bubble) => bubble.reserved);
  const reservedAfter = after.find((bubble) => bubble.id === reservedBefore?.id && bubble.reserved);
  expect(reservedAfter).toBeTruthy();
  expect(Math.abs((reservedAfter as Bubble).x - (reservedBefore as Bubble).x)).toBeLessThan(1);
  expect(Math.abs((reservedAfter as Bubble).y - (reservedBefore as Bubble).y)).toBeLessThan(1);

  const moved = before
    .filter((bubble) => !bubble.reserved)
    .filter((bubble) => {
      const match = after.find((item) => item.id === bubble.id && !item.reserved);
      return !!match && (Math.abs(match.x - bubble.x) > 1 || Math.abs(match.y - bubble.y) > 1);
    });
  expect(moved.length).toBeGreaterThan(0);
});

test('at 3840 the message still draws at or above the 36 px floor on the screen', async ({ page }) => {
  await page.setViewportSize({ width: 3840, height: 2160 });
  const pool = [short(1), short(2), short(3), longRecord('g500', 500, 'Five Hundred')];
  const frame = await loadRenderer(page, { fixture: poolFixture(pool), scene: 8, ms: 6000 });

  const measured = await frame.evaluate(() => {
    const tv = document.getElementById('tv') as HTMLElement;
    const scale = tv.getBoundingClientRect().width / 1920;
    const runtime = (window as any).colorPolishRuntime;
    const reservedKey = (window as any).peacemakersReservedSlotKey();
    const slot = runtime.getState().slots.find((item: any) => item.key === reservedKey);
    const element = document.getElementById(reservedKey) as HTMLElement | null;
    const node = element?.querySelector('.message') as HTMLElement | null;
    const content = element?.querySelector('.orb-content') as HTMLElement | null;
    return {
      scale,
      designFont: parseFloat(node?.style.fontSize || '0') || 0,
      pages: slot?.reading?.pages?.length ?? 0,
      overflowing: !!content && content.scrollHeight > content.clientHeight,
    };
  });

  expect(measured.scale).toBeCloseTo(2, 1);
  expect(measured.designFont * measured.scale).toBeGreaterThanOrEqual(36);
  expect(measured.pages).toBe(1);
  expect(measured.overflowing).toBe(false);
});

test('peacemakers renders circular bubbles and no scene overflow at 14 s', async ({ page }) => {
  const frame = await loadRenderer(page, { fixture: poolFixture(allShortPool), scene: 8, ms: 14000 });

  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);

  const overflow = await noOverflow(frame);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);
});

test('bubbles stay circular at 0.3 s, 6 s, 14 s and 20 s', async ({ page }) => {
  // Four full renderer loads in one test, on a Mac that may be running other
  // lanes' browsers at the same time.
  test.setTimeout(150000);
  for (const ms of [300, 6000, 14000, 20000]) {
    const frame = await loadRenderer(page, { fixture: poolFixture(mixedLongPool), scene: 8, ms });
    const circleResult = await circularity(frame);
    expect(circleResult.count).toBeGreaterThan(0);
    expect(circleResult.failures).toHaveLength(0);
  }
});

test('reduced motion renders peacemakers still, with circular bubbles', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const frame = await loadRenderer(page, { fixture: poolFixture(mixedLongPool), scene: 8 });
  const still = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().still === true);
  expect(still).toBe(true);

  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);
});

test('shows the production title copy and the globe artwork', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 8, ms: 2000 });

  const content = await frame.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="8"]');
    return {
      eyebrow: scene?.querySelector<HTMLElement>('.eyebrow')?.textContent || '',
      heading: scene?.querySelector<HTMLElement>('h1')?.textContent || '',
      violet: scene?.querySelector<HTMLElement>('h1 .violet')?.textContent || '',
      subheading: scene?.querySelector<HTMLElement>('.subheading')?.textContent || '',
      artSrc: scene?.querySelector<HTMLImageElement>('img.art')?.getAttribute('src') || '',
    };
  });

  expect(content.eyebrow).toContain('Mother’s Love in our community');
  expect(content.heading).toContain('We Are');
  expect(content.violet).toBe('makers');
  expect(content.subheading).toContain('Recognize the kindness');
  expect(content.artSrc).toContain('/color-polish/assets/globe.png');
});

test('the reserved bubble clears the heading, the globe artwork and the other bubbles', async ({ page }) => {
  const frame = await loadRenderer(page, { fixture: poolFixture(mixedLongPool), scene: 8 });

  const geometry = await frame.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="8"]');
    const copy = scene?.querySelector<HTMLElement>('div[style*="left:12px"]');
    const art = scene?.querySelector<HTMLImageElement>('img.art');
    const box = (el: Element | null | undefined) => {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    };
    const reservedKey = (window as any).peacemakersReservedSlotKey();
    return {
      copy: box(copy),
      art: box(art),
      reserved: box(document.getElementById(reservedKey)),
      others: [...document.querySelectorAll('#stage .scene[data-scene="8"] .orb-slot')]
        .filter((el) => el.id !== reservedKey)
        .map((el) => box(el)),
    };
  });

  expect(geometry.reserved).toBeTruthy();
  const reserved = geometry.reserved as { left: number; right: number; top: number; bottom: number };
  expect(reserved.left).toBeGreaterThan((geometry.copy as any).right);
  expect(reserved.left).toBeGreaterThan((geometry.art as any).right);
  for (const other of geometry.others) {
    const circle = other as { left: number; right: number; top: number; bottom: number };
    const overlaps = circle.left < reserved.right && circle.right > reserved.left
      && circle.top < reserved.bottom && circle.bottom > reserved.top;
    expect(overlaps, 'a regular bubble starts on top of the reserved bubble').toBe(false);
  }
});

test('a steady bubble retires by drifting out, then a new bubble arrives', async ({ page }) => {
  test.setTimeout(150000);
  // Floater retireAt is 17 s plus 9.2 s per slot, and the reserved bubble is
  // the first slot, so the first regular bubble retires at 26.2 s.
  const frame = await loadRenderer(page, { fixture: poolFixture(allShortPool), scene: 8, ms: 28000 });

  const exitLogs = await frame.evaluate(() => {
    const state = (window as any).colorPolishRuntime.getState();
    return (state.log || []).filter((entry: any) => entry.type === 'bubble_exit_start' && entry.scene === 8);
  });
  expect(exitLogs.length).toBeGreaterThan(0);
  expect(exitLogs[0].kind).toBe('drift');

  // Exiting takes 3.8 s before the slot installs its replacement.
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(6000));

  const newLogs = await frame.evaluate(() => {
    const state = (window as any).colorPolishRuntime.getState();
    return (state.log || []).filter((entry: any) => entry.type === 'bubble_new' && entry.scene === 8);
  });
  expect(newLogs.length).toBeGreaterThan(0);
});

test('the scene 8 keep-out box matches production’s forbidden() rule', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 8, ms: 2000 });
  const box = await frame.evaluate(() => (window as any).sceneDescriptor(8).keepOut());
  expect(box).toEqual([{ x: 0, y: 8, w: 700, h: 296 }]);
});

test('no recognition data is fetched from a live network endpoint', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request: { url: () => string }) => requests.push(request.url()));
  await loadRenderer(page, { scene: 8, ms: 6000 });
  const live = requests.filter((url) => /supabase|recognitions|display\/color-polish/.test(url));
  expect(live).toHaveLength(0);
});
