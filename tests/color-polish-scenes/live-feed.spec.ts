import { expect, test, type Frame, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildActiveDisplayFixture, fulfillJson, mockCommon, signInAs } from './helpers';

// Plan 17 Lane 13: the eleventh screen, slug live-feed, renderer id 12.
// Fictional sample data only. The direct renderer tests serve every file from this
// checkout's public folder; nothing here reaches a server API or a database.

const LIVE_FEED = 12;

// Other writers share this Mac while the lanes run; generous limits keep a loaded
// machine from failing a test that is only slow.
test.describe.configure({ timeout: 240_000 });
const publicFolder = resolve(process.cwd(), 'public');
const QR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const NOW = '2026-09-10T18:00:00.000Z';
const FIRST = ['Mina', 'Jonah', 'Priya', 'Caleb', 'Sofia', 'Andre', 'Hana', 'Mateo', 'Lila', 'Owen', 'Noor', 'Felix', 'Ivy', 'Tomas', 'Grace', 'Eli', 'Ruth', 'Dario', 'Wren', 'Sam'];
const NOTES = [
  'Thank you for staying late to help me stack the chairs. It made the evening lighter.',
  'You greeted me by name at the door and it turned my whole day around.',
  'I am sorry I was short with you. Thank you for understanding before I even asked.',
  'You let me go first in line even though you had been waiting longer.',
  'Thank you for listening to my whole idea before sharing yours.',
  'You told me everything would go well, and you were right. Thank you for rooting for me.',
  'You noticed I was carrying too much and took two bags without a word.',
];

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function longMessage(seed: number): string {
  const opening = `Note ${seed}: thank you for the way you welcomed our whole family this week. `;
  const body = 'You saved us seats, learned every name, asked how the move was going, carried the heavy boxes without being asked, and told my daughter she was doing great. ';
  let text = opening;
  while ([...text].length < 500) text += body;
  const graphemes = [...text].slice(0, 499);
  return `${graphemes.join('').trimEnd().padEnd(499, '.')}!`;
}

type SampleRecord = ReturnType<typeof record>;
function record(n: number, overrides: Record<string, unknown> = {}) {
  const created = Date.parse('2026-09-10T17:30:00Z') - n * 17 * 60000;
  return {
    id: uuid(n + 1),
    recipient: `${FIRST[n % FIRST.length]} ${'ABCDEFGHJKLMNPRSTW'[n % 18]}.`,
    message: `${NOTES[n % NOTES.length]} (${n + 1})`,
    expressionIds: n % 3 === 0 ? [1 + (n % 9)] : [1 + (n % 4), 5 + (n % 5)],
    createdAt: new Date(created).toISOString(),
    firstPublishedAt: new Date(created).toISOString(),
    expiresAt: new Date(created + 7 * 86400000).toISOString(),
    version: 1,
    status: 'published',
    featured: false,
    ...overrides,
  };
}
const pool = (count: number) => Array.from({ length: count }, (_, n) => record(n));

const ORIGINAL_TEN = ['welcome', 'garden', 'featured', 'calendar', 'peacemakers', 'status', 'expressions', 'peace-in-practice', 'orbit', 'milestone'];
function playlist(liveFeedSeconds = 60, enabledIds: string[] | null = null) {
  return [...ORIGINAL_TEN, 'live-feed'].map((id) => ({
    id,
    enabled: enabledIds ? enabledIds.includes(id) : true,
    durationSeconds: id === 'live-feed' ? liveFeedSeconds : id === 'garden' ? 180 : 60,
  }));
}

function fixture(recognitions: SampleRecord[], options: { playlist?: unknown; settings?: Record<string, unknown> } = {}) {
  const base = buildActiveDisplayFixture() as any;
  return {
    ...base,
    serverTime: NOW,
    recognitions,
    settings: { ...base.settings, ...(options.settings ?? {}) },
    presentation: { ...base.presentation, enabled: true, playlist: options.playlist ?? playlist() },
  };
}

type Control = Record<string, unknown>;

