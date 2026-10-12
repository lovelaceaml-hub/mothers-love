import { expect, test, type Frame, type Page } from '@playwright/test';
import { buildActiveDisplayFixture, fulfillJson } from '../color-polish-scenes/helpers';
import type { ColorPolishSnapshot } from '@/lib/color-polish/contracts';

const NOW = '2026-09-10T18:00:00.000Z';
const token = (n: number) => n.toString(16).padStart(32, '0');
const cacheCursor = (n = 1) => `v2:${token(n)}:1789063200:12.1789063200`;
const base = buildActiveDisplayFixture() as unknown as ColorPolishSnapshot;
const pool = base.recognitions.map((record, n) => ({ id: record.id, token: token(n + 10) }));
const reset = () => ({ ok: true, cacheCursor: cacheCursor(), serverTime: NOW, unchanged: false, pool, snapshot: base });
test.describe.configure({ timeout: 120000 });

async function arrivalState(frame: Frame) {
  return frame.evaluate(() => (window as unknown as {
    colorPolishRuntime: { getState(): {
      active: { kind: string; phase: string; ids: string[] } | null;
      queueLength: number;
      log: { type: string; ids?: string[] }[];
    } };
  }).colorPolishRuntime.getState());
}

async function readyRenderer(page: Page): Promise<Frame> {
  await expect.poll(() => page.frames().some((frame) => frame.url().endsWith('/color-polish/renderer.html'))).toBe(true);
  const frame = page.frames().find((item) => item.url().endsWith('/color-polish/renderer.html'))!;
  await expect.poll(async () => {
    await page.clock.runFor(50);
    return frame.evaluate(() => (window as unknown as {
      colorPolishRuntime?: { getState(): { mode: string } };
    }).colorPolishRuntime?.getState().mode);
  }).toBe('normal');
  return frame;
}

async function visibility(page: Page, hidden: boolean) {
  await page.evaluate((next) => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: next });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: next ? 'hidden' : 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

test('unchanged polls stay live, preserve the iframe, stop hidden requests, and reset after stale reconnection', async ({ page }) => {
  await page.clock.install({ time: new Date(NOW) });
  let snapshotRequests = 0;
  let likesRequests = 0;
  let failed = false;
  const paths: string[] = [];
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/display/likes-total') { likesRequests++; return fulfillJson(route, { total: 18 }); }
    if (url.pathname === '/api/display/snapshot') return fulfillJson(route, { ok: false, code: 'UNAVAILABLE' }, 503);
    if (url.pathname !== '/api/display/color-polish') return fulfillJson(route, { items: [] });
    snapshotRequests++;
    paths.push(url.search);
    if (failed) return fulfillJson(route, { ok: false }, 503);
    const serverTime = await page.evaluate(() => new Date().toISOString());
    return fulfillJson(route, url.searchParams.has('after')
      ? { ok: true, unchanged: true, cacheCursor: cacheCursor(), serverTime }
      : { ...reset(), serverTime, snapshot: { ...base, serverTime } });
  });
  await page.goto('/display');
  const display = page.locator('[data-display-phase="active"]');
  await expect(display).toBeVisible();
  await expect(display.locator('iframe')).toHaveCount(1);
  await display.locator('iframe').evaluate((frame) => frame.setAttribute('data-cache-test', 'same-frame'));
  // More than 60 seconds of successful unchanged verifications must not expire
  // personal content or remount its renderer.
  for (let n = 0; n < 14; n++) {
    const before = snapshotRequests;
    const response = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/display/color-polish');
    await page.clock.fastForward(5000);
    await response;
    await page.clock.runFor(1);
    await expect.poll(() => snapshotRequests).toBeGreaterThan(before);
  }
  await expect(display).toBeVisible();
  await expect(display.locator('iframe')).toHaveAttribute('data-cache-test', 'same-frame');
  expect(paths.at(-1)).toContain('known=');
  await visibility(page, true);
  await page.waitForTimeout(10);
  const hiddenRequests = snapshotRequests;
  const hiddenLikes = likesRequests;
  await page.clock.fastForward(20000);
  expect(snapshotRequests).toBe(hiddenRequests);
  expect(likesRequests).toBe(hiddenLikes);
  const returned = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/display/color-polish');
  await visibility(page, false);
  await returned;
  await page.clock.runFor(1000);
  await expect.poll(() => snapshotRequests).toBeGreaterThan(hiddenRequests);
  await expect(display.locator('iframe')).toHaveAttribute('data-cache-test', 'same-frame');
  failed = true;
  const outage = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/display/color-polish' && response.status() === 503);
  await page.clock.runFor(5000);
  await outage;
  await page.clock.fastForward(65000);
  await page.clock.runFor(250);
  await expect(page.locator('[data-display-phase="unavailable"]')).toBeVisible();
  failed = false;
  const beforeReset = snapshotRequests;
  await page.clock.runFor(5000);
  await expect.poll(() => snapshotRequests).toBeGreaterThan(beforeReset);
  await expect(display).toBeVisible();
  expect(paths.at(-1)).toBe('?sync=2');
  await visibility(page, true);
  const beforeHiddenGap = snapshotRequests;
  await page.clock.fastForward(65000);
  expect(snapshotRequests).toBe(beforeHiddenGap);
  const resumed = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/display/color-polish');
  await visibility(page, false);
  await resumed;
  await expect(display).toBeVisible();
  expect(paths.at(-1)).toBe('?sync=2');
});

