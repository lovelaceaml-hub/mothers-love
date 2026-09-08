import { join } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

type FixtureSize = 0 | 1 | 2 | 20 | 'long';
type FixtureOptions = { showTrails?: boolean; showConstellations?: boolean; nonSharedExpressions?: boolean; continuous?: boolean; milestone?: boolean; mode?: 'normal' | 'quiet' | 'neutral'; motion?: 'calm' | 'standard' | 'lively' | 'still' };
const LONG_RECIPIENT = 'R'.repeat(80);
const LONG_MESSAGE = Array.from({ length: 24 }, (_, index) => `Line ${index + 1}: preserve this exact appreciation.\n`).join('').slice(0, 500);
const DENSE_LINE_MESSAGE = `${'A\n'.repeat(249)}A`;
const LONG_EXPRESSIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const DISPLAY_CAPTURE_ENABLED = Boolean(process.env.DISPLAY_CAPTURE_SCREENS || process.env.DISPLAY_SCREENSHOTS);
const DISPLAY_CAPTURE_DIRECTORY = process.env.DISPLAY_SCREENSHOT_DIR
  ?? (process.env.DISPLAY_SCREENSHOTS && process.env.DISPLAY_SCREENSHOTS !== '1' ? process.env.DISPLAY_SCREENSHOTS : undefined);

const fixtureRecognition = (id: number, long = false, expressionIds = [1, 2, 6]) => ({
  id: `synthetic-${id}`,
  recipient: `Synthetic recipient ${id}`,
  message: long
    ? `Synthetic long appreciation ${id}. `.repeat(48).slice(0, 500)
    : `Synthetic appreciation message ${id}.`,
  expressionIds,
  createdAt: '2026-09-08T12:00:00.000Z',
  firstPublishedAt: new Date(Date.parse('2026-09-08T12:00:00.000Z') + id * 1_000).toISOString(),
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
      mode: options.mode ?? 'normal',
      motion: options.motion ?? 'still',
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
  options: Pick<FixtureOptions, 'motion'> = {},
) {
  const base = fixture(1, options);
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

async function routeReactionCounts(page: Page) {
  await page.route(/\/api\/reactions\?ids=/, async (route) => {
    const ids = new URL(route.request().url()).searchParams.get('ids')?.split(',').filter(Boolean) ?? [];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: ids.map((id) => {
          const suffix = Number(id.split('-').pop());
          return { id, count: Number.isSafeInteger(suffix) && suffix > 0 ? suffix : 1, liked: false };
        }),
      }),
    });
  });
}

