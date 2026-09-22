import { expect, test } from '@playwright/test';

test('current and proposed TV views use the same fictional messages without API reads', async ({ page }) => {
  const apiReads: string[] = [];
  const errors: string[] = [];
  page.on('request', r => { if (new URL(r.url()).pathname.startsWith('/api/')) apiReads.push(r.url()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/display/tv-design-preview');
  await expect(page.getByRole('button', { name: 'Preview arrival' })).toBeEnabled();
  const current = page.frameLocator('iframe[src="/color-polish/renderer.html"]');
  const design = page.frameLocator('iframe[src="/tv-pearl-study/renderer.html"]');
  await expect(design.locator('#stage .message')).toHaveCount(3);
  expect((await current.locator('#stage .message').allTextContents()).sort()).toEqual((await design.locator('#stage .message').allTextContents()).sort());
  await expect(design.locator('#stage .thanks').first()).toHaveText('Thank you,');
  await page.getByRole('button', { name: 'Pause motion' }).click();
  await expect(design.locator('#tv')).toHaveClass(/still/);
  expect(apiReads).toEqual([]);
  expect(errors).toEqual([]);
});

test('arrival uses the existing director, reads its complete message and clears on reset', async ({ page }) => {
  await page.goto('/display/tv-design-preview?view=design');
  await expect(page.getByRole('button', { name: 'Preview arrival' })).toBeEnabled();
  await page.getByRole('button', { name: 'Preview arrival' }).click();
  const design = page.frameLocator('iframe[src="/tv-pearl-study/renderer.html"]');
  await expect(design.locator('#event.active .recipient')).toHaveText('Morgan', { timeout: 12000 });
  await expect(design.locator('#event .message')).toHaveText('You made time to welcome me and helped me feel at home. Thank you for the warmth and kindness you shared.');
  await expect(design.locator('.study-lotus')).toBeVisible();
  await page.getByRole('button', { name: 'Reset study' }).click();
  await expect(design.locator('[data-event-id]')).toHaveCount(0);
  await expect(design.locator('#stage .message')).toHaveCount(3);
});

test('study rejects live-source payloads and clears personal DOM before any animation', async ({ page }) => {
  await page.goto('/display/tv-design-preview?view=design');
  const frame = page.frames().find(f => f.url().endsWith('/tv-pearl-study/renderer.html'));
  await expect(page.getByRole('button', { name: 'Preview arrival' })).toBeEnabled();
  const design = page.frames().find(f => f.url().endsWith('/tv-pearl-study/renderer.html')) ?? frame;
  if (!design) throw new Error('Study frame missing');
  const result = await design.evaluate(() => {
    (window as any).applySnapshotPayload({}, { source: 'live', status: 'ready' });
    return { personal: document.querySelectorAll('[data-record-id],[data-event-id],[data-feed-id]').length, mode: (window as any).colorPolishRuntime.getState().mode };
  });
  expect(result.personal).toBe(0);
  expect(result.mode).not.toBe('normal');
});