test('the next five-second poll merges an arrival and applies a quiet-mode withdrawal', async ({ page }) => {
  await page.clock.install({ time: new Date(NOW) });
  let stage = 0;
  const newRecord = { ...base.recognitions[0], id: '00000000-0000-4000-8000-000000009999', recipient: 'Fictional arrival' };
  await page.route('**/api/**', async (route) => {
    if (new URL(route.request().url()).pathname !== '/api/display/color-polish') return fulfillJson(route, { items: [] });
    const serverTime = await page.evaluate(() => new Date().toISOString());
    if (stage === 0) return fulfillJson(route, reset());
    return fulfillJson(route, { ok: true, unchanged: false, cacheCursor: cacheCursor(stage + 1), serverTime,
      pool: stage === 1 ? [{ id: newRecord.id, token: token(99) }, ...pool] : [],
      snapshot: { ...base, serverTime, sync: stage === 1 ? 'delta' : 'reset',
        recognitions: stage === 1 ? [newRecord] : [],
        arrivals: stage === 1 ? [{ eventId: '13', recognitionId: newRecord.id, publishedAt: serverTime }] : [],
        settings: { ...base.settings, mode: stage === 1 ? 'normal' : 'quiet' } } });
  });
  await page.goto('/display');
  await expect(page.locator('[data-display-phase="active"]')).toBeVisible();
  const frame = await readyRenderer(page);
  stage = 1;
  await page.clock.runFor(5000);
  const renderer = page.frameLocator('iframe');
  await expect(renderer.locator('body')).toContainText('Fictional arrival');
  await page.clock.runFor(1000);
  await expect.poll(async () => (await arrivalState(frame)).active?.ids).toEqual([newRecord.id]);
  expect((await arrivalState(frame)).active?.kind).toBe('single');
  stage = 2;
  await page.clock.runFor(5000);
  await expect(page.locator('[data-display-phase="quiet"]')).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('a cached delta starts one group overlay, unchanged polls preserve it, and moderation cancels it', async ({ page }) => {
  await page.clock.install({ time: new Date(NOW) });
  let stage = 0;
  let snapshotRequests = 0;
  const records = Array.from({ length: 5 }, (_, n) => ({ ...base.recognitions[0],
    id: `00000000-0000-4000-8000-${(9000 + n).toString().padStart(12, '0')}`,
    recipient: `Fictional group arrival ${n + 1}`, message: `Thank you for fictional kindness ${n + 1}.` }));
  const groupPool = records.map((record, n) => ({ id: record.id, token: token(90 + n) }));
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== '/api/display/color-polish') return fulfillJson(route, { items: [] });
    snapshotRequests++;
    const serverTime = await page.evaluate(() => new Date().toISOString());
    if (stage === 0) return fulfillJson(route, { ...reset(), serverTime, snapshot: { ...base, serverTime } });
    expect(url.searchParams.get('known')).toBeTruthy();
    if (stage === 2) return fulfillJson(route, { ok: true, unchanged: true, cacheCursor: cacheCursor(2), serverTime });
    return fulfillJson(route, { ok: true, unchanged: false, cacheCursor: cacheCursor(stage + 1), serverTime,
      pool: [...(stage === 1 ? groupPool : groupPool.slice(1)), ...pool],
      snapshot: { ...base, serverTime, sync: 'delta', recognitions: stage === 1 ? records : [],
        arrivals: stage === 1 ? records.map((record, n) => ({ eventId: String(13 + n), recognitionId: record.id, publishedAt: serverTime })) : [] } });
  });
  await page.goto('/display');
  await expect(page.locator('[data-display-phase="active"] iframe')).toHaveCount(1);
  const frame = await readyRenderer(page);
  await expect.poll(async () => (await arrivalState(frame)).active).toBeNull();
  stage = 1;
  await page.clock.runFor(5000);
  await expect.poll(() => snapshotRequests).toBeGreaterThanOrEqual(2);
  await page.clock.runFor(1000);
  const ids = records.map((record) => record.id);
  await expect.poll(async () => (await arrivalState(frame)).active?.ids).toEqual(ids);
  expect((await arrivalState(frame)).active?.kind).toBe('group');
  for (const record of records) await expect(frame.locator('#event')).toContainText(record.recipient);
  stage = 2;
  await page.clock.runFor(15000);
  const preserved = await arrivalState(frame);
  expect(preserved.active?.ids).toEqual(ids);
  expect(preserved.queueLength).toBe(0);
  expect(preserved.log.filter((item) => item.type === 'entrance_start' && item.ids?.some((id) => ids.includes(id)))).toHaveLength(1);
  stage = 3;
  await page.clock.runFor(5000);
  await expect.poll(async () => (await arrivalState(frame)).active).toBeNull();
  await expect(frame.locator('body')).not.toContainText(records[0].recipient);
  expect((await arrivalState(frame)).queueLength).toBe(0);
});

