import { expect, test } from '@playwright/test';

const serverTime = '2030-01-01T12:00:00.000Z';

const feedItem = {
  id: '00000000-0000-4000-8000-000000000001',
  recipient: 'Michelle R.',
  message: 'Your kindness made a hard day feel lighter.',
  expressionIds: [2, 6, 8],
  firstPublishedAt: '2030-01-01T11:59:00.000Z',
  expiresAt: '2030-01-08T11:59:00.000Z',
};

test('loads confirmed heart counts and toggles with server state', async ({ page }) => {
  const requests: Array<{ method: string; body?: { liked?: boolean } }> = [];
  await page.route('**/api/feed', async (route) => {
    await route.fulfill({ json: { serverTime, items: [feedItem] } });
  });
  await page.route('**/api/reactions**', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({ json: { items: [{ id: feedItem.id, count: 7, liked: false }] } });
      return;
    }
    const body = request.postDataJSON() as { liked?: boolean };
    requests.push({ method: request.method(), body });
    await route.fulfill({
      json: {
        id: feedItem.id,
        count: body.liked ? 8 : 7,
        liked: Boolean(body.liked),
      },
    });
  });

  await page.goto('/');
  const heart = page.getByRole('button', { name: 'Like recognition for Michelle R.' });
  await expect(heart).toBeEnabled();
  await expect(heart).toHaveAttribute('aria-pressed', 'false');
  await expect(heart).toContainText('7');

  await heart.click();
  await expect(heart).toHaveAttribute('aria-pressed', 'true');
  await expect(heart).toContainText('8');
  expect(requests).toEqual([{ method: 'PUT', body: { liked: true } }]);
});

test('toggles off with the server-confirmed count', async ({ page }) => {
  const requests: boolean[] = [];
  await page.route('**/api/feed', async (route) => {
    await route.fulfill({ json: { serverTime, items: [feedItem] } });
  });
  await page.route('**/api/reactions**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { items: [{ id: feedItem.id, count: requests.at(-1) ? 8 : 7, liked: Boolean(requests.at(-1)) }] } });
      return;
    }
    const body = route.request().postDataJSON() as { liked?: boolean };
    requests.push(Boolean(body.liked));
    await route.fulfill({ json: { id: feedItem.id, count: body.liked ? 8 : 7, liked: Boolean(body.liked) } });
  });

  await page.goto('/');
  const heart = page.getByRole('button', { name: 'Like recognition for Michelle R.' });
  await expect(heart).toBeEnabled();
  await heart.click();
  await expect(heart).toHaveAttribute('aria-pressed', 'true');
  await heart.click();
  await expect(heart).toHaveAttribute('aria-pressed', 'false');
  await expect(heart).toContainText('7');
  expect(requests).toEqual([true, false]);
});

test('does not let an older poll overwrite a confirmed PUT', async ({ page }) => {
  let readCount = 0;
  let releaseRead: (() => void) | undefined;
  let releasePut: (() => void) | undefined;
  const delayedRead = new Promise<void>((resolve) => { releaseRead = resolve; });
  const pendingPut = new Promise<void>((resolve) => { releasePut = resolve; });

  await page.addInitScript(() => {
    const nativeSetInterval = window.setInterval;
    window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => (
      nativeSetInterval(handler, timeout === 10_000 ? 100 : timeout, ...args)
    )) as typeof window.setInterval;
  });

  await page.route('**/api/feed', async (route) => {
    await route.fulfill({ json: { serverTime, items: [feedItem] } });
  });
  await page.route('**/api/reactions**', async (route) => {
    if (route.request().method() === 'GET') {
      readCount += 1;
      if (readCount > 1) await delayedRead;
      await route.fulfill({ json: { items: [{ id: feedItem.id, count: 7, liked: false }] } });
      return;
    }
    await pendingPut;
    await route.fulfill({ json: { id: feedItem.id, count: 8, liked: true } });
  });

  await page.goto('/');
  const heart = page.getByRole('button', { name: 'Like recognition for Michelle R.' });
  await expect(heart).toBeEnabled();
  await heart.click();
  await expect.poll(() => readCount, { timeout: 3_000 }).toBeGreaterThan(1);
  await expect(heart).toBeDisabled();
  releasePut?.();
  await expect(heart).toHaveAttribute('aria-pressed', 'true');
  await expect(heart).toContainText('8');
  releaseRead?.();
  await expect(heart).toHaveAttribute('aria-pressed', 'true');
  await expect(heart).toContainText('8');
});