/** Serves the renderer from this checkout and boots it over its own message channel. */
async function boot(page: Page, snapshot: any, control: Control = {}): Promise<Frame> {
  await page.addInitScript(() => {
    window.requestAnimationFrame = () => 0;
  });
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/probe') {
      return route.fulfill({
        contentType: 'text/html',
        body: '<html><body style="margin:0"><iframe title="Probe" sandbox="allow-scripts" referrerpolicy="no-referrer" src="/color-polish/renderer.html" style="width:100vw;height:100vh;border:0"></iframe></body></html>',
      });
    }
    if (!url.pathname.startsWith('/color-polish/') || url.pathname.includes('..')) return route.abort();
    const file = resolve(publicFolder, '.' + url.pathname);
    const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : 'image/png';
    try {
      await route.fulfill({ contentType: type, body: await readFile(file) });
    } catch {
      await route.abort();
    }
  });
  await page.goto('/probe');
  await page.evaluate(async () => {
    const frame = document.querySelector('iframe')!;
    const channel = new MessageChannel();
    const nonce = crypto.randomUUID();
    await new Promise<void>((done) => {
      channel.port1.onmessage = (event) => {
        if (event.data.type === 'color-polish:ready') done();
      };
      channel.port1.start();
      frame.contentWindow!.postMessage({ version: 'color-polish-v6', type: 'color-polish:bootstrap', nonce, sequence: 0 }, '*', [channel.port2]);
    });
    (window as any).probePort = channel.port1;
    (window as any).probeNonce = nonce;
    (window as any).probeSequence = 0;
  });
  await send(page, snapshot, control);
  const frame = page.frames().find((f) => f.url().endsWith('/color-polish/renderer.html'));
  if (!frame) throw new Error('renderer frame not found');
  return frame;
}

async function send(page: Page, snapshot: any, control: Control = {}) {
  const reactionCounts = Object.fromEntries(((snapshot?.recognitions ?? []) as SampleRecord[]).map((r, i) => [r.id, (i * 7) % 23]));
  await page.evaluate(
    ({ snapshot, control }) => {
      const w = window as any;
      w.probeSequence += 1;
      w.probePort.postMessage({ version: 'color-polish-v6', type: 'color-polish:update', nonce: w.probeNonce, sequence: w.probeSequence, snapshot, control });
    },
    {
      snapshot,
      control: { nowMs: Date.parse(NOW), status: 'ready', source: 'sample', playing: true, scene: 'live-feed', reactionCounts, qrDataUrl: QR, submissionUrl: 'https://mothers-love.vercel.app/recognize', ...control },
    },
  );
}

async function openLiveFeed(page: Page, recognitions: SampleRecord[], control: Control = {}, options: Parameters<typeof fixture>[1] = {}) {
  const frame = await boot(page, fixture(recognitions, options), control);
  await until(frame, (id) => {
    const state = (window as any).colorPolishRuntime?.getState();
    return state?.mode === 'normal' && state.scene === id;
  }, LIVE_FEED);
  return frame;
}

// The renderer's requestAnimationFrame is stubbed so time only moves through
// runtime.step; Playwright's own waitForFunction polls on animation frames, so waits
// here poll on a timer instead.
function until(frame: Frame, fn: (arg: any) => unknown, arg?: unknown, options?: { timeout?: number }) {
  return expect.poll(async () => Boolean(await frame.evaluate(fn as any, arg)), { timeout: options?.timeout ?? 60_000 }).toBe(true);
}

const step = (frame: Frame, ms: number) => frame.evaluate((t) => (window as any).colorPolishRuntime.step(t), ms);

