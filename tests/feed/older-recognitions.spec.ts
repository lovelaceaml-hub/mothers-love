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
  const olderCursors: string[] = [];
  await page.route('**/api/feed', async (route) => {
    const hidden = options.hidden ?? new Set<number>();
    await route.fulfill({ headers: { 'cache-control': 'no-store' }, json: { serverTime, items: records(1, Math.min(options.total, 100), hidden) } });
  });
  await page.route((url) => url.pathname === '/api/feed/older', async (route) => {
    const url = new URL(route.request().url());
    olderCursors.push(`${url.searchParams.get('before')}|${url.searchParams.get('id')}`);
    if (options.failOlder?.()) {
      await route.fulfill({ status: 503, json: { ok: false, code: 'UNAVAILABLE' } });
      return;
    }
    const after = Number(url.searchParams.get('id')?.replace('synthetic-', ''));
    const hidden = options.hidden ?? new Set<number>();
    const count = Math.max(0, Math.min(100, options.total - after));
    await route.fulfill({ headers: { 'cache-control': 'no-store' }, json: { serverTime, items: records(after + 1, count, hidden) } });
  });
  await page.route('**/api/reactions**', async (route) => {
    const ids = new URL(route.request().url()).searchParams.get('ids')?.split(',').filter(Boolean) ?? [];
    ids.forEach((id) => reactionIds.add(id));
    await route.fulfill({ json: { items: ids.map((id) => ({ id, count: 0, liked: false })) } });
  });
  return { reactionIds, olderCursors };
}

const cards = (page: Page) => page.locator('#recent-recognitions [data-recognition-id]');

test('shows the newest 100, then adds older recognitions a page at a time', async ({ page }) => {
  const served = await serveFeed(page, { total: 230 });
  await page.goto('/');
  await expect(cards(page)).toHaveCount(100);

  const showOlder = page.getByRole('button', { name: 'Show older recognitions' });
  await showOlder.click();
  await expect(cards(page)).toHaveCount(200);
  await expect(page.getByText('Test Recipient 101', { exact: true })).toBeAttached();
  expect(served.olderCursors[0]).toBe(`${record(100).firstPublishedAt}|${record(100).id}`);
  await expect.poll(() => served.reactionIds.has(record(200).id)).toBe(true);

  await showOlder.click();
  await expect(cards(page)).toHaveCount(230);
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
  const hidden = new Set<number>();
  await serveFeed(page, { total: 150, hidden });
  await page.goto('/');
  await page.getByRole('button', { name: 'Show older recognitions' }).click();
  await expect(page.getByText('Test Recipient 120', { exact: true })).toBeAttached();
  hidden.add(120);
  await expect(page.getByText('Test Recipient 120', { exact: true })).toHaveCount(0, { timeout: 15_000 });
  await expect(cards(page)).toHaveCount(149);
});
