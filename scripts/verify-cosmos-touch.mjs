import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const origin = process.env.COSMOS_ORIGIN || 'http://127.0.0.1:32861';
const output = process.env.COSMOS_TOUCH_REPORT || '/private/tmp/mothers-love-pearl-sequence/touch-report.json';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=metal'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
const page = await context.newPage();
let desktopContext;
const report = { origin, checks: [], errors: [], apiRequests: [] };
page.on('pageerror', error => report.errors.push(error.message));
await page.route('**/api/**', route => { report.apiRequests.push(route.request().url()); return route.abort(); });
try {
  await page.goto(origin + '/display/cosmos-prototype');
  const world = page.getByTestId('world-preview');
  await expect(world).toHaveAttribute('data-prototype-scenery-ready', 'true', { timeout: 60000 });
  await expect(world).toHaveAttribute('data-controls-visible', 'false', { timeout: 12000 });
  expect(await page.evaluate(() => matchMedia('(hover: none), (pointer: coarse)').matches)).toBe(true);
  expect(await page.locator('footer').evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  expect(await page.locator('footer').evaluate(el => getComputedStyle(el).pointerEvents)).toBe('auto');
  report.checks.push('Touch controls remain visible and interactive after the idle timer');
  const button = await page.getByRole('button', { name: 'Read recognitions', exact: true }).boundingBox();
  await page.touchscreen.tap(button.x + button.width / 2, button.y + button.height / 2);
  await expect(page.getByRole('dialog')).toContainText('Thank you for noticing I needed a hand');
  report.checks.push('A stationary first tap on the visible reading button opens the complete reader');
  await page.getByRole('dialog').getByRole('button', { name: /^Close / }).tap();
  await expect(page.getByRole('button', { name: 'Read recognitions', exact: true })).toBeFocused();
  report.checks.push('Closing the reader restores focus');
  await page.close();
  desktopContext = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
  const desktop = await desktopContext.newPage();
  desktop.on('pageerror', error => report.errors.push(error.message));
  await desktop.route('**/api/**', route => { report.apiRequests.push(route.request().url()); return route.abort(); });
  await desktop.goto(origin + '/display/cosmos-prototype');
  await expect(desktop.getByTestId('world-preview')).toHaveAttribute('data-prototype-scenery-ready', 'true', { timeout: 60000 });
  const desktopButton = await desktop.getByRole('button', { name: 'Read recognitions', exact: true }).boundingBox();
  await desktop.mouse.move(desktopButton.x + desktopButton.width / 2, desktopButton.y + desktopButton.height / 2);
  await expect(desktop.getByTestId('world-preview')).toHaveAttribute('data-controls-visible', 'false', { timeout: 12000 });
  expect(await desktop.locator('footer').evaluate(el => getComputedStyle(el).opacity)).toBe('0');
  expect(await desktop.locator('footer').evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none');
  await desktop.mouse.down(); await desktop.mouse.up();
  await expect(desktop.getByRole('dialog')).toHaveCount(0);
  report.checks.push('A stationary click cannot activate an invisible desktop control');
  await desktop.keyboard.press('Tab');
  await expect(desktop.getByTestId('world-preview')).toHaveAttribute('data-controls-visible', 'true');
  expect(await desktop.locator('footer').evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  report.checks.push('Keyboard activity reveals the desktop controls');
  expect(report.errors).toEqual([]);
  expect(report.apiRequests).toEqual([]);
} catch (error) {
  report.errors.push(String(error));
  process.exitCode = 1;
} finally {
  await desktopContext?.close();
  await context.close();
  await browser.close();
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
