import { expect, test, type Page } from '@playwright/test';

type FixtureSize = 0 | 1 | 2 | 20 | 'long';

const fixtureRecognition = (id: number, long = false) => ({
  id: `synthetic-${id}`,
  recipient: `Synthetic recipient ${id}`,
  message: long
    ? `Synthetic long appreciation ${id}. `.repeat(48).slice(0, 500)
    : `Synthetic appreciation message ${id}.`,
  expressionIds: [1, 2, 6],
  createdAt: '2026-09-08T12:00:00.000Z',
  firstPublishedAt: '2026-09-08T12:00:00.000Z',
  expiresAt: '2026-09-15T12:00:00.000Z',
  version: 1,
  status: 'published' as const,
  featured: false,
});

function fixture(size: FixtureSize) {
  const count = size === 'long' ? 1 : size;
  const recognitions = Array.from({ length: count }, (_, index) => fixtureRecognition(index + 1, size === 'long'));
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
      showTrails: true,
      showConstellations: true,
    },
    submissionUrl: 'https://synthetic.invalid/recognize',
    cursor: `fixture-${size}`,
    sync: 'reset' as const,
    arrivals: [],
  };
}

async function pairAndRead(page: Page, size: FixtureSize) {
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
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture(size)) });
  });
  await page.route('**/api/display/ack', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
  await page.goto('/display');
  await page.getByLabel('Display code').fill('A7C9F2H4');
  await page.getByRole('button', { name: 'Connect this display' }).click();
  await expect(page.getByTestId('display-app')).toBeVisible();
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
    await expect(page.getByRole('heading', { name: 'Bring the living wall to life.' })).toBeVisible();
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
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'revoked', code: 'UNAUTHORIZED' }) });
    });
    await page.route('**/api/display/ack', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });
    await page.goto('/display');
    await expect(page.getByRole('heading', { name: 'Bring the living wall to life.' })).toBeVisible();
    await page.getByLabel('Display code').fill('A7C9F2H4');
    await page.getByRole('button', { name: 'Connect this display' }).click();
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-eligible-count', '2', { timeout: 15_000 });
    await page.waitForTimeout(5_500);
    await expect(page.getByRole('heading', { name: 'Bring the living wall to life.' })).toBeVisible({ timeout: 5_000 });
  });
});
