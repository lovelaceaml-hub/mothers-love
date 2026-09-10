import { test, expect } from '@playwright/test';

// Synthetic browser responses only. The existing full suite retains its
// keyboard-return assertions; these cover pointer, keyboard and reopen paths.
for (const width of [390, 768, 1440]) {
  test(`public preview restores focus and preserves the draft at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/config') return route.fulfill({ json: { configured: true, collectionOpen: true } });
      if (path === '/api/feed') return route.fulfill({ json: { serverTime: new Date().toISOString(), items: [] } });
      return route.fulfill({ status: 503, json: { error: 'Synthetic review only.' } });
    });
    await page.goto('/recognize');
    const sender = page.getByLabel('Your name', { exact: true });
    const message = page.getByLabel('Share your appreciation');
    await sender.fill('Private synthetic sender');
    await page.getByLabel('Who would you like to recognize?').fill('Avery');
    await page.getByTestId('expression-card-2').getByRole('button').click();
    await message.fill('Thank you for making time to listen. Your kindness helped.');
    const trigger = page.getByRole('button', { name: 'Preview public message' });
    const dialog = page.getByRole('dialog');
    const close = page.getByRole('button', { name: 'Close public preview' });

    await trigger.focus();
    await trigger.press('Enter');
    await expect(dialog).toBeVisible();
    await expect(close).toBeFocused();
    await expect(dialog).not.toContainText('Private synthetic sender');
    // The native modal must prevent background controls from taking focus.
    await sender.evaluate(element => element.focus());
    await expect(close).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await trigger.click();
    await expect(dialog).toBeVisible();
    await close.click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();

    // Programmatic activation reproduces pointer browsers that do not focus
    // buttons on click. Return to the Preview button, not the prior input.
    await message.focus();
    await trigger.evaluate((element: HTMLButtonElement) => element.click());
    await expect(close).toBeFocused();
    await close.press('Enter');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(message).toHaveValue('Thank you for making time to listen. Your kindness helped.');
    await expect(sender).toHaveValue('Private synthetic sender');
    await expect(page.getByTestId('growing-bouquet')).toHaveAttribute('data-selected-count', '1');
  });
}
