import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Synthetic records only. Record n is published n seconds before the newest.
const serverTime = '2030-01-01T12:00:00.000Z';
const newest = Date.parse('2030-01-01T11:00:00.000Z');

function record(n: number) {
  return {
    id: `synthetic-${String(n).padStart(4, '0')}`,
    recipient: `Test Recipient ${n}`,
    message: `Synthetic message ${n}`,
    expressionIds: [2, 6],
    firstPublishedAt: new Date(newest - n * 1_000).toISOString(),
    expiresAt: '2130-01-01T12:00:00.000Z',
  };
}

function records(from: number, count: number, hidden = new Set<number>()) {
  return Array.from({ length: count }, (_, index) => from + index).filter((n) => !hidden.has(n)).map(record);
}

type Options = { total: number; hidden?: Set<number>; failOlder?: () => boolean };

async function serveFeed(page: Page, options: Options) {
  const reactionIds = new Set<string>();
  const reactionRequests: string[][] = [];
  const olderCursors: string[] = [];
  const olderIfNoneMatch: string[] = [];
  await page.route('**/api/feed', async (route) => {
    const hidden = options.hidden ?? new Set<number>();
    await route.fulfill({ headers: { 'cache-control': 'no-store' }, json: { serverTime, items: records(1, Math.min(options.total, 100), hidden) } });
  });
  await page.route((url) => url.pathname === '/api/feed/older', async (route) => {
    const url = new URL(route.request().url());
    olderCursors.push(`${url.searchParams.get('before')}|${url.searchParams.get('id')}`);
    const requestTag = route.request().headers()['if-none-match'] ?? null;
    olderIfNoneMatch.push(requestTag ?? '');
    if (options.failOlder?.()) {
      await route.fulfill({ status: 503, json: { ok: false, code: 'UNAVAILABLE' } });
      return;
    }
    const after = Number(url.searchParams.get('id')?.replace('synthetic-', ''));
    const hidden = options.hidden ?? new Set<number>();
    const count = Math.max(0, Math.min(100, options.total - after));
    const etag = hidden.size > 0 ? `"${'b'.repeat(32)}"` : `"${'a'.repeat(32)}"`;
    if (requestTag === etag) {
      await route.fulfill({
        headers: { 'cache-control': 'no-store', etag },
        json: { unchanged: true, serverTime },
      });
      return;
    }
    await route.fulfill({
      headers: { 'cache-control': 'no-store', etag },
      json: { serverTime, items: records(after + 1, count, hidden) },
    });
  });
  await page.route('**/api/reactions**', async (route) => {
    const ids = new URL(route.request().url()).searchParams.get('ids')?.split(',').filter(Boolean) ?? [];
    reactionRequests.push(ids);
    ids.forEach((id) => reactionIds.add(id));
    await route.fulfill({ json: { items: ids.map((id) => ({ id, count: 0, liked: false })) } });
  });
  return { reactionIds, reactionRequests, olderCursors, olderIfNoneMatch };
}

const cards = (page: Page) => page.locator('#recent-recognitions [data-recognition-id]');

test('shows the newest 100, then adds older recognitions a page at a time', async ({ page }) => {
  const served = await serveFeed(page, { total: 230 });
  await page.goto('/');
  await expect(cards(page)).toHaveCount(100);
  await expect.poll(() => served.reactionRequests.length).toBe(1);

  const showOlder = page.getByRole('button', { name: 'Show older recognitions' });
  await showOlder.click();
  await expect(cards(page)).toHaveCount(200);
  await expect.poll(() => served.reactionRequests.length).toBe(2);
  await expect(page.getByText('Test Recipient 101', { exact: true })).toBeAttached();
  expect(served.olderCursors[0]).toBe(`${record(100).firstPublishedAt}|${record(100).id}`);
  await expect.poll(() => served.reactionIds.has(record(200).id)).toBe(true);
  expect(served.reactionRequests[1]).toHaveLength(100);
  expect(served.reactionRequests[1]).toContain(record(200).id);

  await showOlder.click();
  await expect(cards(page)).toHaveCount(230);
  await expect.poll(() => served.reactionRequests.length).toBe(3);
  expect(served.reactionRequests[2]).toHaveLength(30);
  await expect(page.getByTestId('older-end')).toHaveText('You have reached the first recognition.');
  await expect(showOlder).toHaveCount(0);
  const ids = await cards(page).evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.recognitionId));
  expect(new Set(ids).size).toBe(ids.length);
});

test('no older button while the feed holds fewer than 100', async ({ page }) => {
  await serveFeed(page, { total: 40 });
  await page.goto('/');
  await expect(cards(page)).toHaveCount(40);
  await expect(page.getByTestId('show-older')).toHaveCount(0);
});

test('a failed older page says so and can be retried', async ({ page }) => {
  let fail = true;
  await serveFeed(page, { total: 150, failOlder: () => fail });
  await page.goto('/');
  await page.getByRole('button', { name: 'Show older recognitions' }).click();
  await expect(page.getByText('Older recognitions could not load.')).toBeVisible();
  await expect(cards(page)).toHaveCount(100);
  fail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(cards(page)).toHaveCount(150);
});

test('a recognition hidden after loading leaves the older pages on the next refresh', async ({ page }) => {
  // A Saturday morning in Los Angeles, inside the 10 second refresh hours (Plan 32), so the
  // refresh this journey waits for does not depend on the hour it runs.
  await page.clock.install({ time: new Date('2026-09-12T16:00:00Z') });
  const hidden = new Set<number>();
  const served = await serveFeed(page, { total: 150, hidden });
  await page.goto('/');
  await page.getByRole('button', { name: 'Show older recognitions' }).click();
  await expect(page.getByText('Test Recipient 120', { exact: true })).toBeAttached();
  await expect.poll(() => served.reactionRequests.length).toBe(2);
  const beforePeriodicRefresh = served.reactionRequests.length;
  hidden.add(120);
  await expect(page.getByText('Test Recipient 120', { exact: true })).toHaveCount(0, { timeout: 15_000 });
  await expect(cards(page)).toHaveCount(149);
  // The periodic snapshot still refreshes every shown heart in two batches.
  // Re-reading history must fetch no duplicate batches when it only removes a hidden item.
  await expect.poll(() => served.reactionRequests.length).toBe(beforePeriodicRefresh + 2);
});

test('an unchanged older page sends a conditional request and keeps its cached items', async ({ page }) => {
  // A Saturday morning in Los Angeles, inside the 10 second refresh hours (Plan 32), so the
  // refresh this journey waits for does not depend on the hour it runs.
  await page.clock.install({ time: new Date('2026-09-12T16:00:00Z') });
  const served = await serveFeed(page, { total: 150 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Show older recognitions' }).click();
  await expect(cards(page)).toHaveCount(150);
  await expect(page.getByText('Test Recipient 120', { exact: true })).toBeAttached();

  await expect.poll(() => served.olderIfNoneMatch.length, { timeout: 15_000 }).toBeGreaterThan(1);

  expect(served.olderIfNoneMatch[0]).toBe('');
  expect(served.olderIfNoneMatch[1]).toBe(`"${'a'.repeat(32)}"`);
  await expect(cards(page)).toHaveCount(150);
  await expect(page.getByText('Test Recipient 120', { exact: true })).toBeAttached();
});
