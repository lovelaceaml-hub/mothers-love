import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function openCollection(page: Page) {
  await page.route('**/api/config', async (route) => {
    await route.fulfill({ json: { collectionOpen: true, configured: true } });
  });
  await page.goto('/recognize');
  await expect(page.getByRole('heading', { name: "THE WORDS OF MOTHER'S LOVE" })).toBeVisible();
}

test.describe('Plan 08 submission garden', () => {
  test('keeps nine catalog choices while growing a bouquet from distinct selections', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openCollection(page);

    await expect(page.getByRole('article')).toHaveCount(9);
    await expect(page.getByTestId('expression-scene')).toHaveCount(9);
    await expect(page.getByTestId('growing-bouquet')).toHaveAttribute('data-selected-count', '0');

    const first = page.getByRole('article').filter({ hasText: 'How Are You?' });
    const second = page.getByRole('article').filter({ hasText: "Thank you. It's all thanks to you. You've worked hard." });
    const ninth = page.getByRole('article').filter({ hasText: "You're amazing. You're doing great!" });

    await first.getByRole('button', { name: /^01 /, pressed: false }).click();
    await second.getByRole('button', { name: /^02 /, pressed: false }).click();
    await ninth.getByRole('button', { name: /^09 /, pressed: false }).click();

    await expect(first.getByRole('button', { name: /^01 /, pressed: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(second.getByRole('button', { name: /^02 /, pressed: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(ninth.getByRole('button', { name: /^09 /, pressed: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('growing-bouquet')).toHaveAttribute('data-selected-count', '3');
    await expect(page.getByText('3 selected')).toBeVisible();
    await expect(page.getByText('Bouquet growing')).toBeVisible();

    const selectedCardBackground = await first.evaluate((card) => getComputedStyle(card).backgroundImage);
    expect(selectedCardBackground).toContain('linear-gradient');
    // The approved look's gold (reference-board colors).
    expect(selectedCardBackground).toContain('rgb(255, 233, 164)');

    await first.getByRole('button', { name: /^01 /, pressed: true }).click();
    await expect(page.getByTestId('growing-bouquet')).toHaveAttribute('data-selected-count', '2');
    await expect(second.getByRole('button', { name: /^02 /, pressed: true })).toHaveAttribute('aria-pressed', 'true');
  });

  test('keeps receipt wording truthful for published and held statuses', async ({ page }) => {
    await openCollection(page);
    await page.route('**/api/recognitions', async (route) => {
      await route.fulfill({
        status: 201,
        json: { id: 'synthetic-plan08-published', status: 'published', expiresAt: '2030-01-08T00:00:00.000Z' },
      });
    });

    await page.getByLabel('Your name').fill('Maya R.');
    await page.getByLabel('Who would you like to recognize?').fill('Michelle R.');
    await page.getByRole('button', { name: /Thank you\. It's all thanks/ }).click();
    await page.getByLabel('Share your appreciation').fill('Your kindness made a hard day feel lighter.');
    await page.getByRole('button', { name: 'Send recognition' }).click();

    const receipt = page.getByTestId('submission-receipt');
    await expect(receipt).toContainText('ready to appear on the home page and TV');
    await expect(receipt).toContainText('thank-you seed is floating toward the recognition garden');

    await page.getByRole('button', { name: 'Recognize Someone Else' }).click();
    await page.unroute('**/api/recognitions');
    await page.route('**/api/recognitions', async (route) => {
      await route.fulfill({
        status: 201,
        json: { id: 'synthetic-plan08-held', status: 'held', expiresAt: '2030-01-08T00:00:00.000Z' },
      });
    });

    await page.getByLabel('Your name').fill('Maya R.');
    await page.getByLabel('Who would you like to recognize?').fill('Michelle R.');
    await page.getByRole('button', { name: /Thank you\. It's all thanks/ }).click();
    await page.getByLabel('Share your appreciation').fill('Your kindness made a hard day feel lighter.');
    await page.getByRole('button', { name: 'Send recognition' }).click();

    await expect(page.getByTestId('submission-receipt')).toContainText('It is not on the home page or TV yet');
    await expect(page.getByTestId('submission-receipt')).not.toContainText('ready to appear on the home page and TV');
    await expect(page.getByTestId('submission-receipt')).toContainText('thank-you seed is resting safely while it is reviewed');
  });

  test('turns off scene and bouquet animation under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openCollection(page);

    const animationNames = await page.locator('[data-testid="expression-scene"], [data-testid="growing-bouquet"]').evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).animationName),
    );

    expect(animationNames.every((name) => name === 'none')).toBe(true);
  });
});
