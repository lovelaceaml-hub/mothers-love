import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const serverTime = '2030-01-01T12:00:00.000Z';

function item(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'recognition-1',
    recipient: 'Michelle R.',
    message: 'Your kindness made a hard day feel lighter.',
    expressionIds: [2, 6, 8],
    firstPublishedAt: '2030-01-01T11:59:00.000Z',
    expiresAt: '2030-01-08T11:59:00.000Z',
    ...overrides,
  };
}

function snapshot(items: unknown[]) {
  return { serverTime, items };
}

async function routeFeed(page: Page, response: unknown) {
  await page.route('**/api/feed', async (route) => {
    await route.fulfill({
      headers: { 'cache-control': 'no-store' },
      json: response,
    });
  });
}

async function routeReactions(page: Page) {
  await page.route('**/api/reactions**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const url = new URL(route.request().url());
    const ids = url.searchParams.get('ids')?.split(',').filter(Boolean) ?? [];
    await route.fulfill({
      json: { items: ids.map((id) => ({ id, count: 2, liked: false })) },
    });
  });
}

test('shows the campaign home with safe feed cards and public navigation', async ({ page }) => {
  await routeFeed(page, snapshot([
    item({
      id: 'newer',
      recipient: 'Jordan P.',
      message: 'A newer message with <script>safe text</script>.',
      firstPublishedAt: '2030-01-01T11:59:30.000Z',
      submittedName: 'Private sender',
      reason: 'should never appear',
    }),
    item({ id: 'older', firstPublishedAt: '2030-01-01T11:58:30.000Z' }),
  ]));
  await routeReactions(page);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: "THE WORDS OF MOTHER'S LOVE" })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Share a recognition' }).first()).toHaveAttribute('href', '/recognize');
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin/login');
  await expect(page.getByRole('article')).toHaveCount(2);
  await expect(page.getByRole('article').nth(0)).toContainText('Jordan P.');
  await expect(page.getByRole('article').nth(1)).toContainText('Michelle R.');
  await expect(page.getByText('Private sender')).toHaveCount(0);
  await expect(page.getByText('should never appear')).toHaveCount(0);
  await expect(page.getByText('<script>safe text</script>')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore the nine expressions' })).toHaveAttribute('href', '/expressions');

  const results = await new AxeBuilder({ page: page as never }).analyze();
  expect(results.violations).toEqual([]);
});

test('replaces the feed on polling and removes old messages on an error', async ({ page }) => {
  await page.clock.install();
  const responses = [
    snapshot([item({ id: 'first', recipient: 'First R.' })]),
    snapshot([item({ id: 'second', recipient: 'Second R.', firstPublishedAt: '2030-01-01T12:00:00.000Z' })]),
    { malformed: true },
  ];
  let requestCount = 0;
  await routeReactions(page);
  await page.route('**/api/feed', async (route) => {
    const response = responses[Math.min(requestCount, responses.length - 1)];
    requestCount += 1;
    await route.fulfill({ json: response });
  });

  await page.goto('/');
  await expect(page.getByText('First R.')).toBeVisible();
  await page.clock.fastForward(10_000);
  await page.clock.runFor(0);
  await expect(page.getByText('Second R.')).toBeVisible();
  await expect(page.getByText('First R.')).toHaveCount(0);
  await page.clock.fastForward(10_000);
  await page.clock.runFor(0);
  await expect(page.getByRole('heading', { name: 'Unable to load recognitions' })).toBeVisible();
  await expect(page.getByText('Second R.')).toHaveCount(0);
});

test('clears personal content while hidden and rechecks immediately on return', async ({ page }) => {
  await page.clock.install();
  let requestCount = 0;
  let returnFresh = false;
  await routeReactions(page);
  await page.route('**/api/feed', async (route) => {
    requestCount += 1;
    await route.fulfill({ json: snapshot([item({ id: `recognition-${requestCount}`, recipient: returnFresh ? 'Returned R.' : 'Hidden R.' })]) });
  });

  await page.goto('/');
  await expect(page.getByText('Hidden R.')).toBeVisible();
  returnFresh = true;
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByText('Hidden R.')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Loading recognitions' })).toBeVisible();

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByText('Returned R.')).toBeVisible();
  expect(requestCount).toBeGreaterThanOrEqual(2);
});

test('uses verified server time for initial suppression and monotonic expiry', async ({ page }) => {
  await page.clock.install();
  await routeReactions(page);
  await routeFeed(page, snapshot([
    item({ id: 'expired', recipient: 'Expired R.', expiresAt: '2030-01-01T11:59:59.000Z' }),
    item({ id: 'short-lived', recipient: 'Short lived R.', expiresAt: '2030-01-01T12:00:01.000Z' }),
    item({ id: 'long-lived', recipient: 'Long lived R.', expiresAt: '2030-01-01T12:00:10.000Z' }),
  ]));

  await page.goto('/');
  await expect(page.getByText('Short lived R.')).toBeVisible();
  await expect(page.getByText('Expired R.')).toHaveCount(0);
  await page.clock.fastForward(1_200);
  await expect(page.getByText('Short lived R.')).toHaveCount(0);
  await expect(page.getByText('Long lived R.')).toBeVisible();
});