test('recovers from unavailable reaction writes after retrying the read', async ({ page }) => {
  const writeStatuses = [404, 428, 429, 200];
  let writeCount = 0;
  await page.route('**/api/feed', async (route) => {
    await route.fulfill({ json: { serverTime, items: [feedItem] } });
  });
  await page.route('**/api/reactions**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { items: [{ id: feedItem.id, count: 7, liked: false }] } });
      return;
    }
    const status = writeStatuses[writeCount] ?? 200;
    writeCount += 1;
    if (status !== 200) {
      await route.fulfill({ status, json: { error: 'synthetic reaction failure' } });
      return;
    }
    await route.fulfill({ json: { id: feedItem.id, count: 8, liked: true } });
  });

  await page.goto('/');
  const heart = page.getByRole('button', { name: 'Like recognition for Michelle R.' });
  for (const expectedStatus of writeStatuses.slice(0, 3)) {
    await expect(heart).toBeEnabled();
    await heart.click();
    await expect(page.getByRole('button', { name: 'Try loading hearts again' })).toBeVisible();
    expect(expectedStatus).toBeGreaterThanOrEqual(400);
    await page.getByRole('button', { name: 'Try loading hearts again' }).click();
    await expect(heart).toBeEnabled();
  }
  await heart.click();
  await expect(heart).toHaveAttribute('aria-pressed', 'true');
  await expect(heart).toContainText('8');
});

test('does not resurrect a hidden item after a pending write returns', async ({ page }) => {
  await page.clock.install();
  let feedRequestCount = 0;
  let releasePut: (() => void) | undefined;
  const pendingPut = new Promise<void>((resolve) => { releasePut = resolve; });
  await page.route('**/api/feed', async (route) => {
    feedRequestCount += 1;
    await route.fulfill({ json: { serverTime, items: feedRequestCount === 1 ? [feedItem] : [] } });
  });
  await page.route('**/api/reactions**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { items: [{ id: feedItem.id, count: 7, liked: false }] } });
      return;
    }
    await pendingPut;
    await route.fulfill({ json: { id: feedItem.id, count: 8, liked: true } });
  });

  await page.goto('/');
  const heart = page.getByRole('button', { name: 'Like recognition for Michelle R.' });
  await expect(heart).toBeEnabled();
  await heart.click();
  await page.clock.fastForward(10_000);
  await expect(page.getByText('Michelle R.')).toHaveCount(0);
  releasePut?.();
  await expect(page.getByText('Michelle R.')).toHaveCount(0);
});

test('does not resurrect an expired item after a pending write returns', async ({ page }) => {
  await page.clock.install();
  let releasePut: (() => void) | undefined;
  const pendingPut = new Promise<void>((resolve) => { releasePut = resolve; });
  await page.route('**/api/feed', async (route) => {
    await route.fulfill({ json: { serverTime, items: [{ ...feedItem, expiresAt: '2030-01-01T12:00:01.000Z' }] } });
  });
  await page.route('**/api/reactions**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { items: [{ id: feedItem.id, count: 7, liked: false }] } });
      return;
    }
    await pendingPut;
    await route.fulfill({ json: { id: feedItem.id, count: 8, liked: true } });
  });

  await page.goto('/');
  const heart = page.getByRole('button', { name: 'Like recognition for Michelle R.' });
  await expect(heart).toBeEnabled();
  await heart.click();
  await page.clock.fastForward(1_200);
  await expect(page.getByText('Michelle R.')).toHaveCount(0);
  releasePut?.();
  await expect(page.getByText('Michelle R.')).toHaveCount(0);
});

test('does not invent a count before the reaction read succeeds', async ({ page }) => {
  let releaseRead: (() => void) | undefined;
  const pendingRead = new Promise<void>((resolve) => { releaseRead = resolve; });
  await page.route('**/api/feed', async (route) => {
    await route.fulfill({ json: { serverTime, items: [feedItem] } });
  });
  await page.route('**/api/reactions**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await pendingRead;
    await route.fulfill({ json: { items: [{ id: feedItem.id, count: 0, liked: false }] } });
  });

  await page.goto('/');
  const heart = page.getByRole('button', { name: 'Hearts unavailable for Michelle R.' });
  await expect(heart).toBeDisabled();
  await expect(heart).toContainText('Hearts unavailable');
  await expect(heart).not.toContainText('0');
  releaseRead?.();
  await expect(page.getByRole('button', { name: 'Like recognition for Michelle R.' })).toContainText('0');
});
