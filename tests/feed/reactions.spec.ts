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
