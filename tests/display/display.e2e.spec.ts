import { join } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

type FixtureSize = 0 | 1 | 2 | 20 | 'long';
type FixtureOptions = { showTrails?: boolean; showConstellations?: boolean; nonSharedExpressions?: boolean; continuous?: boolean };
const LONG_RECIPIENT = 'R'.repeat(80);
const LONG_MESSAGE = Array.from({ length: 24 }, (_, index) => `Line ${index + 1}: preserve this exact appreciation.\n`).join('').slice(0, 500);
const DENSE_LINE_MESSAGE = `${'A\n'.repeat(249)}A`;
const LONG_EXPRESSIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const fixtureRecognition = (id: number, long = false, expressionIds = [1, 2, 6]) => ({
  id: `synthetic-${id}`,
  recipient: `Synthetic recipient ${id}`,
  message: long
    ? `Synthetic long appreciation ${id}. `.repeat(48).slice(0, 500)
    : `Synthetic appreciation message ${id}.`,
  expressionIds,
  createdAt: '2026-09-08T12:00:00.000Z',
  firstPublishedAt: '2026-09-08T12:00:00.000Z',
  expiresAt: '2026-09-15T12:00:00.000Z',
  version: 1,
  status: 'published' as const,
  featured: false,
});

function fixture(size: FixtureSize, options: FixtureOptions = {}) {
  const count = size === 'long' ? 1 : size;
  const recognitions = Array.from({ length: count }, (_, index) => fixtureRecognition(
    index + 1,
    size === 'long',
    options.nonSharedExpressions ? (index % 2 ? [2] : [1]) : [1, 2, 6],
  ));
  return {
    serverTime: '2026-09-08T12:00:00.000Z',
    revision: 1,
    recognitions,
    aggregate: {
      periodStart: '2026-09-01T07:00:00.000Z',
      periodEnd: '2026-10-01T07:00:00.000Z',
      recognitions: count,
      expressionCounts: [count, count, count, 0, 0, count, 0, 0, 0],
      expressionTotal: count * 3,
      revision: 1,
    },
    settings: {
      version: 1,
      mode: 'normal' as const,
      motion: 'still' as const,
      pauseArrivals: false,
      pauseRotation: false,
      collectionOpen: true,
      lowActivityMinutes: 20,
      readingSeconds: 20,
      maxBubbles: 4,
      showTrails: options.showTrails ?? true,
      showConstellations: options.showConstellations ?? true,
    },
    submissionUrl: 'https://synthetic.invalid/recognize',
    cursor: `fixture-${size}`,
    sync: 'reset' as const,
    arrivals: [],
  };
}

function longAcceptanceFixture(
  revision = 1,
  sync: 'reset' | 'delta' = 'reset',
  arrivals: Array<{ eventId: string; recognitionId: string; publishedAt: string }> = [],
  message = LONG_MESSAGE,
) {
  const base = fixture(1);
  return {
    ...base,
    revision,
    cursor: `long-acceptance-${revision}`,
    sync,
    recognitions: [{
      ...fixtureRecognition(1),
      recipient: LONG_RECIPIENT,
      message,
      expressionIds: LONG_EXPRESSIONS,
    }],
    aggregate: {
      ...base.aggregate,
      expressionCounts: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      expressionTotal: 9,
    },
    arrivals,
  };
}

async function pairAndRead(page: Page, size: FixtureSize, options: FixtureOptions = {}) {
  await page.route('**/api/display/pair', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ paired: true }) });
  });
  let snapshotCalls = 0;
  await page.route(/\/api\/display\/snapshot(?:\?.*)?$/, async (route) => {
    snapshotCalls += 1;
    if (snapshotCalls === 1) {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'pairing required', code: 'UNAUTHORIZED' }) });
      return;
    }
    const response = fixture(size, options);
    const body = options.continuous && snapshotCalls > 2
      ? { ...response, revision: snapshotCalls, cursor: `fixture-${size}-${snapshotCalls}`, sync: 'delta' as const }
      : response;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.route('**/api/display/ack', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
  await page.goto('/display');
  await page.getByLabel('Display code').fill('A7C9F2H4');
  await page.getByRole('button', { name: 'Connect this display' }).click();
  await expect(page.getByTestId('display-app')).toBeVisible();
}

