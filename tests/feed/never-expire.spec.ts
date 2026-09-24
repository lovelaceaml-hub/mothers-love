import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const serverTime = '2030-01-01T12:00:00.000Z';

async function serveSyntheticFeed(page: Page, expiresAt: string) {
  await page.route('**/api/feed', async (route) => {
    await route.fulfill({
      headers: { 'cache-control': 'no-store' },
      json: {
        serverTime,
        items: [{
          id: 'synthetic-forever-1',
          recipient: 'Test Recipient 1',
          message: 'Synthetic message 1',
          expressionIds: [2, 6],
          firstPublishedAt: '2030-01-01T11:59:00.000Z',
          expiresAt,
        }],
      },
    });
  });
  await page.route('**/api/reactions**', async (route) => {
    const ids = new URL(route.request().url()).searchParams.get('ids')?.split(',').filter(Boolean) ?? [];
    await route.fulfill({ json: { items: ids.map((id) => ({ id, count: 0, liked: false })) } });
  });
}

test('far future expiry does not spin or remove a recognition', async ({ page }) => {
  await page.addInitScript(() => {
    (window as Window & { __shortTimerCount?: number }).__shortTimerCount = 0;
    const nativeSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      if (Number(timeout ?? 0) <= 25) {
        const tracked = window as Window & { __shortTimerCount?: number };
        tracked.__shortTimerCount = (tracked.__shortTimerCount ?? 0) + 1;
      }
      return nativeSetTimeout(handler, timeout, ...args);
    }) as typeof window.setTimeout;
  });
  await serveSyntheticFeed(page, '2130-01-01T12:00:00.000Z');
  await page.goto('/');
  await expect(page.getByText('Test Recipient 1')).toBeVisible();
  await page.waitForTimeout(3_000);
  await expect(page.getByText('Test Recipient 1')).toBeVisible();
  expect(await page.evaluate(() => (window as Window & { __shortTimerCount?: number }).__shortTimerCount ?? 0)).toBeLessThan(50);
});

test('a two-day expiry still renders', async ({ page }) => {
  await serveSyntheticFeed(page, '2030-01-03T12:00:00.000Z');
  await page.goto('/');
  await expect(page.getByText('Test Recipient 1')).toBeVisible();
});