/** Everything the assertions need, measured in 1920 x 1080 design pixels. */
async function measure(frame: Frame) {
  return frame.evaluate(() => {
    const tv = document.getElementById('tv')!.getBoundingClientRect();
    const scale = tv.width / 1920;
    const box = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: (r.left - tv.left) / scale, top: (r.top - tv.top) / scale, right: (r.right - tv.left) / scale, bottom: (r.bottom - tv.top) / scale, width: r.width / scale, height: r.height / scale };
    };
    const footer = document.querySelector('.footer') as HTMLElement;
    const lanes = [...document.querySelectorAll('.lf-lane')].map((lane) => {
      const laneBox = box(lane)!;
      const track = lane.querySelector('.lf-track') as HTMLElement | null;
      return {
        box: laneBox,
        transform: track?.style.transform ?? '',
        cards: [...lane.querySelectorAll('.chat-item')].map((card) => {
          const message = card.querySelector('.chat-message') as HTMLElement;
          const style = getComputedStyle(message);
          const name = card.querySelector('.chat-name') as HTMLElement;
          return {
            id: (card as HTMLElement).dataset.feedId!,
            box: box(card)!,
            name: name.textContent,
            nameFits: name.scrollWidth <= name.clientWidth + 1,
            message: message.textContent,
            messageBox: box(message)!,
            fontSize: parseFloat(style.fontSize),
            drawnFontSize: parseFloat(style.fontSize) * scale,
            fits: message.scrollWidth <= message.clientWidth + 1 && message.scrollHeight <= message.clientHeight + 1,
            clipped: style.textOverflow === 'ellipsis' || style.overflow !== 'visible' || (style as any).webkitLineClamp !== 'none' || style.whiteSpace === 'nowrap',
            chips: card.querySelectorAll('.chat-foot img').length,
            hasLike: !!card.querySelector('.chat-like'),
            hasTime: !!card.querySelector('time.chat-time'),
          };
        }),
      };
    });
    return {
      scale,
      state: (window as any).colorPolishRuntime.getState(),
      panel: box(document.querySelector('.lf-panel')),
      header: box(document.querySelector('.tv-header')),
      qr: box(document.querySelector('#lf-qr-img')),
      qrSrc: document.querySelector('#lf-qr-img')?.getAttribute('src') ?? null,
      qrLabel: document.querySelector('.lf-qr-label')?.textContent ?? '',
      title: document.querySelector('.lf-title span')?.textContent?.trim() ?? '',
      empty: document.querySelector('.lf-empty')?.textContent ?? null,
      footer: { visibility: getComputedStyle(footer).visibility, opacity: getComputedStyle(footer).opacity, text: footer.textContent ?? '' },
      railCardsVisible: getComputedStyle(footer).visibility !== 'hidden' ? footer.querySelectorAll('.chat-item').length : 0,
      stageText: document.getElementById('stage')!.textContent ?? '',
      lanes,
    };
  });
}

