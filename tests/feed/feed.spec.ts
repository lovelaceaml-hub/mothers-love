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

test('clears the feed when a request exceeds the deadline', async ({ page }) => {
  await page.clock.install();
  await page.route('**/api/feed', async () => {
    await new Promise<void>(() => undefined);
  });

  await page.goto('/');
  await page.clock.fastForward(8_100);
  await expect(page.getByRole('heading', { name: 'Unable to load recognitions' })).toBeVisible();
});

test('ignores a stale response after a visibility refresh', async ({ page }) => {
  await page.clock.install();
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
