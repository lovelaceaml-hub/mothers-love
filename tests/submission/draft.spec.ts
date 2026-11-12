import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// A half-written recognition stays in the tab it was written in (src/lib/recognition-draft.ts).
async function openCollection(page: Page) {
  await page.route('**/api/config', async (route) => {
    await route.fulfill({ json: { collectionOpen: true, configured: true } });
  });
  await page.goto('/recognize');
  await expect(page.getByLabel('Your name')).toBeVisible();
}

async function fillDraft(page: Page) {
  await page.getByLabel('Your name').fill('Example Sender');
  await page.getByLabel('Who would you like to recognize?').fill('Example Friend');
  await page.getByRole('button', { name: /Thank you\. It's all thanks/ }).click();
  await page.getByRole('button', { name: /Can I give you a hand/ }).click();
  await page.getByLabel('Share your appreciation').fill('Thank you for staying to help 🌼');
}

async function expectDraft(page: Page) {
  await expect(page.getByLabel('Your name')).toHaveValue('Example Sender');
  await expect(page.getByLabel('Who would you like to recognize?')).toHaveValue('Example Friend');
  await expect(page.getByLabel('Share your appreciation')).toHaveValue('Thank you for staying to help 🌼');
  await expect(page.getByRole('button', { name: /^Selected expression 02/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /^Selected expression 08/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /^Select expression 01/ })).toHaveAttribute('aria-pressed', 'false');
}

async function expectEmpty(page: Page) {
  await expect(page.getByLabel('Your name')).toHaveValue('');
  await expect(page.getByLabel('Who would you like to recognize?')).toHaveValue('');
  await expect(page.getByLabel('Share your appreciation')).toHaveValue('');
  await expect(page.getByTestId('draft-restored')).toHaveCount(0);
}

test('a reload brings back the unfinished recognition, and Start over clears it for good', async ({ page }) => {
  await openCollection(page);
  await expect(page.getByTestId('draft-restored')).toHaveCount(0);
  await fillDraft(page);

  await page.reload();
  await expect(page.getByTestId('draft-restored')).toContainText('Your unfinished recognition is still here.');
  await expectDraft(page);
  const results = await new AxeBuilder({ page: page as never }).analyze();
  expect(results.violations).toEqual([]);

  await page.getByRole('button', { name: 'Start over' }).click();
  await expectEmpty(page);
  await page.reload();
  await expect(page.getByLabel('Your name')).toBeVisible();
  await expectEmpty(page);
});

test('another tab never sees the unfinished recognition', async ({ page, context }) => {
  await openCollection(page);
  await fillDraft(page);
  const other = await context.newPage();
  await openCollection(other);
  await expectEmpty(other);
  await other.close();
});

test('a send that was never confirmed comes back ready to retry with the same key, then leaves nothing behind', async ({ page }) => {
  await openCollection(page);
  const keys: unknown[] = [];
  await page.route('**/api/recognitions', async (route) => {
    keys.push((route.request().postDataJSON() as Record<string, unknown>).requestKey);
    if (keys.length === 1) {
      await route.abort('failed');
      return;
    }
    await route.fulfill({ status: 201, json: { id: 'synthetic-draft-retry', status: 'held', expiresAt: '2030-01-08T00:00:00.000Z' } });
  });
  await fillDraft(page);
  await page.getByRole('button', { name: 'Send recognition' }).click();
  await expect(page.getByText('Your recognition is not confirmed yet.')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Your recognition is not confirmed yet.')).toBeVisible();
  await expectDraft(page);
  await page.getByRole('button', { name: 'Retry recognition' }).click();
  await expect(page.getByTestId('submission-receipt')).toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);

  await page.reload();
  await expect(page.getByLabel('Your name')).toBeVisible();
  await expectEmpty(page);
});

test('editing after an unconfirmed send and a reload uses a new key', async ({ page }) => {
  await openCollection(page);
  const keys: unknown[] = [];
  await page.route('**/api/recognitions', async (route) => {
    keys.push((route.request().postDataJSON() as Record<string, unknown>).requestKey);
    if (keys.length === 1) {
      await route.abort('failed');
      return;
    }
    await route.fulfill({ status: 201, json: { id: 'synthetic-draft-edit', status: 'published', expiresAt: '2030-01-08T00:00:00.000Z' } });
  });
  await fillDraft(page);
  await page.getByRole('button', { name: 'Send recognition' }).click();
  await expect(page.getByText('Your recognition is not confirmed yet.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Retry recognition' })).toBeVisible();
  await page.getByLabel('Share your appreciation').fill('Thank you for staying to help, again.');
  await page.getByRole('button', { name: 'Send recognition' }).click();
  await expect(page.getByTestId('submission-receipt')).toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[0]).not.toBe(keys[1]);
});
