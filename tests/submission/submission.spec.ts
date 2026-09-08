import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function openCollection(page: Page) {
  await page.route('**/api/config', async (route) => {
    await route.fulfill({ json: { collectionOpen: true, configured: true } });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: "THE WORDS OF MOTHER'S LOVE" })).toBeVisible();
}

async function fillValidDraft(page: Page) {
  await page.getByLabel('Your name').fill('Maya R.');
  await page.getByLabel('Who would you like to recognize?').fill('Michelle R.');
  await page.getByRole('button', { name: /Thank you\. It's all thanks/ }).click();
  await page.getByRole('button', { name: /I'd love to hear more/ }).click();
  await page.getByRole('button', { name: /Can I give you a hand/ }).click();
  await page.getByLabel('Share your appreciation').fill('Your kindness made a hard day feel lighter.');
}

test('publishes a normal recognition and resets all fields for a new recognition', async ({ page }) => {
  await page.route('**/api/config', async (route) => {
    await route.fulfill({ json: { collectionOpen: true, configured: true } });
  });
  let body: Record<string, unknown> | undefined;
  await page.route('**/api/recognitions', async (route) => {
    body = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 201, json: { id: 'synthetic-1', status: 'published', expiresAt: '2030-01-08T00:00:00.000Z' } });
  });
  await page.goto('/');
  await fillValidDraft(page);
  await page.getByRole('button', { name: 'Send recognition' }).click();
  await expect(page.getByRole('heading', { name: /Thank you for sharing Mother's Love/ })).toBeVisible();
  await expect(page.getByText('ready for the campaign display')).toBeVisible();
  expect(body?.submittedName).toBe('Maya R.');
  expect(body?.expressionIds).toEqual([2, 6, 8]);
  expect(typeof body?.requestKey).toBe('string');

  await page.getByRole('button', { name: 'Recognize Someone Else' }).click();
  await expect(page.getByLabel('Your name')).toHaveValue('');
  await expect(page.getByLabel('Who would you like to recognize?')).toHaveValue('');
  await expect(page.getByLabel('Share your appreciation')).toHaveValue('');
  await expect(page.getByText('0 selected')).toBeVisible();
});

test('shows a held receipt without promising display publication', async ({ page }) => {
  await openCollection(page);
  await page.route('**/api/recognitions', async (route) => {
    await route.fulfill({ status: 201, json: { id: 'synthetic-held', status: 'held', expiresAt: '2030-01-08T00:00:00.000Z' } });
  });
  await fillValidDraft(page);
  await page.getByRole('button', { name: 'Send recognition' }).click();
  await expect(page.getByText('Some messages are reviewed before appearing.')).toBeVisible();
  await expect(page.getByText('ready for the campaign display')).toHaveCount(0);
});

test('keeps the same draft and retries with the same key after an unconfirmed response', async ({ page }) => {
  await openCollection(page);
  let attempts = 0;
  const keys: unknown[] = [];
  await page.route('**/api/recognitions', async (route) => {
    attempts += 1;
    keys.push((route.request().postDataJSON() as Record<string, unknown>).requestKey);
    if (attempts === 1) {
      await route.abort('failed');
      return;
    }
    await route.fulfill({ status: 201, json: { id: 'synthetic-retry', status: 'published', expiresAt: '2030-01-08T00:00:00.000Z' } });
  });
  await fillValidDraft(page);
  await page.getByRole('button', { name: 'Send recognition' }).click();
  await expect(page.getByText('Your recognition is not confirmed yet.')).toBeVisible();
  await expect(page.getByLabel('Share your appreciation')).toHaveValue('Your kindness made a hard day feel lighter.');
  await page.getByRole('button', { name: 'Retry recognition' }).click();
  await expect(page.getByText('ready for the campaign display')).toBeVisible();
  expect(attempts).toBe(2);
  expect(keys[0]).toBe(keys[1]);
});

test('keeps collection unavailable without showing a fake success', async ({ page }) => {
  await page.route('**/api/config', async (route) => {
    await route.fulfill({ json: { collectionOpen: false, configured: true } });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Recognition sharing is paused' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send recognition' })).toHaveCount(0);
  await expect(page.getByText('ready for the campaign display')).toHaveCount(0);
});

test('public preview excludes the submitted name and is keyboard reachable', async ({ page }) => {
  await openCollection(page);
  await fillValidDraft(page);
  await page.getByRole('button', { name: 'Preview public message' }).click();
  const preview = page.getByRole('region', { name: 'This is what people may see' });
  await expect(preview).toContainText('THANK YOU, Michelle R.');
  await expect(preview).toContainText('Your kindness made a hard day feel lighter.');
  await expect(preview).not.toContainText('Maya R.');
  await expect(preview).toContainText("I'd love to hear more about your thoughts.");

  await page.keyboard.press('Escape');
  await expect(preview).toBeVisible();
  await page.getByRole('button', { name: 'Close public preview' }).focus();
  await expect(page.getByRole('button', { name: 'Close public preview' })).toBeFocused();
});

test('supports expression principle disclosure without changing selection', async ({ page }) => {
  await openCollection(page);
  const expression = page.getByRole('article').filter({ hasText: 'How Are You?' });
  await expression.getByRole('button', { name: 'Why this matters' }).click();
  await expect(expression).toContainText('The first phrase to peace');
  await expression.getByRole('button', { name: /How Are You/ }).click();
  await expect(expression.getByRole('button', { name: /How Are You/ })).toHaveAttribute('aria-pressed', 'true');
});

test('has no automated accessibility violations on the open form', async ({ page }) => {
  await openCollection(page);
  const results = await new AxeBuilder({ page: page as never }).analyze();
  expect(results.violations).toEqual([]);
});

test('keeps the privacy page within the 390px horizontal viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Share a recognition' })).toBeVisible();

  const bounds = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(bounds.documentWidth).toBeLessThanOrEqual(bounds.viewportWidth);
});