test('removes each item at its own expiry without waiting for polling', async ({ page }) => {
  await page.clock.install({ time: new Date('2029-12-31T12:00:00.000Z') });
  await page.clock.pauseAt(new Date(serverTime));
  await routeReactions(page);
  await routeFeed(page, snapshot([
    item({ id: 'expires-first', recipient: 'First expiry R.', expiresAt: '2030-01-01T12:00:01.000Z' }),
    item({ id: 'expires-second', recipient: 'Second expiry R.', expiresAt: '2030-01-01T12:00:03.000Z' }),
  ]));

  await page.goto('/');
  await expect.poll(async () => {
    await page.clock.runFor(1);
    return page.getByText('First expiry R.').count();
  }).toBe(1);
  await expect(page.getByText('Second expiry R.')).toBeVisible();
  await page.clock.fastForward(1_200);
  await expect(page.getByText('First expiry R.')).toHaveCount(0);
  await expect(page.getByText('Second expiry R.')).toBeVisible();
  await page.clock.fastForward(2_000);
  await expect(page.getByText('Second expiry R.')).toHaveCount(0);
});

test('clears the feed when a request exceeds the deadline', async ({ page }) => {
  await page.clock.install();
  await routeReactions(page);
  let requestStarted = false;
  await page.route('**/api/feed', async () => {
    requestStarted = true;
    await new Promise<void>(() => undefined);
  });

  await page.goto('/');
  // Production HTML can arrive before hydration installs the request deadline.
  await expect.poll(() => requestStarted).toBe(true);
  await page.clock.fastForward(8_100);
  await expect(page.getByRole('heading', { name: 'Unable to load recognitions' })).toBeVisible();
});

test('ignores a stale response after a visibility refresh', async ({ page }) => {
  await page.clock.install();
  await routeReactions(page);
  let releaseFirst: (() => void) | undefined;
  const firstResponse = new Promise<void>((resolve) => { releaseFirst = resolve; });
  let requestCount = 0;
  await page.route('**/api/feed', async (route) => {
    requestCount += 1;
    if (requestCount === 1) {
      await firstResponse;
      await route.fulfill({ json: snapshot([item({ recipient: 'Stale R.' })]) });
      return;
    }
    await route.fulfill({ json: snapshot([item({ recipient: 'Fresh R.' })]) });
  });

  await page.goto('/');
  // Wait for the first request and visibility listeners before sending events.
  await expect.poll(() => requestCount).toBe(1);
  await page.clock.runFor(0);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByText('Fresh R.')).toBeVisible();
  releaseFirst?.();
  await expect(page.getByText('Stale R.')).toHaveCount(0);
});

test('shows the latest 100 items, batches heart counts, and keeps the list keyboard-scrollable', async ({ page }) => {
  const reactionRequests: string[][] = [];
  const items = Array.from({ length: 100 }, (_, index) => item({
    id: `recognition-${index}`,
    recipient: `Recipient ${index} R.`,
    firstPublishedAt: new Date(Date.parse(serverTime) - index * 1_000).toISOString(),
  }));
  await routeFeed(page, snapshot(items));
  await page.route('**/api/reactions**', async (route) => {
    const ids = new URL(route.request().url()).searchParams.get('ids')?.split(',').filter(Boolean) ?? [];
    reactionRequests.push(ids);
    await route.fulfill({ json: { items: ids.map((id) => ({ id, count: 2, liked: false })) } });
  });

  await page.goto('/');
  const viewport = page.getByRole('region', { name: 'Recent recognitions' });
  await expect(viewport).toHaveAttribute('tabindex', '0');
  await expect(page.getByRole('article')).toHaveCount(100);
  await expect.poll(() => reactionRequests.length).toBe(4);
  expect(reactionRequests.every((ids) => ids.length <= 30)).toBe(true);
  expect(reactionRequests.flat()).toHaveLength(100);
});

test('shows the form only on the recognize page, with no live campaign feed', async ({ page }) => {
  const companionItems = Array.from({ length: 5 }, (_, index) => item({
    id: `companion-${index}`,
    recipient: index === 0 ? 'Companion R.' : `Companion ${index} R.`,
  }));
  await routeFeed(page, snapshot(companionItems));
  await routeReactions(page);
  await page.route('**/api/config', async (route) => {
    await route.fulfill({ json: { configured: true, collectionOpen: true } });
  });

  await page.goto('/recognize');
  await expect(page.getByRole('textbox', { name: 'Your name' })).toBeVisible();
  await expect(page.getByTestId('submission-live-feed')).toHaveCount(0);
  await expect(page.getByText('Live from the campaign')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Recent recognitions' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Latest recognitions' })).toHaveCount(0);
});
