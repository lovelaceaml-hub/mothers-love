import { expect, test } from '@playwright/test';
import { audioState, openDisplay } from './background-song-helpers';

// The campaign song behind the TV view when the browser allows sound.
test.use({ launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } });

test('plays softly on a loop, and the speaker button turns it off and on, remembered', async ({ page }) => {
  await openDisplay(page);
  await expect.poll(async () => (await audioState(page)).paused).toBe(false);
  expect(await audioState(page)).toEqual({ paused: false, loop: true, volume: 0.35 });
  const toggle = page.getByTestId('display-song-toggle');
  await expect(toggle).toHaveAttribute('aria-label', 'Music on');

  await toggle.click();
  await expect.poll(async () => (await audioState(page)).paused).toBe(true);
  await expect(toggle).toHaveAttribute('aria-label', 'Music off');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  await page.reload();
  await expect(page.locator('[data-display-phase="active"]')).toBeVisible();
  await expect(page.getByTestId('display-song-toggle')).toHaveAttribute('aria-label', 'Music off');
  expect((await audioState(page)).paused).toBe(true);

  await page.getByTestId('display-song-toggle').click();
  await expect.poll(async () => (await audioState(page)).paused).toBe(false);
});

// Automatic refreshes pause overnight (midnight to 7 am Pacific), so a test
// cannot count on a later poll; it opens the display already in quiet mode.
test('stays silent while the display is in quiet mode', async ({ page }) => {
  await openDisplay(page, { mode: () => 'quiet', expectPhase: 'quiet' });
  await page.waitForTimeout(1500);
  expect((await audioState(page)).paused).toBe(true);
  await expect(page.getByTestId('display-song-toggle')).toHaveAttribute('aria-label', 'Music on');
});

test('shows no button when the song file is missing', async ({ page }) => {
  await openDisplay(page, { song: false });
  await expect(page.getByTestId('display-song-toggle')).toHaveCount(0);
});