const offsetOf = (transform: string) => {
  const match = transform.match(/translate3d\(0(?:px)?,\s*(-?[\d.]+)px/);
  return match ? Math.abs(parseFloat(match[1])) : 0;
};

for (const viewport of [{ width: 1920, height: 1080, floor: 24 }, { width: 3840, height: 2160, floor: 48 }]) {
  test(`fills the screen from the header rule to the bottom, three readable columns, at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const records = pool(100);
    const frame = await openLiveFeed(page, records);
    for (const ms of [0, 6000, 8000, 7000]) {
      if (ms) await step(frame, ms);
      const m = await measure(frame);
      expect(m.state.scene).toBe(LIVE_FEED);
      expect(m.scale).toBeCloseTo(viewport.width / 1920, 3);
      // The panel starts just under the header's rule and keeps the rail's own left, right and bottom edges.
      expect(m.panel!.top).toBeGreaterThanOrEqual(m.header!.bottom + 8);
      expect(m.panel!.top).toBeLessThanOrEqual(m.header!.bottom + 24);
      expect(m.panel!.left).toBeCloseTo(34, 0);
      expect(m.panel!.right).toBeCloseTo(1886, 0);
      expect(m.panel!.bottom).toBeCloseTo(1055, 0);
      expect(m.title).toBe('LIVE RECOGNITIONS');
      expect(m.lanes).toHaveLength(3);
      for (const lane of m.lanes) {
        expect(lane.cards.length).toBeGreaterThanOrEqual(3);
        expect(lane.box.top).toBeGreaterThan(m.panel!.top);
        expect(lane.box.bottom).toBeLessThanOrEqual(m.panel!.bottom);
        for (const card of lane.cards) {
          const source = records.find((r) => r.id === card.id)!;
          expect(card.message).toBe(source.message);
          expect(card.name).toBe(source.recipient);
          expect(card.nameFits).toBe(true);
          expect(card.fontSize).toBeGreaterThanOrEqual(24);
          expect(card.drawnFontSize).toBeGreaterThanOrEqual(viewport.floor);
          expect(card.fits).toBe(true);
          expect(card.clipped).toBe(false);
          expect(card.box.left).toBeGreaterThanOrEqual(lane.box.left - 0.5);
          expect(card.box.right).toBeLessThanOrEqual(lane.box.right + 0.5);
          expect(card.messageBox.left).toBeGreaterThanOrEqual(card.box.left);
          expect(card.messageBox.right).toBeLessThanOrEqual(card.box.right);
          expect(card.chips).toBe(source.expressionIds.length);
          expect(card.hasLike).toBe(true);
          expect(card.hasTime).toBe(true);
          // Larger than the rail's card text (18 px).
          expect(card.fontSize).toBeGreaterThan(18);
        }
      }
    }
  });
}

test('the rail underneath fades away on this screen and comes back on the next one', async ({ page }) => {
  const frame = await openLiveFeed(page, pool(30));
  await expect.poll(async () => (await measure(frame)).footer.visibility, { timeout: 30_000 }).toBe('hidden');
  const onScreen = await measure(frame);
  expect(onScreen.footer.opacity).toBe('0');
  expect(onScreen.railCardsVisible).toBe(0);
  expect(onScreen.qr!.width).toBeGreaterThan(130);
  expect(onScreen.qrSrc).toBe(QR);
  expect(onScreen.qrLabel).toContain('Recognize');
  expect(onScreen.qrLabel).toContain('Someone');

  await frame.evaluate(() => (window as any).colorPolishRuntime.setScene(1));
  const during = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().transition);
  expect(during).not.toBeNull();
  expect(during.duration).toBeCloseTo(1.15, 2);
  await step(frame, 1300);
  await expect.poll(async () => (await measure(frame)).footer.opacity, { timeout: 30_000 }).toBe('1');
  const after = await measure(frame);
  expect(after.state.scene).toBe(1);
  expect(after.state.transition).toBeNull();
  expect(after.footer.visibility).toBe('visible');
  expect(after.panel).toBeNull();
  expect(after.railCardsVisible).toBeGreaterThan(0);
});

test('enters with the same fade as every other screen', async ({ page }) => {
  const frame = await boot(page, fixture(pool(12)), { scene: 'welcome' });
  await until(frame, () => (window as any).colorPolishRuntime?.getState().mode === 'normal');
  await frame.evaluate((id) => (window as any).colorPolishRuntime.setScene(id), LIVE_FEED);
  const start = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().transition);
  expect(start).not.toBeNull();
  expect(start.duration).toBeCloseTo(1.15, 2);
  await step(frame, 575);
  const halfway = await frame.evaluate(() => {
    const scenes = [...document.querySelectorAll<HTMLElement>('#stage > .scene')];
    return scenes.map((el) => ({ id: el.dataset.scene, opacity: parseFloat(el.style.opacity) }));
  });
  expect(halfway).toHaveLength(2);
  expect(halfway[1].id).toBe('12');
  expect(halfway[0].opacity).toBeCloseTo(0.5, 1);
  expect(halfway[1].opacity).toBeCloseTo(0.5, 1);
  await step(frame, 700);
  const done = await measure(frame);
  expect(done.state.transition).toBeNull();
  expect(done.state.scene).toBe(LIVE_FEED);
  expect(done.panel).not.toBeNull();
});

test('same records and order as the rail, newest first, and every one of 100 gets its turn', async ({ page }) => {
  const records = pool(100);
  const frame = await openLiveFeed(page, records);
  const first = await measure(frame);
  // Newest first across the three columns: column c opens with the c-th newest record.
  expect(first.lanes.map((lane) => lane.cards[0].id)).toEqual([records[0].id, records[1].id, records[2].id]);
  expect(first.lanes.map((lane) => lane.cards[1].id)).toEqual([records[3].id, records[4].id, records[5].id]);
  const seen = new Set<string>();
  const known = new Set(records.map((r) => r.id));
  for (let i = 0; i < 45; i++) {
    const m = await measure(frame);
    for (const lane of m.lanes) for (const card of lane.cards) {
      expect(known.has(card.id)).toBe(true);
      seen.add(card.id);
    }
    await step(frame, 10000);
  }
  expect(seen.size).toBe(100);
});

test('scrolls continuously at a calm pace and never while an arrival or a pause holds the screen', async ({ page }) => {
  const frame = await openLiveFeed(page, pool(60));
  const before = (await measure(frame)).lanes.map((lane) => offsetOf(lane.transform));
  await step(frame, 2000);
  const after = (await measure(frame)).lanes.map((lane) => offsetOf(lane.transform));
  after.forEach((value, index) => {
    const moved = value - before[index];
    expect(moved).toBeGreaterThan(30);
    expect(moved).toBeLessThan(70);
  });
  // Pause (the Studio's Pause button): the frame holds exactly where it is.
  await frame.evaluate(() => (window as any).colorPolishRuntime.setPlaying(false));
  const held = (await measure(frame)).lanes.map((lane) => lane.transform);
  await page.waitForTimeout(1200);
  expect((await measure(frame)).lanes.map((lane) => lane.transform)).toEqual(held);
});

test('500 grapheme messages are shown whole at 26 px, never shortened', async ({ page }) => {
  const records = Array.from({ length: 12 }, (_, n) => record(n, n % 3 === 0 ? { message: longMessage(n) } : {}));
  for (const r of records.filter((_, n) => n % 3 === 0)) expect([...r.message]).toHaveLength(500);
  const frame = await openLiveFeed(page, records);
  const longIds = new Set(records.filter((_, n) => n % 3 === 0).map((r) => r.id));
  const seenLong = new Set<string>();
  for (let i = 0; i < 12; i++) {
    const m = await measure(frame);
    for (const lane of m.lanes) for (const card of lane.cards) {
      const source = records.find((r) => r.id === card.id)!;
      expect(card.message).toBe(source.message);
      expect(card.fits).toBe(true);
      expect(card.clipped).toBe(false);
      expect(card.fontSize).toBeGreaterThanOrEqual(24);
      // The whole message sits inside its own card.
      expect(card.messageBox.top).toBeGreaterThanOrEqual(card.box.top);
      expect(card.messageBox.bottom).toBeLessThanOrEqual(card.box.bottom);
      if (longIds.has(card.id)) {
        seenLong.add(card.id);
        // A 500 grapheme card is shorter than a column, so it is whole on screen while it passes.
        expect(card.box.height).toBeLessThan(lane.box.height);
      }
    }
    await step(frame, 8000);
  }
  expect(seenLong.size).toBe(longIds.size);
});

test('three records sit still in three columns with nothing repeated', async ({ page }) => {
  const records = pool(3);
  const frame = await openLiveFeed(page, records);
  await step(frame, 14000);
  const m = await measure(frame);
  expect(m.lanes.map((lane) => lane.cards.map((card) => card.id))).toEqual([[records[0].id], [records[1].id], [records[2].id]]);
  for (const lane of m.lanes) {
    expect(offsetOf(lane.transform)).toBe(0);
    expect(lane.cards[0].box.top).toBeGreaterThanOrEqual(lane.box.top);
    expect(lane.cards[0].box.bottom).toBeLessThanOrEqual(lane.box.bottom);
  }
});

test('an empty feed shows a calm message and keeps the QR, not a blank panel', async ({ page }) => {
  const frame = await openLiveFeed(page, []);
  const m = await measure(frame);
  expect(m.panel).not.toBeNull();
  expect(m.lanes).toHaveLength(0);
  expect(m.empty).toContain('Kindness begins');
  expect(m.empty).toContain('No recognitions are currently cleared for display.');
  expect(m.qrSrc).toBe(QR);
  expect(m.title).toBe('LIVE RECOGNITIONS');
});

test('Neutral, Quiet and an unverified connection clear every name and message', async ({ page }) => {
  const records = pool(20);
  const frame = await openLiveFeed(page, records);
  expect((await measure(frame)).stageText).toContain(records[0].recipient);
  const cases: Array<{ label: string; snapshot: any; control: Control; mode: string }> = [
    { label: 'neutral', snapshot: fixture([], { settings: { mode: 'neutral' } }), control: { status: 'quiet' }, mode: 'neutral' },
    { label: 'quiet', snapshot: fixture([], { settings: { mode: 'quiet' } }), control: { status: 'quiet' }, mode: 'neutral' },
    { label: 'unavailable', snapshot: null, control: { status: 'unavailable' }, mode: 'offline' },
    { label: 'stale', snapshot: fixture(records), control: { status: 'checking' }, mode: 'offline' },
  ];
  for (const item of cases) {
    await send(page, fixture(records));
    await until(frame, () => document.querySelectorAll('.lf-panel .chat-item').length > 0);
    await send(page, item.snapshot, item.control);
    await until(frame, (mode) => (window as any).colorPolishRuntime.getState().mode === mode, item.mode);
    const text = await frame.evaluate(() => document.body.textContent ?? '');
    const counts = await frame.evaluate(() => ({ panel: document.querySelectorAll('.lf-panel').length, cards: document.querySelectorAll('.chat-item').length, ids: document.querySelectorAll('[data-feed-id]').length }));
    expect(counts, item.label).toEqual({ panel: 0, cards: 0, ids: 0 });
    for (const r of records) {
      expect(text.includes(r.recipient), `${item.label} ${r.recipient}`).toBe(false);
      expect(text.includes(r.message), `${item.label} message`).toBe(false);
    }
    // The rail is back with its own paused notice; this screen's panel is gone.
    await expect.poll(async () => (await measure(frame)).footer.visibility, { timeout: 30_000 }).toBe('visible');
    expect((await measure(frame)).footer.text).toContain('Recognition feed paused');
  }
});

test('expired records leave the screen, and when all have expired the calm empty state takes over', async ({ page }) => {
  const soon = new Date(Date.parse(NOW) + 60_000).toISOString();
  const records = pool(6).map((r, n) => (n < 2 ? r : { ...r, expiresAt: soon }));
  const frame = await openLiveFeed(page, records);
  expect((await measure(frame)).lanes.flatMap((lane) => lane.cards).length).toBe(6);
  // Two minutes later on the verified clock: four of the six have expired.
  await send(page, fixture(records), { nowMs: Date.parse(NOW) + 120_000 });
  await step(frame, 1200);
  const partly = await measure(frame);
  expect(partly.lanes.flatMap((lane) => lane.cards.map((card) => card.id)).sort()).toEqual([records[0].id, records[1].id].sort());
  // All expired.
  const allSoon = pool(6).map((r) => ({ ...r, expiresAt: soon }));
  await send(page, fixture(allSoon), { nowMs: Date.parse(NOW) });
  await until(frame, () => document.querySelectorAll('.lf-panel .chat-item').length === 6);
  await send(page, fixture(allSoon), { nowMs: Date.parse(NOW) + 120_000 });
  await step(frame, 1200);
  await expect.poll(async () => (await measure(frame)).empty, { timeout: 30_000 }).toContain('Kindness begins');
  expect(await frame.evaluate(() => document.querySelectorAll('[data-feed-id]').length)).toBe(0);
});

test('a new recognition joins without reshuffling the columns', async ({ page }) => {
  const records = pool(30);
  const frame = await openLiveFeed(page, records);
  await step(frame, 9000);
  const columnOf = async () => frame.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>('.lf-lane')].flatMap((lane) => [...lane.querySelectorAll<HTMLElement>('.chat-item')].map((card) => [card.dataset.feedId!, lane.dataset.lane!]))));
  const before = await columnOf();
  const beforeOffsets = (await measure(frame)).lanes.map((lane) => offsetOf(lane.transform));
  const newcomer = record(200, { id: uuid(999), createdAt: '2026-09-10T17:59:00.000Z', firstPublishedAt: '2026-09-10T17:59:00.000Z', expiresAt: '2026-09-17T17:59:00.000Z', recipient: 'Newly Arrived N.' });
  await send(page, fixture([newcomer, ...records]));
  await until(frame, () => (window as any).colorPolishRuntime.getState().scene === 12 && document.querySelectorAll('.lf-panel .chat-item').length > 0);
  const after = await columnOf();
  for (const [id, lane] of Object.entries(before)) if (after[id] !== undefined) expect(after[id]).toBe(lane);
  // The view picks up where it was instead of jumping back to the top.
  const afterOffsets = (await measure(frame)).lanes.map((lane) => offsetOf(lane.transform));
  afterOffsets.forEach((value, index) => expect(Math.abs(value - beforeOffsets[index])).toBeLessThan(2));
  // The newcomer is queued to appear next in its column.
  let shown = false;
  for (let i = 0; i < 10 && !shown; i++) {
    shown = (await measure(frame)).lanes.some((lane) => lane.cards.some((card) => card.id === newcomer.id));
    if (!shown) await step(frame, 3000);
  }
  expect(shown).toBe(true);
});

test('dwell comes from the saved playlist: last in the rotation, then back to Welcome', async ({ page }) => {
  const list = playlist(33, ['welcome', 'live-feed']).map((entry) => (entry.id === 'welcome' ? { ...entry, durationSeconds: 12 } : entry));
  const frame = await boot(page, fixture(pool(20), { playlist: list }), { scene: undefined, source: 'live' });
  await until(frame, () => (window as any).colorPolishRuntime?.getState().mode === 'normal');
  const state = () => frame.evaluate(() => (window as any).colorPolishRuntime.getState());
  expect((await state()).scene).toBe(1);
  expect((await state()).visual.dwell[12]).toBe(33);
  await step(frame, 12100 + 1300);
  expect((await state()).scene).toBe(LIVE_FEED);
  const age = (await state()).sceneAge;
  // Still on screen just before 33 seconds, gone just after.
  await step(frame, (32.5 - age) * 1000);
  expect((await state()).scene).toBe(LIVE_FEED);
  expect(await frame.evaluate(() => document.getElementById('scene-countdown-number')?.textContent)).toBe('1');
  await step(frame, 1200 + 1300);
  expect((await state()).scene).toBe(1);
});

test('a disabled live-feed entry keeps the screen out of the rotation', async ({ page }) => {
  const list = playlist(60, ['welcome', 'garden']).map((entry) => ({ ...entry, durationSeconds: 12 }));
  const frame = await boot(page, fixture(pool(20), { playlist: list }), { scene: undefined, source: 'live' });
  await until(frame, () => (window as any).colorPolishRuntime?.getState().mode === 'normal');
  const visited = new Set<number>();
  for (let i = 0; i < 12; i++) {
    visited.add(await frame.evaluate(() => (window as any).colorPolishRuntime.getState().scene));
    await step(frame, 5000);
  }
  expect([...visited].sort()).toEqual([1, 2]);
});

test('reduced motion: no scroll, whole cards only, pages change with a fade', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Dwell 60 s from the playlist gives a 12 second page (one fifth of the dwell).
  const frame = await openLiveFeed(page, pool(60), {}, { playlist: playlist(60) });
  // Record every class change on the columns, so the fade is seen even when it
  // falls between two polls.
  await frame.evaluate(() => {
    const lanes = document.querySelector('.lf-lanes')!;
    (window as any).lfClassLog = [];
    new MutationObserver(() => (window as any).lfClassLog.push(lanes.classList.contains('lf-turning'))).observe(lanes, { attributes: true, attributeFilter: ['class'] });
  });
  const first = await measure(frame);
  expect(first.state.still).toBe(true);
  for (const lane of first.lanes) {
    expect(offsetOf(lane.transform)).toBe(0);
    expect(lane.cards.length).toBeGreaterThanOrEqual(2);
    for (const card of lane.cards) {
      expect(card.box.top).toBeGreaterThanOrEqual(lane.box.top);
      expect(card.box.bottom).toBeLessThanOrEqual(lane.box.bottom);
    }
  }
  const firstIds = first.lanes.map((lane) => lane.cards.map((card) => card.id));
  // Stepping the clock moves nothing in reduced motion.
  await step(frame, 5000);
  const held = await measure(frame);
  expect(held.lanes.map((lane) => lane.cards.map((card) => card.id))).toEqual(firstIds);
  expect(held.lanes.map((lane) => lane.cards.map((card) => card.box.top))).toEqual(first.lanes.map((lane) => lane.cards.map((card) => card.box.top)));
  const transition = await frame.evaluate(() => {
    const style = getComputedStyle(document.querySelector('.lf-lanes')!);
    return { property: style.transitionProperty, duration: style.transitionDuration };
  });
  expect(transition.property).toContain('opacity');
  expect(parseFloat(transition.duration)).toBeGreaterThan(0.3);
  // The turn: the columns fade out (lf-turning on), the next whole cards fade in (off).
  await until(frame, () => (window as any).colorPolishRuntime.getState().log.some((entry: any) => entry.type === 'live_feed_page'));
  const second = await measure(frame);
  const turns = second.state.log.filter((entry: any) => entry.type === 'live_feed_page').length;
  expect(turns).toBe(1);
  expect(await frame.evaluate(() => (window as any).lfClassLog)).toEqual([true, false]);
  second.lanes.forEach((lane, index) => {
    expect(offsetOf(lane.transform)).toBe(0);
    // The next page starts right after the last card of the page before.
    const column = pool(60).filter((_, n) => n % 3 === index).map((r) => r.id);
    expect(lane.cards[0].id).toBe(column[firstIds[index].length]);
    for (const card of lane.cards) {
      expect(card.box.top).toBeGreaterThanOrEqual(lane.box.top);
      expect(card.box.bottom).toBeLessThanOrEqual(lane.box.bottom);
    }
  });
});

test('Studio lists Live Recognitions and previews it with fictional sample content', async ({ page }) => {
  await page.route('**/api/**', (route) => fulfillJson(route, { items: [] }));
  await page.route('**/api/display/color-polish**', (route) => fulfillJson(route, buildActiveDisplayFixture()));
  await mockCommon(page);
  await signInAs(page);
  await page.goto('/admin/display');
  await expect(page.getByTestId('color-polish-studio')).toBeVisible();
  const selector = page.getByLabel('Color Polish preview scene');
  const options = await selector.locator('option').evaluateAll((nodes) => nodes.map((node) => ({ value: (node as HTMLOptionElement).value, label: node.textContent })));
  expect(options).toHaveLength(11);
  expect(options[10]).toEqual({ value: 'live-feed', label: 'Live Recognitions' });
  await selector.selectOption('live-feed');
  await expect.poll(() => page.frames().some((f) => f.url().endsWith('/color-polish/renderer.html'))).toBe(true);
  const frame = page.frames().find((f) => f.url().endsWith('/color-polish/renderer.html'))!;
  await until(frame, (id) => {
    const state = (window as any).colorPolishRuntime?.getState();
    return state?.mode === 'normal' && state.scene === id;
  }, LIVE_FEED);
  await expect(frame.locator('.lf-panel .chat-item').first()).toBeVisible();
  await expect(page.getByText(/Live Recognitions scene, \d+ of 60 seconds/)).toBeVisible();
  // A click in the Studio preview never advances the scene.
  await frame.locator('body').click();
  await page.waitForTimeout(300);
  expect(await frame.evaluate(() => (window as any).colorPolishRuntime.getState().scene)).toBe(LIVE_FEED);
});
