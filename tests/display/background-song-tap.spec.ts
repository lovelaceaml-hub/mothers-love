import { expect, test } from '@playwright/test';
import { audioState, openDisplay } from './background-song-helpers';
import { parkedInCloud } from '../cloud-parked';

// The campaign song behind the TV view when the browser waits for a tap.
test.use({ launchOptions: { args: ['--autoplay-policy=user-gesture-required'] } });

test('asks for a tap, then the first tap anywhere starts the music', async ({ page }) => {
  parkedInCloud('the cloud browser played the song at once, ignoring the autoplay policy this journey sets.');
  await openDisplay(page);
  const toggle = page.getByTestId('display-song-toggle');
  await expect(toggle).toHaveAttribute('aria-label', 'Tap to play music');
  expect((await audioState(page)).paused).toBe(true);
  await page.mouse.click(960, 400);
  await expect.poll(async () => (await audioState(page)).paused).toBe(false);
  await expect(toggle).toHaveAttribute('aria-label', 'Music on');
});

test('a tap on the button itself starts the music rather than turning it off', async ({ page }) => {
  parkedInCloud('the cloud browser played the song at once, ignoring the autoplay policy this journey sets.');
  await openDisplay(page);
  const toggle = page.getByTestId('display-song-toggle');
  await expect(toggle).toHaveAttribute('aria-label', 'Tap to play music');
  await toggle.click();
  await expect.poll(async () => (await audioState(page)).paused).toBe(false);
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
});
