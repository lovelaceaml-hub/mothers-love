import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { DISPLAY_EXTERNAL_URLS, DISPLAY_SCREEN_IDS } from '@/lib/contracts';
import {
  PLAN08_SCREEN_LABELS,
  snapshotWithLargeActiveSet,
  syntheticSnapshot,
} from './display-fixtures';

type SnapshotRouteResult = {
  snapshotRequests: string[];
  reactionRequests: string[][];
  pairingRequests: string[];
};

async function routeReactionCounts(page: Page, reactionRequests: string[][]) {
  await page.route('**/api/reactions**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const ids = new URL(route.request().url()).searchParams.get('ids')?.split(',').filter(Boolean) ?? [];
    reactionRequests.push(ids);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: ids.map((id) => ({ id, count: 0, liked: false })) }),
    });
  });
}

async function routeSnapshot(page: Page, response: unknown, result: SnapshotRouteResult, responseForCall?: (call: number, initialResponse: unknown) => unknown) {
  let calls = 0;
  await page.route('**/api/display/snapshot**', async (route) => {
    calls += 1;
    result.snapshotRequests.push(route.request().url());
    const body = responseForCall?.(calls, response) ?? response;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

async function openSyntheticDisplay(page: Page, response: unknown, responseForCall?: (call: number, initialResponse: unknown) => unknown): Promise<SnapshotRouteResult> {
  const result: SnapshotRouteResult = { snapshotRequests: [], reactionRequests: [], pairingRequests: [] };
  page.on('request', (request) => {
    if (/\/api\/display\/(pair|ack)/.test(request.url())) result.pairingRequests.push(request.url());
  });
  await routeReactionCounts(page, result.reactionRequests);
  await routeSnapshot(page, response, result, responseForCall);
  await page.goto('/display', { waitUntil: 'commit' });
  const display = page.getByTestId('display-app');
  await expect(display).toBeVisible();
  const cursor = typeof response === 'object' && response !== null && 'cursor' in response && typeof response.cursor === 'string'
    ? response.cursor
    : null;
  if (cursor) await expect(display).toHaveAttribute('data-cursor', cursor, { timeout: 15_000 });
  return result;
}

async function expectNoAccessibilityViolations(page: Page, excludedSelectors: string[] = []) {
  const builder = new AxeBuilder({ page: page as never });
  for (const selector of excludedSelectors) builder.exclude(selector);
  const results = await builder.analyze();
  expect(results.violations).toEqual([]);
}

test.describe('Plan 08 TV Garden synthetic browser coverage', () => {
  test.describe.configure({ mode: 'serial' });

  test('keeps the fixed registry, official destinations, and direct display access explicit', async ({ page }) => {
    const snapshot = syntheticSnapshot({ count: 2 });
    expect(snapshot.settings.playlist?.map((entry) => entry.id)).toEqual([...DISPLAY_SCREEN_IDS]);
    expect(snapshot.settings.playlist?.every((entry) => entry.enabled)).toBe(true);
    expect(snapshot.settings.externalUrls).toEqual(DISPLAY_EXTERNAL_URLS);
    expect(Object.keys(snapshot.recognitions[0] ?? {}).sort()).toEqual([
      'createdAt',
      'expiresAt',
      'expressionIds',
      'featured',
      'firstPublishedAt',
      'id',
      'message',
      'recipient',
      'status',
      'version',
    ]);
    expect(Object.keys(PLAN08_SCREEN_LABELS)).toEqual([...DISPLAY_SCREEN_IDS]);

    const result = await openSyntheticDisplay(page, snapshot);
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-cursor', snapshot.cursor);
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-eligible-count', '2');
    expect(result.pairingRequests).toEqual([]);
  });

  test('does not navigate to an untrusted QR destination or expose it as a link', async ({ page }) => {
    const hostileUrl = 'https://attacker.invalid/collect?recipient=synthetic';
    const hostileRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().startsWith(hostileUrl)) hostileRequests.push(request.url());
    });

    const result = await openSyntheticDisplay(page, syntheticSnapshot({ submissionUrl: hostileUrl }));
    const qrDock = page.getByLabel('Share a recognition');
    await expect(qrDock).toBeVisible();
    await expect(qrDock.locator('a')).toHaveCount(0);
    await expect(page.locator(`a[href^="${hostileUrl}"]`)).toHaveCount(0);
    await expect(qrDock.locator('img')).toHaveAttribute('src', /^data:image\//);
    expect(hostileRequests).toEqual([]);
    expect(result.pairingRequests).toEqual([]);
  });

  test('renders nine waiting buds in the empty Garden without personal content', async ({ page }) => {
    await openSyntheticDisplay(page, syntheticSnapshot({ count: 0 }));
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-screen', 'garden');
    await expect(page.getByTestId('waiting-buds')).toBeVisible();
    await expect(page.getByTestId('waiting-buds').locator('div').first().locator('span')).toHaveCount(9);
    await expect(page.getByText('Synthetic recipient 1')).toHaveCount(0);
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-eligible-count', '0');
    await expectNoAccessibilityViolations(page);
  });

  test('shows a safe startup reconnecting state after a temporary snapshot failure', async ({ page }) => {
    const result: SnapshotRouteResult = { snapshotRequests: [], reactionRequests: [], pairingRequests: [] };
    page.on('request', (request) => {
      if (/\/api\/display\/(pair|ack)/.test(request.url())) result.pairingRequests.push(request.url());
    });
    await routeReactionCounts(page, result.reactionRequests);
    await page.route('**/api/display/snapshot**', async (route) => {
      result.snapshotRequests.push(route.request().url());
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'unavailable', code: 'UNAVAILABLE' }),
      });
    });

    await page.goto('/display', { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: 'The display is temporarily unavailable.' })).toBeVisible();
    await expect(page.getByLabel('Display code')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Connect this display/ })).toHaveCount(0);
    await expect(page.getByText('Synthetic recipient 1')).toHaveCount(0);
    await expectNoAccessibilityViolations(page);
    expect(result.pairingRequests).toEqual([]);
  });

  test('keeps approved Garden content moving and labels the temporary reconnect after a prior success', async ({ page }) => {
    const result: SnapshotRouteResult = { snapshotRequests: [], reactionRequests: [], pairingRequests: [] };
    page.on('request', (request) => {
      if (/\/api\/display\/(pair|ack)/.test(request.url())) result.pairingRequests.push(request.url());
    });
    await routeReactionCounts(page, result.reactionRequests);
    let calls = 0;
    await page.route('**/api/display/snapshot**', async (route) => {
      calls += 1;
      result.snapshotRequests.push(route.request().url());
      if (calls <= 2) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(syntheticSnapshot({ count: 1 })) });
        return;
      }
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'unavailable', code: 'UNAVAILABLE' }),
      });
    });

    await page.goto('/display', { waitUntil: 'commit' });
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-cursor', 'synthetic-plan08-1', { timeout: 15_000 });
    await expect(page.getByText('Synthetic recipient 1')).toBeVisible();
    await expect.poll(() => calls, { timeout: 15_000 }).toBeGreaterThanOrEqual(3);
    await expect(page.getByText('Reconnecting', { exact: true })).toBeVisible();
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-screen', 'garden');
    await expect(page.getByText('Synthetic recipient 1')).toBeVisible();
    await expectNoAccessibilityViolations(page);
    expect(result.pairingRequests).toEqual([]);
  });

  test('maps reduced motion to still composition and removes CSS animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openSyntheticDisplay(page, syntheticSnapshot({ settings: { motion: 'standard' } }));
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-motion', 'still');
    const animationName = await page.locator('[data-motion-key]').first().evaluate((element) => getComputedStyle(element).animationName);
    expect(animationName).toBe('none');
    await expectNoAccessibilityViolations(page);
  });

  test('keeps a large active set bounded and chunks reaction requests at thirty IDs', async ({ page }) => {
    const snapshot = snapshotWithLargeActiveSet(96);
    const result = await openSyntheticDisplay(page, snapshot);
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-eligible-count', '96');
    await expect.poll(() => result.reactionRequests.length).toBeGreaterThan(0);
    await expect(page.getByTestId('garden-card').count()).resolves.toBeLessThanOrEqual(12);
    expect(result.reactionRequests.every((ids) => ids.length <= 30)).toBe(true);
    expect(result.snapshotRequests[0]).toMatch(/\/api\/display\/snapshot$/);
    expect(result.pairingRequests).toEqual([]);
  });

  test('keeps the Garden inside 1920 by 1080 and 3840 by 2160 viewports', async ({ page }) => {
    const snapshot = syntheticSnapshot({ count: 6 });
    await routeReactionCounts(page, []);
    await page.route('**/api/display/snapshot**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(snapshot) });
    });

    for (const viewport of [{ width: 1920, height: 1080 }, { width: 3840, height: 2160 }]) {
      await page.setViewportSize(viewport);
      await page.goto('/display', { waitUntil: 'commit' });
      await expect(page.getByTestId('display-app')).toHaveAttribute('data-cursor', snapshot.cursor, { timeout: 15_000 });
      await expect(page.getByTestId('display-app')).toHaveAttribute('data-screen', 'garden');
      const metrics = await page.evaluate(() => {
        const app = document.querySelector<HTMLElement>('[data-testid="display-app"]')?.getBoundingClientRect();
        const board = document.querySelector<HTMLElement>('[data-testid="garden-board"]')?.getBoundingClientRect();
        const bubbles = [...document.querySelectorAll<HTMLElement>('[data-testid="garden-card-slot"]')].map((element) => {
          const rect = element.getBoundingClientRect();
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
        });
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          documentWidth: document.documentElement.scrollWidth,
          documentHeight: document.documentElement.scrollHeight,
          app: app ? { left: app.left, right: app.right, top: app.top, bottom: app.bottom } : null,
          board: board ? { left: board.left, right: board.right, top: board.top, bottom: board.bottom } : null,
          bubbles,
        };
      });
      expect(metrics.viewport).toEqual(viewport);
      expect(metrics.documentWidth).toBeLessThanOrEqual(viewport.width);
      expect(metrics.documentHeight).toBeLessThanOrEqual(viewport.height + 2);
      expect(metrics.app).not.toBeNull();
      expect(metrics.board).not.toBeNull();
      for (const bubble of metrics.bubbles) {
        expect(bubble.left).toBeGreaterThanOrEqual(metrics.board!.left - 2);
        expect(bubble.right).toBeLessThanOrEqual(metrics.board!.right + 2);
        expect(bubble.top).toBeGreaterThanOrEqual(metrics.board!.top - 2);
        expect(bubble.bottom).toBeLessThanOrEqual(metrics.board!.bottom + 2);
      }
    }
  });

  test('paginates a synthetic long reading without overflow', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-09-08T12:00:00.000Z') });
    const snapshot = syntheticSnapshot({ count: 1, longMessage: true });
    await openSyntheticDisplay(page, snapshot, (call, initialResponse) => ({
      ...(initialResponse as typeof snapshot),
      revision: call,
      cursor: snapshot.cursor,
      sync: call === 1 ? 'reset' : 'delta',
    }));
    for (let step = 0; step < 50; step += 1) {
      if (await page.getByTestId('display-app').getAttribute('data-screen') === 'featured') break;
      await page.clock.runFor(500);
    }
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-screen', 'featured');
    const reading = page.getByTestId('featured-reading');
    await expect(reading).toHaveAttribute('data-page-count', /[2-9]/);
    const dimensions = await reading.evaluate((element) => ({
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 2);
    expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.clientHeight + 2);
  });
});

