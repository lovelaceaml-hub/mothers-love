import { expect, test } from '@playwright/test';
import { buildActiveDisplayFixture, fulfillJson } from '../color-polish-scenes/helpers';

test('slow TV keeps its iframe and content until a scheduled authoritative privacy update', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-10T18:00:00Z') });
  let reads = 0;
  let quiet = false;
  const snapshot = buildActiveDisplayFixture();
  await page.route('**/api/**', async (route) => {
    if (new URL(route.request().url()).pathname !== '/api/display/color-polish') return fulfillJson(route, { items: [] });
    reads++;
    return fulfillJson(route, { ...snapshot, recognitions: quiet ? [] : snapshot.recognitions, arrivals: [], settings: { ...snapshot.settings, mode: quiet ? 'quiet' : 'normal' } });
  });
  await page.goto('/display');
  const display = page.locator('[data-display-phase="active"]');
  await expect(display).toBeVisible();
  const initialReads = reads;
  await display.locator('iframe').evaluate((frame) => frame.setAttribute('data-retained', 'same-frame'));
  await page.clock.fastForward(60_001);
  await expect(display).toBeVisible();
  await expect(display.locator('iframe')).toHaveAttribute('data-retained', 'same-frame');
  expect(reads).toBe(initialReads);
  quiet = true;
  const refreshed = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/display/color-polish');
  await page.clock.fastForward(539_999);
  await refreshed;
  await expect(page.locator('[data-display-phase="quiet"]')).toBeVisible();
  expect(reads).toBe(initialReads + 1);
});

test('TV retains its last content across midnight and makes one resume read at 07:00', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-11T06:59:00Z') });
  let reads = 0;
  const snapshot = buildActiveDisplayFixture();
  await page.route('**/api/**', async (route) => {
    if (new URL(route.request().url()).pathname !== '/api/display/color-polish') return fulfillJson(route, { items: [] });
    reads++;
    const serverTime = await page.evaluate(() => new Date().toISOString());
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date(serverTime));
    return fulfillJson(route, { ...snapshot, serverTime, aggregate: { ...snapshot.aggregate, periodEnd: day }, insights: { ...snapshot.insights, currentWeek: { ...snapshot.insights.currentWeek, periodEnd: day }, month: { ...snapshot.insights.month, periodEnd: day }, campaign: { ...snapshot.insights.campaign, periodEnd: day } } });
  });
  await page.goto('/display');
  await expect(page.locator('[data-display-phase="active"]')).toBeVisible();
  const initialReads = reads;
  await page.clock.fastForward(2 * 60_000);
  await expect(page.locator('[data-display-phase="active"]')).toBeVisible();
  expect(reads).toBe(initialReads);
  const resumed = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/display/color-polish');
  await page.clock.fastForward(6 * 3_600_000 + 59 * 60_000);
  await resumed;
  await expect(page.locator('[data-display-phase="active"]')).toBeVisible();
  expect(reads).toBe(initialReads + 1);
});