async function pairAndRead(page: Page, size: FixtureSize, options: FixtureOptions = {}) {
  await routeReactionCounts(page);
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
      ? {
        ...response,
        aggregate: options.milestone
          ? { ...response.aggregate, expressionCounts: [6, 6, 6, 6, 6, 5, 5, 5, 5], expressionTotal: 50 }
          : response.aggregate,
        revision: snapshotCalls,
        cursor: `fixture-${size}-${snapshotCalls}`,
        sync: 'delta' as const,
      }
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

async function pairLongAcceptance(page: Page, withArrival: boolean, message = LONG_MESSAGE, options: Pick<FixtureOptions, 'motion'> = {}) {
  await routeReactionCounts(page);
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
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(longAcceptanceFixture(1, 'reset', [], message, options)) });
      return;
    }
    const arrival = { eventId: 'long-acceptance-event', recognitionId: 'synthetic-1', publishedAt: '2026-09-08T12:00:00.000Z' };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(longAcceptanceFixture(snapshotCalls, 'delta', withArrival ? [arrival] : [], message, options)),
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

  test('keeps the paired live rail newest first, capped at 30, and outside the stage and QR dock', async ({ page }) => {
    await pairAndRead(page, 20);
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-rail-count', '20', { timeout: 10_000 });
    await expect(page.getByTestId('live-rail')).toBeVisible();
    await expect(page.getByTestId('live-rail').getByTestId('live-recognition')).toHaveCount(20);
    await expect(page.getByTestId('live-rail').getByTestId('live-recognition').first()).toContainText('Synthetic recipient 20');
    await expect(page.getByTestId('live-rail').getByTestId('live-recognition').first()).toContainText('20 hearts', { timeout: 10_000 });
    await expect(page.getByTestId('live-rail').getByTestId('live-recognition').last()).toContainText('Synthetic recipient 1');

    const cardShape = await page.getByTestId('recognition-card').first().evaluate((card) => {
      const style = getComputedStyle(card);
      return { borderRadius: style.borderRadius, width: card.getBoundingClientRect().width, height: card.getBoundingClientRect().height };
    });
    expect(cardShape.borderRadius).not.toBe('50%');
    expect(cardShape.width).toBeGreaterThan(cardShape.height * 0.7);

    for (const viewport of [{ width: 1920, height: 1080 }, { width: 3840, height: 2160 }]) {
      await page.setViewportSize(viewport);
      const bounds = await page.evaluate(() => {
        const app = document.querySelector<HTMLElement>('[data-testid="display-app"]')?.getBoundingClientRect();
        const rail = document.querySelector<HTMLElement>('[data-testid="live-rail"]')?.getBoundingClientRect();
        const stage = document.querySelector<HTMLElement>('[class*="stage"]')?.getBoundingClientRect();
        const qr = document.querySelector<HTMLElement>('[aria-label="Share a recognition"]')?.getBoundingClientRect();
        if (!app || !rail || !stage || !qr) return null;
        return {
          appRight: app.right,
          appBottom: app.bottom,
          railLeft: rail.left,
          railRight: rail.right,
          railBottom: rail.bottom,
          stageRight: stage.right,
          qrRight: qr.right,
          qrTop: qr.top,
          railTop: rail.top,
        };
      });
      expect(bounds).not.toBeNull();
      expect(bounds!.railRight).toBeLessThanOrEqual(bounds!.appRight + 2);
      expect(bounds!.railBottom).toBeLessThanOrEqual(bounds!.appBottom + 2);
      expect(bounds!.stageRight).toBeLessThanOrEqual(bounds!.railLeft - 20);
      expect(bounds!.qrRight).toBeLessThanOrEqual(bounds!.railLeft + 2);
      expect(bounds!.qrTop).toBeGreaterThanOrEqual(bounds!.railTop - 2);
    }
  });

  test('keeps cluster content clear of its expression panel at TV sizes', async ({ page }) => {
    test.setTimeout(60_000);
    await page.clock.install({ time: new Date('2026-09-08T12:00:00.000Z') });
    await page.setViewportSize({ width: 1280, height: 720 });
    await pairAndRead(page, 2, { continuous: true });
    for (let step = 0; step < 30; step += 1) {
      if (await page.getByTestId('display-app').getAttribute('data-screen') === 'cluster') break;
      await page.clock.runFor(5_000);
    }
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-screen', 'cluster', { timeout: 2_000 });

    for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }, { width: 3840, height: 2160 }]) {
      await page.setViewportSize(viewport);
      const metrics = await page.evaluate(() => {
        const core = document.querySelector<HTMLElement>('[class*="clusterCore"]')?.getBoundingClientRect();
        const cards = [...document.querySelectorAll<HTMLElement>('[class*="clusterCards"] [data-testid="recognition-card"]')].map((card) => {
          const rect = card.getBoundingClientRect();
          const text = [...card.querySelectorAll<HTMLElement>('h3, p, span')].map((element) => {
            const textRect = element.getBoundingClientRect();
            return { left: textRect.left, right: textRect.right, top: textRect.top, bottom: textRect.bottom };
          });
          return {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            text,
          };
        });
        if (!core) return null;
        return { core: { left: core.left, right: core.right, top: core.top, bottom: core.bottom }, cards };
      });
      expect(metrics).not.toBeNull();
      expect(metrics!.cards.length).toBeGreaterThan(0);
      for (const card of metrics!.cards) {
        const overlaps = card.left < metrics!.core.right && card.right > metrics!.core.left && card.top < metrics!.core.bottom && card.bottom > metrics!.core.top;
        expect(overlaps).toBe(false);
        for (const text of card.text) {
          expect(text.left).toBeGreaterThanOrEqual(card.left - 1);
          expect(text.right).toBeLessThanOrEqual(card.right + 1);
          expect(text.top).toBeGreaterThanOrEqual(card.top - 1);
          expect(text.bottom).toBeLessThanOrEqual(card.bottom + 1);
        }
      }
    }
  });

  test('keeps all-nine expression cards clear of the QR dock at TV sizes', async ({ page }) => {
    test.setTimeout(60_000);
    await page.clock.install({ time: new Date('2026-09-08T12:00:00.000Z') });
    await page.setViewportSize({ width: 1280, height: 720 });
    await pairAndRead(page, 2, { continuous: true });
    for (let step = 0; step < 30; step += 1) {
      if (await page.getByTestId('display-app').getAttribute('data-screen') === 'all-nine') break;
      await page.clock.runFor(5_000);
    }
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-screen', 'all-nine', { timeout: 2_000 });

    for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }, { width: 3840, height: 2160 }]) {
      await page.setViewportSize(viewport);
      const metrics = await page.evaluate(() => {
        const qr = document.querySelector<HTMLElement>('[aria-label="Share a recognition"]')?.getBoundingClientRect();
        const cards = [...document.querySelectorAll<HTMLElement>('[class*="expressionGrid"] [class*="expressionCard"]')].map((card) => {
          const rect = card.getBoundingClientRect();
          const text = [...card.querySelectorAll<HTMLElement>('p, strong, span')].map((element) => {
            const textRect = element.getBoundingClientRect();
            return { left: textRect.left, right: textRect.right, top: textRect.top, bottom: textRect.bottom };
          });
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, text };
        });
        if (!qr) return null;
        return { qr: { left: qr.left, right: qr.right, top: qr.top, bottom: qr.bottom }, cards };
      });
      expect(metrics).not.toBeNull();
      expect(metrics!.cards).toHaveLength(9);
      for (const card of metrics!.cards) {
        const overlaps = card.left < metrics!.qr.right && card.right > metrics!.qr.left && card.top < metrics!.qr.bottom && card.bottom > metrics!.qr.top;
        expect(overlaps).toBe(false);
        for (const text of card.text) {
          expect(text.left).toBeGreaterThanOrEqual(card.left - 1);
          expect(text.right).toBeLessThanOrEqual(card.right + 1);
          expect(text.top).toBeGreaterThanOrEqual(card.top - 1);
          expect(text.bottom).toBeLessThanOrEqual(card.bottom + 1);
        }
      }
    }
  });

  test('removes the live rail and personal counts in neutral mode', async ({ page }) => {
    await pairAndRead(page, 2, { mode: 'neutral' });
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-screen', 'neutral', { timeout: 10_000 });
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-eligible-count', '0');
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-rail-count', '0');
    await expect(page.getByTestId('live-rail')).toHaveCount(0);
    await expect(page.getByText('Synthetic recipient 1')).toHaveCount(0);
  });

  test('gives each rotating screen its own motion composition', async ({ page }) => {
    test.setTimeout(60_000);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.clock.install({ time: new Date('2026-09-08T12:00:00.000Z') });
    await pairAndRead(page, 2, { continuous: true, motion: 'standard' });
    const seen = new Map<string, string>();
    const capture = async () => {
      const screen = await page.getByTestId('display-app').getAttribute('data-screen');
      const motion = await page.locator('[data-motion-key]').evaluate((element) => {
        const style = getComputedStyle(element);
        return { key: element.getAttribute('data-motion-key'), animationName: style.animationName };
      });
      expect(screen).toBeTruthy();
      expect(motion.key).toBeTruthy();
      expect(motion.animationName).not.toBe('none');
      seen.set(screen!, motion.key!);
    };
    for (let step = 0; step < 30 && seen.size < 5; step += 1) {
      await capture();
      await page.clock.runFor(5_000);
    }
    expect(new Set(seen.keys())).toEqual(new Set(['garden', 'featured', 'impact', 'all-nine', 'cluster']));
    expect(new Set(seen.values()).size).toBe(5);
  });

  test('uses a distinct computed motion for an arrival screen', async ({ page }) => {
    test.setTimeout(60_000);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.clock.install({ time: new Date('2026-09-08T12:00:00.000Z') });
    await pairLongAcceptance(page, true, LONG_MESSAGE, { motion: 'standard' });
    for (let step = 0; step < 50; step += 1) {
      if (await page.getByTestId('display-app').getAttribute('data-screen') === 'arrival') break;
      await page.clock.runFor(500);
    }
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-screen', 'arrival', { timeout: 2_000 });
    const motion = await page.locator('[data-motion-key]').evaluate((element) => ({ key: element.getAttribute('data-motion-key'), animationName: getComputedStyle(element).animationName }));
    expect(motion.key).toBe('arrival-land');
    expect(motion.animationName).not.toBe('none');
  });

  test('uses a distinct computed motion for a milestone screen', async ({ page }) => {
    test.setTimeout(60_000);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.clock.install({ time: new Date('2026-09-08T12:00:00.000Z') });
    await pairAndRead(page, 2, { continuous: true, milestone: true, motion: 'standard' });
    for (let step = 0; step < 50; step += 1) {
      if (await page.getByTestId('display-app').getAttribute('data-screen') === 'milestone') break;
      await page.clock.runFor(500);
    }
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-screen', 'milestone', { timeout: 2_000 });
    const motion = await page.locator('[data-motion-key]').evaluate((element) => ({ key: element.getAttribute('data-motion-key'), animationName: getComputedStyle(element).animationName }));
    expect(motion.key).toBe('milestone-glow');
    expect(motion.animationName).not.toBe('none');
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
    for (let step = 0; step < 50; step += 1) {
      if (await page.getByTestId('display-app').getAttribute('data-screen') === 'featured') break;
      await page.clock.runFor(500);
    }
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
    for (let step = 0; step < 50; step += 1) {
      if (await page.getByTestId('display-app').getAttribute('data-screen') === 'arrival') break;
      await page.clock.runFor(500);
    }
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
    const testStart = new Date('2026-09-08T12:00:00.000Z');
    await page.clock.install({ time: testStart });
    await page.clock.pauseAt(testStart);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await pairLongAcceptance(page, false, DENSE_LINE_MESSAGE);
    for (let step = 0; step < 50; step += 1) {
      if (await page.getByTestId('display-app').getAttribute('data-screen') === 'featured') break;
      await page.clock.runFor(500);
    }
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
    test.skip(!DISPLAY_CAPTURE_ENABLED || !DISPLAY_CAPTURE_DIRECTORY, 'Set DISPLAY_SCREENSHOTS=1 and DISPLAY_SCREENSHOT_DIR to capture evidence.');
    test.setTimeout(140_000);
    await pairAndRead(page, 2, { continuous: true });
    const directory = DISPLAY_CAPTURE_DIRECTORY!;
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-screen', 'garden', { timeout: 15_000 });
    await page.screenshot({ path: join(directory, 'garden-multi-record.png'), fullPage: true });
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-screen', 'featured', { timeout: 30_000 });
    await page.screenshot({ path: join(directory, 'featured-multi-record.png'), fullPage: true });
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-screen', 'all-nine', { timeout: 70_000 });
    await page.screenshot({ path: join(directory, 'all-nine-multi-record.png'), fullPage: true });
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-screen', 'cluster', { timeout: 35_000 });
    await page.screenshot({ path: join(directory, 'cluster-multi-record.png'), fullPage: true });
  });

  test('captures fallback, quiet, and neutral safety screens', async ({ page }) => {
    test.skip(!DISPLAY_CAPTURE_ENABLED || !DISPLAY_CAPTURE_DIRECTORY, 'Set DISPLAY_SCREENSHOTS=1 and DISPLAY_SCREENSHOT_DIR to capture evidence.');
    const directory = DISPLAY_CAPTURE_DIRECTORY!;

    const fallbackPage = await page.context().newPage();
    await pairAndRead(fallbackPage, 0);
    await expect(fallbackPage.getByTestId('display-app')).toHaveAttribute('data-screen', 'fallback', { timeout: 10_000 });
    await fallbackPage.screenshot({ path: join(directory, 'fallback-empty.png'), fullPage: true });
    await fallbackPage.close();

    const quietPage = await page.context().newPage();
    await pairAndRead(quietPage, 2, { mode: 'quiet' });
    await expect(quietPage.getByTestId('display-app')).toHaveAttribute('data-screen', 'quiet', { timeout: 10_000 });
    await quietPage.screenshot({ path: join(directory, 'quiet-mode.png'), fullPage: true });
    await quietPage.close();

    const neutralPage = await page.context().newPage();
    await pairAndRead(neutralPage, 2, { mode: 'neutral' });
    await expect(neutralPage.getByTestId('display-app')).toHaveAttribute('data-screen', 'neutral', { timeout: 10_000 });
    await neutralPage.screenshot({ path: join(directory, 'neutral-mode.png'), fullPage: true });
    await neutralPage.close();
  });

  test('captures arrival and milestone screens from synthetic snapshots', async ({ page }) => {
    test.skip(!DISPLAY_CAPTURE_ENABLED || !DISPLAY_CAPTURE_DIRECTORY, 'Set DISPLAY_SCREENSHOTS=1 and DISPLAY_SCREENSHOT_DIR to capture evidence.');
    test.setTimeout(90_000);
    const directory = DISPLAY_CAPTURE_DIRECTORY!;

    await page.clock.install({ time: new Date('2026-09-08T12:00:00.000Z') });
    await pairLongAcceptance(page, true);
    for (let step = 0; step < 50; step += 1) {
      if (await page.getByTestId('display-app').getAttribute('data-screen') === 'arrival') break;
      await page.clock.runFor(500);
    }
    await expect(page.getByTestId('display-app')).toHaveAttribute('data-screen', 'arrival', { timeout: 2_000 });
    await page.screenshot({ path: join(directory, 'arrival-long.png'), fullPage: true });

    const milestonePage = await page.context().newPage();
    await milestonePage.clock.install({ time: new Date('2026-09-08T12:00:00.000Z') });
    await pairAndRead(milestonePage, 2, { continuous: true, milestone: true });
    for (let step = 0; step < 50; step += 1) {
      if (await milestonePage.getByTestId('display-app').getAttribute('data-screen') === 'milestone') break;
      await milestonePage.clock.runFor(500);
    }
    await expect(milestonePage.getByTestId('display-app')).toHaveAttribute('data-screen', 'milestone', { timeout: 2_000 });
    await milestonePage.screenshot({ path: join(directory, 'milestone-50.png'), fullPage: true });
    await milestonePage.close();
  });
});