test.describe('Plan 08 central screen composition', () => {
  test('maps a saved fixed Spotlight screen to its composed teaching view', async ({ page }) => {
    await openSyntheticDisplay(page, syntheticSnapshot({ settings: { playlist: [{ id: 'spotlight', enabled: true }] } }));
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-screen', 'spotlight');
    await expect(page.getByTestId('expression-spotlight')).toBeVisible();
  });

  test('labels the only two invitation destinations as official external forms', async ({ page }) => {
    for (const [id, url, invitation] of [
      ['daily-practice', DISPLAY_EXTERNAL_URLS.dailyPractice, 'daily-form-invitation'],
      ['peace-promise', DISPLAY_EXTERNAL_URLS.peacePromise, 'peace-form-invitation'],
    ] as const) {
      await page.goto('about:blank');
      await page.unrouteAll({ behavior: 'ignoreErrors' });
      await openSyntheticDisplay(page, syntheticSnapshot({ settings: { playlist: [{ id, enabled: true }] } }));
      const form = page.getByTestId(invitation);
      await expect(form).toBeVisible();
      await expect(form).toHaveAttribute('data-form-url', url);
      await expect(form.getByText('External official form')).toBeVisible();
      await expect(form.getByRole('link')).toHaveAttribute('href', url);
      await expect(form.getByRole('link')).not.toHaveAttribute('href', /[?&](recipient|message|name)=/);
    }
  });
});
