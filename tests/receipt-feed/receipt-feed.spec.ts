import { expect, test } from '@playwright/test';

// Synthetic data only. Every server call is intercepted, so nothing is submitted.
const serverTime = '2030-01-01T12:00:00.000Z';
const feedItem = {
  id: '00000000-0000-4000-8000-000000000001',
  recipient: 'Michelle R.',
  message: 'Your kindness made a hard day feel lighter.',
  expressionIds: [2, 6, 8],
  firstPublishedAt: '2030-01-01T11:59:00.000Z',
  expiresAt: '2030-01-08T11:59:00.000Z',
};

test.use({ viewport: { width: 390, height: 844 } });

test('shows the live feed under the receipt on a phone, with a steady heart', async ({ page }) => {
  let reactionReads = 0;
  let feedReads = 0;
  await page.addInitScript(() => {
    const nativeSetInterval = window.setInterval;
    window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => (
      nativeSetInterval(handler, timeout === 10_000 ? 200 : timeout, ...args)
    )) as typeof window.setInterval;
  });
  await page.route('**/api/config', async (route) => {
    await route.fulfill({ json: { collectionOpen: true, configured: true } });
  });
  await page.route('**/api/feed', async (route) => {
    feedReads += 1;
    await route.fulfill({ json: { serverTime, items: [feedItem] } });
  });
  await page.route('**/api/reactions**', async (route) => {
    if (route.request().method() === 'GET') {
      reactionReads += 1;
      await route.fulfill({ json: { items: [{ id: feedItem.id, count: 7, liked: false }] } });
      return;
    }
    await route.fulfill({ json: { id: feedItem.id, count: 8, liked: true } });
  });
  await page.route('**/api/recognitions', async (route) => {
    await route.fulfill({ status: 201, json: { id: 'synthetic-1', status: 'published', expiresAt: '2030-01-08T00:00:00.000Z' } });
  });

  await page.goto('/recognize');
  await page.waitForTimeout(100);
  expect(feedReads).toBe(0);
  // The form itself still shows no feed (Anthony's September 10 rule).
  await expect(page.getByTestId('receipt-live-feed')).toHaveCount(0);

  await page.getByLabel('Your name').fill('Maya R.');
  await page.getByLabel('Who would you like to recognize?').fill('Michelle R.');
  await page.getByRole('button', { name: /Thank you\. It's all thanks/ }).click();
  await page.getByLabel('Share your appreciation').fill('Your kindness made a hard day feel lighter.');
  await page.getByRole('button', { name: 'Send recognition' }).click();

  await expect(page.getByRole('heading', { name: /Thank you for sharing Mother's Love/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Recognize Someone Else' })).toBeVisible();
  const feed = page.getByTestId('receipt-live-feed');
  await expect(feed).toBeVisible();
  await expect(feed.getByRole('heading', { name: 'Recent recognitions' })).toBeVisible();
  await expect(feed.getByText('Your kindness made a hard day feel lighter.')).toBeVisible();
  await expect.poll(() => feedReads).toBe(1);
  await page.waitForTimeout(700);
  expect(feedReads).toBe(1);

  // The list has real height on a phone and the page does not scroll sideways.
  const viewport = feed.getByRole('region', { name: 'Recent recognitions' });
  expect((await viewport.boundingBox())?.height ?? 0).toBeGreaterThan(100);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  // A tap fills the heart at once and the confirmed count follows.
  const heart = feed.getByRole('button', { name: 'Like recognition for Michelle R.' });
  await expect(heart).toContainText('7');
  await heart.click();
  await expect(heart).toHaveAttribute('aria-pressed', 'true');
  await expect(heart).toContainText('8');
  await expect(heart).toBeEnabled();
  expect(reactionReads).toBeGreaterThan(0);

  await page.screenshot({ path: 'test-results/receipt-feed-phone.png', fullPage: true });
});

test('expression and privacy companions fetch once without a background poll', async ({ page }) => {
  let feedReads = 0;
  await page.addInitScript(() => {
    const nativeSetInterval = window.setInterval;
    window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => (
      nativeSetInterval(handler, timeout === 10_000 ? 150 : timeout, ...args)
    )) as typeof window.setInterval;
  });
  await page.route('**/api/feed', async (route) => {
    feedReads += 1;
    await route.fulfill({ json: { serverTime, items: [feedItem] } });
  });
  await page.route('**/api/reactions**', async (route) => {
    await route.fulfill({ json: { items: [{ id: feedItem.id, count: 7, liked: false }] } });
  });

  await page.goto('/expressions');
  await expect.poll(() => feedReads).toBe(1);
  await page.waitForTimeout(500);
  expect(feedReads).toBe(1);

  await page.goto('/privacy');
  await expect.poll(() => feedReads).toBe(2);
  await page.waitForTimeout(500);
  expect(feedReads).toBe(2);
});

test('a feed refresh never blanks a heart that is already showing', async ({ page }) => {
  // A Saturday morning in Los Angeles: the pages refresh every 10 seconds only in the fast
  // hours (Plan 32), so the journey must not depend on the hour it runs.
  await page.clock.install({ time: new Date('2026-09-12T16:00:00Z') });
  let releaseSecondRead: (() => void) | undefined;
  const secondRead = new Promise<void>((resolve) => { releaseSecondRead = resolve; });
  let reads = 0;
  let feedReads = 0;
  let conditionalFeedReads = 0;
  const etag = `"${'f'.repeat(32)}"`;
  await page.addInitScript(() => {
    const nativeSetInterval = window.setInterval;
    window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => (
      nativeSetInterval(handler, timeout === 10_000 ? 1_500 : timeout, ...args)
    )) as typeof window.setInterval;
  });
  await page.route('**/api/feed', async (route) => {
    feedReads += 1;
    const conditional = route.request().headers()['if-none-match'] === etag;
    if (conditional) conditionalFeedReads += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { ETag: etag },
      body: JSON.stringify(conditional ? { unchanged: true, serverTime } : { serverTime, items: [feedItem] }),
    });
  });
  await page.route('**/api/reactions**', async (route) => {
    reads += 1;
    if (reads === 2) await secondRead;
    await route.fulfill({ json: { items: [{ id: feedItem.id, count: 7, liked: true }] } });
  });

  await page.goto('/');
  const heart = page.getByRole('button', { name: 'Like recognition for Michelle R.' });
  await expect(heart).toContainText('7');
  // The second read is now held open: this is the moment the old code greyed
  // the heart out and swapped its text.
  await expect.poll(() => reads, { timeout: 20_000 }).toBeGreaterThanOrEqual(2);
  expect(feedReads).toBeGreaterThanOrEqual(2);
  expect(conditionalFeedReads).toBeGreaterThanOrEqual(1);
  await expect(heart).toBeEnabled();
  await expect(heart).toHaveAttribute('aria-pressed', 'true');
  await expect(heart).toContainText('7');
  await expect(page.getByText('Hearts unavailable')).toHaveCount(0);
  releaseSecondRead?.();
  await expect(heart).toContainText('7');
});