test('shows all nine expressions and everyday examples on phone and desktop', async ({ page }) => {
  const examples = [
    'Start with a friendly hello to a neighbor, a classmate, or someone serving your community.',
    'Thank someone for an everyday kindness, such as preparing a meal or helping you travel safely.',
    'Consider how your words affected the other person. Acknowledge your mistake and take the first step toward reconciliation.',
    'Respond gently when someone makes a mistake, and help them move forward without embarrassment.',
    'Make room for someone else when a queue or busy journey tests your patience.',
    'Give a different opinion your full attention before replying. Listening helps people feel respected.',
    'Encourage someone facing a difficult moment, and remind them that they have your support.',
    'Notice who could use practical help, then offer a manageable act of kindness.',
    "Recognize someone's effort or progress with a thoughtful compliment that brightens their day.",
  ];

  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/expressions');
    await expect(page.getByRole('heading', { name: 'Words that make room for peace' })).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(9);
    for (const example of examples) {
      await expect(page.getByText(example, { exact: true })).toBeVisible();
    }

    const bounds = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(bounds.documentWidth).toBeLessThanOrEqual(bounds.viewportWidth);
  }

  const officialExamplesLink = page.getByRole('link', { name: 'Read the official campaign examples' });
  await expect(officialExamplesLink).toHaveAttribute(
    'href',
    'https://heavenlymotherslove.org/en/about',
  );
  await expect(officialExamplesLink).toHaveAttribute('target', '_blank');
  await expect(page.getByRole('link', { name: 'Back to recognition sharing' })).toHaveAttribute('href', '/');
});

test('keeps the expressions guide reachable when collection sharing is closed', async ({ page }) => {
  await page.route('**/api/config', async (route) => {
    await route.fulfill({ json: { collectionOpen: false, configured: true } });
  });
  await page.goto('/');
  const guideLink = page.getByRole('link', { name: 'Explore the nine expressions and everyday examples' });
  await expect(guideLink).toBeVisible();
  await expect(guideLink).toHaveAttribute('href', '/expressions');
});

test('keeps open form disclosure selection behavior while showing the everyday example', async ({ page }) => {
  await openCollection(page);
  const expression = page.getByRole('article').filter({ hasText: 'How Are You?' });
  await expression.getByRole('button', { name: 'Why this matters' }).click();
  await expect(expression).toContainText('The first phrase to peace');
  await expect(expression).toContainText('Start with a friendly hello to a neighbor, a classmate, or someone serving your community.');
  await expression.getByRole('button', { name: /How Are You/ }).click();
  await expect(expression.getByRole('button', { name: /How Are You/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: 'Explore the nine expressions and everyday examples' })).toHaveAttribute('href', '/expressions');
});

test('has no automated accessibility violations on the expressions guide', async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/expressions');
    const results = await new AxeBuilder({ page: page as never }).analyze();
    expect(results.violations).toEqual([]);
  }
});
