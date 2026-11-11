import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// On the live host a compressed reply carries a weak tag (W/"...") and a matching
// conditional request is answered with an empty 304 Not Modified. These journeys
// hold the home page to that behavior. Synthetic records only.
const serverTime = '2030-01-01T12:00:00.000Z';
const fastWindow = new Date('2026-09-12T16:00:00Z');
const tagA = 'a'.repeat(32);
const tagB = 'b'.repeat(32);

function item(n: number) {
  return {
    id: `synthetic-${String(n).padStart(4, '0')}`,
    recipient: `Test Recipient ${n}`,
    message: `Synthetic message ${n}`,
    expressionIds: [2, 6],
    firstPublishedAt: new Date(Date.parse('2030-01-01T11:00:00.000Z') - n * 1_000).toISOString(),
    expiresAt: '2130-01-01T12:00:00.000Z',
  };
}

const items = (from: number, count: number) => Array.from({ length: count }, (_, index) => item(from + index));

async function routeReactions(page: Page) {
  await page.route('**/api/reactions**', async (route) => {
    const ids = new URL(route.request().url()).searchParams.get('ids')?.split(',').filter(Boolean) ?? [];
    await route.fulfill({ json: { items: ids.map((id) => ({ id, count: 0, liked: false })) } });
  });
}

async function nextRefresh(page: Page) {
  await page.clock.fastForward(10_000);
  await page.clock.runFor(0);
}

const cards = (page: Page) => page.locator('#recent-recognitions [data-recognition-id]');

test('a weak tag is remembered and an empty 304 keeps the list, then new content replaces it', async ({ page }) => {
  await page.clock.install({ time: fastWindow });
  let changed = false;
  let fullReads = 0;
  let notModified = 0;
  const conditionalTags: string[] = [];
  await routeReactions(page);
  await page.route('**/api/feed', async (route) => {
    const sent = route.request().headers()['if-none-match'] ?? null;
    if (sent) conditionalTags.push(sent);
    const tag = changed ? tagB : tagA;
    if (sent === `"${tag}"`) {
      notModified += 1;
      await route.fulfill({ status: 304, headers: { 'cache-control': 'no-store', etag: `"${tag}"` } });
      return;
    }
    fullReads += 1;
    await route.fulfill({
      headers: { 'cache-control': 'no-store', etag: `W/"${tag}"` },
      json: { serverTime, items: changed ? items(2, 1) : items(1, 1) },
    });
  });

  await page.goto('/');
  await expect(page.getByText('Test Recipient 1', { exact: true })).toBeVisible();
  expect(fullReads).toBe(1);

  await expect.poll(async () => { await nextRefresh(page); return notModified; }, { timeout: 20_000 }).toBeGreaterThanOrEqual(2);
  expect(conditionalTags.every((value) => value === `"${tagA}"`)).toBe(true);
  expect(fullReads).toBe(1);
  await expect(page.getByText('Test Recipient 1', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Unable to load recognitions' })).toHaveCount(0);

  changed = true;
  await expect.poll(async () => { await nextRefresh(page); return fullReads; }, { timeout: 20_000 }).toBe(2);
  await expect(page.getByText('Test Recipient 2', { exact: true })).toBeVisible();
  await expect(page.getByText('Test Recipient 1', { exact: true })).toHaveCount(0);
});

test('an older page with a weak tag is kept when its refresh is an empty 304', async ({ page }) => {
  await page.clock.install({ time: fastWindow });
  let olderFull = 0;
  let olderNotModified = 0;
  await routeReactions(page);
  await page.route('**/api/feed', async (route) => {
    await route.fulfill({ headers: { 'cache-control': 'no-store' }, json: { serverTime, items: items(1, 100) } });
  });
  await page.route((url) => url.pathname === '/api/feed/older', async (route) => {
    if (route.request().headers()['if-none-match'] === `"${tagA}"`) {
      olderNotModified += 1;
      await route.fulfill({ status: 304, headers: { 'cache-control': 'no-store', etag: `"${tagA}"` } });
      return;
    }
    olderFull += 1;
    await route.fulfill({
      headers: { 'cache-control': 'no-store', etag: `W/"${tagA}"` },
      json: { serverTime, items: items(101, 50) },
    });
  });

  await page.goto('/');
  await expect(cards(page)).toHaveCount(100);
  await page.getByRole('button', { name: 'Show older recognitions' }).click();
  await expect(cards(page)).toHaveCount(150);
  expect(olderFull).toBe(1);

  await expect.poll(async () => { await nextRefresh(page); return olderNotModified; }, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
  expect(olderFull).toBe(1);
  await expect(cards(page)).toHaveCount(150);
  await expect(page.getByText('Test Recipient 120', { exact: true })).toBeAttached();
});

test('a conditional read that fails falls back to a whole read instead of an error', async ({ page }) => {
  await page.clock.install({ time: fastWindow });
  let fullReads = 0;
  let brokenConditionalReads = 0;
  await routeReactions(page);
  await page.route('**/api/feed', async (route) => {
    if (route.request().headers()['if-none-match']) {
      // Stands for anything between the page and the server mishandling the shortcut.
      brokenConditionalReads += 1;
      await route.fulfill({ status: 200, headers: { 'cache-control': 'no-store' }, contentType: 'application/json', body: '' });
      return;
    }
    fullReads += 1;
    await route.fulfill({
      headers: { 'cache-control': 'no-store', etag: `W/"${tagA}"` },
      json: { serverTime, items: items(1, 1) },
    });
  });

  await page.goto('/');
  await expect(page.getByText('Test Recipient 1', { exact: true })).toBeVisible();
  expect(fullReads).toBe(1);

  await expect.poll(async () => { await nextRefresh(page); return brokenConditionalReads; }, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
  await expect.poll(() => fullReads).toBeGreaterThanOrEqual(2);
  await expect(page.getByText('Test Recipient 1', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Unable to load recognitions' })).toHaveCount(0);
});