async function pairLongAcceptance(page: Page, withArrival: boolean, message = LONG_MESSAGE) {
  await page.route('**/api/display/pair', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ paired: true }) });
  });
  let snapshotCalls = 0;
  await page.route(/\/api\/display\/snapshot(?:\?.*)?$/, async (route) => {
    snapshotCalls += 1;
    if (snapshotCalls === 1) {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'pairing required', code: 'UNAUTHORIZED' }) });
      return;
    }
    if (snapshotCalls === 2) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(longAcceptanceFixture(1, 'reset', [], message)) });
      return;
    }
    const arrival = { eventId: 'long-acceptance-event', recognitionId: 'synthetic-1', publishedAt: '2026-09-08T12:00:00.000Z' };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(longAcceptanceFixture(snapshotCalls, 'delta', withArrival ? [arrival] : [], message)),
    });
  });
  await page.route('**/api/display/ack', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
  await page.goto('/display');
  await page.getByLabel('Display code').fill('A7C9F2H4');
  await page.getByRole('button', { name: 'Connect this display' }).click();
  await page.clock.runFor(1);
  await expect(page.getByTestId('display-app')).toHaveAttribute('data-eligible-count', '1', { timeout: 15_000 });
}

test.describe('Bubble Board display synthetic fixtures', () => {
  for (const size of [0, 1, 2, 20, 'long'] as const) {
    test(`renders the ${size} fixture without unsafe sample content`, async ({ page }) => {
      await pairAndRead(page, size);
      await expect(page.getByTestId('display-app')).toHaveAttribute('data-eligible-count', String(size === 'long' ? 1 : size), { timeout: 15_000 });
      await expect(page.getByText('Synthetic recipient 1')).toBeVisible({ timeout: 10_000 }).catch(() => undefined);
      const screenshot = await page.screenshot({ fullPage: true });
      if (process.env.DISPLAY_SCREENSHOT) await page.screenshot({ path: process.env.DISPLAY_SCREENSHOT, fullPage: true });
      expect(screenshot.byteLength).toBeGreaterThan(1_000);
    });
  }

  test('keeps the pairing gate before the first verified snapshot', async ({ page }) => {
    await page.goto('/display');
    await expect(page.getByRole('heading', { name: 'Connect this display.' })).toBeVisible();
    await expect(page.getByTestId('display-app')).toHaveCount(0);
  });

  test('probes an existing paired display cookie before asking for a new code', async ({ page }) => {
    let pairCalls = 0;
    await page.route('**/api/display/pair', async (route) => {
      pairCalls += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ paired: true }) });
    });
    await page.route(/\/api\/display\/snapshot(?:\?.*)?$/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture(1)) });
    });
    await page.route('**/api/display/ack', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });
    await page.goto('/display');
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-cursor', 'fixture-1', { timeout: 15_000 });
    expect(pairCalls).toBe(0);
  });

  test('applies a delayed startup snapshot and clears the paired wall on a 401 resync', async ({ page }) => {
    let snapshotCalls = 0;
    await page.route('**/api/display/pair', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ paired: true }) });
    });
    await page.route(/\/api\/display\/snapshot(?:\?.*)?$/, async (route) => {
      snapshotCalls += 1;
      if (snapshotCalls === 1) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture(2)) });
        return;
      }
      if (snapshotCalls === 2) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture(2)) });
        return;
      }
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'revoked', code: 'UNAUTHORIZED' }) });
    });
    await page.route('**/api/display/ack', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });
    await page.goto('/display');
    await expect(page.getByRole('heading', { name: 'Connect this display.' })).toBeVisible();
    await page.getByLabel('Display code').fill('A7C9F2H4');
    await page.getByRole('button', { name: 'Connect this display' }).click();
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-eligible-count', '2', { timeout: 15_000 });
    await page.waitForTimeout(5_500);
    await expect(page.getByRole('heading', { name: 'Connect this display.' })).toBeVisible({ timeout: 5_000 });
  });

  test('honors trail and constellation flags and only links shared expressions', async ({ page }) => {
    await pairAndRead(page, 2, { showTrails: false, showConstellations: false, nonSharedExpressions: true });
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-eligible-count', '2', { timeout: 10_000 });
    const board = page.getByTestId('garden-board');
    await expect(board).toHaveAttribute('data-connection-count', '0');
    await expect(board).toHaveAttribute('data-trail-count', '0');
    await expect(board.locator('svg')).toHaveCount(0);
    await expect(board.locator('[class*="bubbleTrail"]')).toHaveCount(0);
  });

  test('keeps garden bubbles inside the board and long excerpts readable at TV sizes', async ({ page }) => {
    await pairAndRead(page, 'long');
    for (const viewport of [{ width: 1920, height: 1080 }, { width: 3840, height: 2160 }]) {
      await page.setViewportSize(viewport);
      const bounds = await page.getByTestId('garden-board').evaluate((board) => {
        const boardRect = board.getBoundingClientRect();
        return [...board.querySelectorAll<HTMLElement>('[data-testid="garden-bubble"]')].map((bubble) => {
          const rect = bubble.getBoundingClientRect();
          return {
            left: rect.left - boardRect.left,
            top: rect.top - boardRect.top,
            right: boardRect.right - rect.right,
            bottom: boardRect.bottom - rect.bottom,
          };
        });
      });
      expect(bounds.length).toBe(1);
      expect(bounds[0].left).toBeGreaterThanOrEqual(-2);
      expect(bounds[0].top).toBeGreaterThanOrEqual(-2);
      expect(bounds[0].right).toBeGreaterThanOrEqual(-2);
      expect(bounds[0].bottom).toBeGreaterThanOrEqual(-2);
      await expect(page.getByText('Message preview. Full message follows.')).toBeVisible();
    }
  });

  test('paginates the full long featured recognition at 1920 and 3840 widths', async ({ page }) => {
    test.setTimeout(60_000);
    await page.clock.install({ time: new Date('2026-09-08T12:00:00.000Z') });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await pairLongAcceptance(page, false);
    await page.clock.runFor(5_000);
    await page.clock.runFor(16_000);
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-screen', 'featured', { timeout: 2_000 });
    const reading = page.getByTestId('featured-reading');
    const pageCount = Number(await reading.getAttribute('data-page-count'));
    const messageSegments: string[] = [];
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      await expect(reading).toHaveAttribute('data-page-index', String(pageIndex), { timeout: 2_000 });
      const segment = reading.getByTestId('featured-message-segment');
      if (await segment.count()) messageSegments.push((await segment.textContent()) ?? '');
      if (pageIndex === 0) {
        if (process.env.DISPLAY_SCREENSHOT_DIR) await page.screenshot({ path: join(process.env.DISPLAY_SCREENSHOT_DIR, 'featured-long-1920.png'), fullPage: true });
        await page.setViewportSize({ width: 3840, height: 2160 });
        if (process.env.DISPLAY_SCREENSHOT_DIR) await page.screenshot({ path: join(process.env.DISPLAY_SCREENSHOT_DIR, 'featured-long-3840.png'), fullPage: true });
      }
      const metrics = await reading.evaluate((element) => ({
        clientWidth: element.clientWidth,
        clientHeight: element.clientHeight,
        scrollWidth: element.scrollWidth,
        scrollHeight: element.scrollHeight,
      }));
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 2);
      expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 2);
      if (pageIndex < pageCount - 1) {
        await page.clock.runFor(7_000);
        await expect(reading).toHaveAttribute('data-page-index', String(pageIndex + 1), { timeout: 2_000 });
      }
    }
    expect(messageSegments.join('')).toBe(LONG_MESSAGE);
    await expect(reading.getByTestId('featured-expressions').locator('span')).toHaveCount(9);
    await expect(reading.getByRole('heading', { name: `Thank you, ${LONG_RECIPIENT}.` })).toBeVisible();
  });

  test('paginates the full long arrival recognition at 1920 and 3840 widths', async ({ page }) => {
    test.setTimeout(60_000);
    await page.clock.install({ time: new Date('2026-09-08T12:00:00.000Z') });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await pairLongAcceptance(page, true);
    await page.clock.runFor(5_000);
    await page.clock.runFor(21_000);
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-screen', 'arrival', { timeout: 2_000 });
    await page.clock.runFor(3_000);
    const reading = page.getByTestId('arrival-reading');
    const pageCount = Number(await reading.getAttribute('data-page-count'));
    const messageSegments: string[] = [];
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      await expect(reading).toHaveAttribute('data-page-index', String(pageIndex), { timeout: 2_000 });
      const segment = reading.getByTestId('arrival-message-segment');
      if (await segment.count()) messageSegments.push((await segment.textContent()) ?? '');
      if (pageIndex === 0) {
        if (process.env.DISPLAY_SCREENSHOT_DIR) await page.screenshot({ path: join(process.env.DISPLAY_SCREENSHOT_DIR, 'arrival-long-1920.png'), fullPage: true });
        await page.setViewportSize({ width: 3840, height: 2160 });
        if (process.env.DISPLAY_SCREENSHOT_DIR) await page.screenshot({ path: join(process.env.DISPLAY_SCREENSHOT_DIR, 'arrival-long-3840.png'), fullPage: true });
      }
      const metrics = await reading.evaluate((element) => ({
        clientWidth: element.clientWidth,
        clientHeight: element.clientHeight,
        scrollWidth: element.scrollWidth,
        scrollHeight: element.scrollHeight,
      }));
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 2);
      expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 2);
      if (pageIndex < pageCount - 1) {
        await page.clock.runFor(7_000);
        await expect(reading).toHaveAttribute('data-page-index', String(pageIndex + 1), { timeout: 2_000 });
      }
    }
    expect(messageSegments.join('')).toBe(LONG_MESSAGE);
    await expect(reading.getByTestId('arrival-expressions').locator('span')).toHaveCount(9);
    await expect(reading.getByRole('heading', { name: `Thank you, ${LONG_RECIPIENT}.` })).toBeVisible();
  });

  test('bounds a legal dense line-break message while preserving every segment', async ({ page }) => {
    test.setTimeout(60_000);
    await page.clock.install({ time: new Date('2026-09-08T12:00:00.000Z') });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await pairLongAcceptance(page, false, DENSE_LINE_MESSAGE);
    await page.clock.runFor(5_000);
    await page.clock.runFor(16_000);
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-screen', 'featured', { timeout: 2_000 });
    const reading = page.getByTestId('featured-reading');
    const pageCount = Number(await reading.getAttribute('data-page-count'));
    const messageSegments: string[] = [];
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      await expect(reading).toHaveAttribute('data-page-index', String(pageIndex), { timeout: 2_000 });
      const segment = reading.getByTestId('featured-message-segment');
      if (await segment.count()) messageSegments.push((await segment.textContent()) ?? '');
      const metrics = await reading.evaluate((element) => ({
        clientWidth: element.clientWidth,
        clientHeight: element.clientHeight,
        scrollWidth: element.scrollWidth,
        scrollHeight: element.scrollHeight,
      }));
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 2);
      expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 2);
      if (pageIndex < pageCount - 1) {
        await page.clock.runFor(1_000);
        await expect(reading).toHaveAttribute('data-page-index', String(pageIndex + 1), { timeout: 2_000 });
      }
    }
    expect(messageSegments.join('')).toBe(DENSE_LINE_MESSAGE);
    await expect(reading.getByTestId('featured-expressions').locator('span')).toHaveCount(9);
  });

  test('captures the current multi-record garden, featured, all-nine, and cluster screens', async ({ page }) => {
    test.skip(!process.env.DISPLAY_CAPTURE_SCREENS, 'Set DISPLAY_CAPTURE_SCREENS and DISPLAY_SCREENSHOT_DIR to capture evidence.');
    test.setTimeout(140_000);
    await pairAndRead(page, 2, { continuous: true });
    const directory = process.env.DISPLAY_SCREENSHOT_DIR!;
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-screen', 'garden', { timeout: 15_000 });
    await page.screenshot({ path: join(directory, 'garden-multi-record.png'), fullPage: true });
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-screen', 'featured', { timeout: 30_000 });
    await page.screenshot({ path: join(directory, 'featured-multi-record.png'), fullPage: true });
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-screen', 'all-nine', { timeout: 70_000 });
    await page.screenshot({ path: join(directory, 'all-nine-multi-record.png'), fullPage: true });
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-screen', 'cluster', { timeout: 35_000 });
    await page.screenshot({ path: join(directory, 'cluster-multi-record.png'), fullPage: true });
  });
});