test('disabled Color Polish reuses its verified snapshot instead of starting a second snapshot loop', async ({ page }) => {
  await page.clock.install({ time: new Date(NOW) });
  let legacyRequests = 0;
  let snapshotRequests = 0;
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/display/snapshot') legacyRequests++;
    if (path === '/api/display/color-polish') {
      snapshotRequests++;
      return fulfillJson(route, { ...base, presentation: { ...base.presentation, enabled: false } });
    }
    return fulfillJson(route, { items: [] });
  });
  await page.goto('/display');
  await expect(page.locator('[data-display-phase="disabled"] [data-testid="display-v6"]')).toBeVisible();
  await page.clock.runFor(15000);
  expect(snapshotRequests).toBeGreaterThanOrEqual(2);
  expect(legacyRequests).toBe(0);
});

test('slow likes and reaction reads do not duplicate on visibility changes or clear the confirmed total', async ({ page }) => {
  await page.clock.install({ time: new Date(NOW) });
  await page.clock.pauseAt(new Date(NOW));
  let likesRequests = 0;
  let reactionRequests = 0;
  let releaseLikes!: () => void;
  let releaseReactions!: () => void;
  const likesGate = new Promise<void>((resolve) => { releaseLikes = resolve; });
  const reactionGate = new Promise<void>((resolve) => { releaseReactions = resolve; });
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/display/color-polish') {
      const includeLikesTotal = url.searchParams.get('includeLikesTotal') === '1';
      if (includeLikesTotal) {
        likesRequests++;
        if (likesRequests === 2) await likesGate;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: includeLikesTotal ? { 'X-Likes-Total': String(likesRequests === 1 ? 250 : 251) } : {},
        body: JSON.stringify(reset()),
      });
      return;
    }
    if (url.pathname === '/api/display/likes-total') {
      likesRequests++;
      if (likesRequests === 2) await likesGate;
      return fulfillJson(route, { total: likesRequests === 1 ? 250 : 251 });
    }
    if (url.pathname === '/api/reactions') {
      reactionRequests++;
      await reactionGate;
      return fulfillJson(route, { items: [] });
    }
    return fulfillJson(route, { items: [] });
  });
  await page.goto('/display');
  const frame = await readyRenderer(page);
  const total = async () => {
    await page.clock.fastForward(50);
    return frame.evaluate(() => (window as unknown as { reactionTotal(): number }).reactionTotal());
  };
  await expect.poll(total).toBe(250);
  await expect.poll(() => reactionRequests).toBeGreaterThan(0);
  const initialReactions = reactionRequests;
  for (let n = 0; n < 3; n++) { await visibility(page, true); await visibility(page, false); }
  expect(reactionRequests).toBe(initialReactions);
  expect(likesRequests).toBe(1);
  releaseReactions();
  await page.clock.fastForward(10_000);
  await expect.poll(() => likesRequests).toBe(2);
  for (let n = 0; n < 3; n++) { await visibility(page, true); await visibility(page, false); }
  await page.clock.fastForward(5000);
  expect(likesRequests).toBe(2);
  expect(await total()).toBe(250);
  releaseLikes();
  await expect.poll(total).toBe(251);
});

test('unavailable-preset fallback pauses its reads while hidden and refreshes immediately on return', async ({ page }) => {
  await page.clock.install({ time: new Date(NOW) });
  let legacyRequests = 0;
  let dailyRequests = 0;
  let reactionRequests = 0;
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/display/color-polish') return fulfillJson(route, { ok: false }, 503);
    if (path === '/api/display/snapshot') { legacyRequests++; return fulfillJson(route, base); }
    if (path === '/api/display/daily') dailyRequests++;
    if (path === '/api/reactions') reactionRequests++;
    return fulfillJson(route, { items: [] });
  });
  await page.goto('/display');
  await expect(page.getByTestId('display-v6')).toBeVisible();
  await expect.poll(() => legacyRequests).toBeGreaterThan(0);
  await page.clock.runFor(5000);
  await expect.poll(() => legacyRequests).toBeGreaterThan(1);
  await visibility(page, true);
  const hidden = { legacyRequests, dailyRequests, reactionRequests };
  await page.clock.runFor(20000);
  expect({ legacyRequests, dailyRequests, reactionRequests }).toEqual(hidden);
  await visibility(page, false);
  await expect.poll(() => legacyRequests).toBe(hidden.legacyRequests + 1);
});
