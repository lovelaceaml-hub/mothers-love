import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { EXPRESSIONS, CAMPAIGN_TITLE, CAMPAIGN_TAGLINE } from '../../src/lib/catalog';

// Isolated browser fixtures. These records never reach the application server.
const serverTime = '2030-01-01T12:00:00.000Z';
const names = ['Avery', 'Morgan', 'Rowan', 'Jamie', 'Ellis', 'Sage', 'Quinn', 'Riley', 'Drew', 'Alex', 'Taylor', 'Jordan'];
const messages = [
  'Thank you for staying to help put everything away. Your thoughtfulness made the afternoon feel lighter for everyone.',
  'You took the time to listen when I was having a difficult day. I really appreciated your patience and understanding.',
  'You made room at the table and helped me feel welcome. That small kindness meant a great deal to me.',
  'Thank you for noticing that I needed a hand and offering to help before I even asked.',
  'Your gentle words helped us work through a misunderstanding. Thank you for taking the first step.',
  'Your encouragement gave me the confidence to keep trying. Thank you for noticing the effort, not just the result.',
];
function record(index: number) {
  return { id: `design-${index}`, recipient: names[index % names.length], message: messages[index % messages.length],
    expressionIds: [[2, 8], [6, 4], [1, 5], [8, 2], [3, 4], [7, 9]][index % 6],
    firstPublishedAt: `2030-01-01T11:${String(59 - index).padStart(2, '0')}:00.000Z`, expiresAt: '2030-01-08T11:59:00.000Z' };
}
const fixtures = Array.from({ length: 12 }, (_, i) => record(i));
type Fixture = ReturnType<typeof record>;

async function mock(page: Page, getItems: () => Fixture[] = () => fixtures, getStatus: () => number = () => 200) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/feed') {
      return route.fulfill({ status: getStatus(), json: { serverTime, items: getItems() } });
    }
    if (url.pathname === '/api/config') return route.fulfill({ json: { configured: false, collectionOpen: false } });
    if (url.pathname.startsWith('/api/reactions') && route.request().method() === 'GET') {
      const ids = url.searchParams.get('ids')?.split(',') ?? [];
      return route.fulfill({ json: { items: ids.map(id => ({ id, count: 3, liked: false })) } });
    }
    // All other APIs fail closed, including any accidental submission.
    return route.fulfill({ status: 503, json: { error: 'Isolated review. No production access.' } });
  });
  return errors;
}
async function ready(page: Page) {
  await page.goto('/');
  await expect(page.locator('[data-home-experience]')).toBeVisible();
  await expect(page.getByRole('article').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Like recognition for/ }).first()).toBeEnabled();
  await page.evaluate(async () => { await Promise.all(Array.from(document.images).map(img => img.decode().catch(() => undefined))); });
}
async function shot(page: Page, name: string, fullPage = true) {
  mkdirSync('home-review-evidence', { recursive: true });
  await page.screenshot({ path: `home-review-evidence/${name}.png`, fullPage, animations: 'disabled' });
}

for (const [width, height, label] of [[1440, 1000, 'desktop'], [768, 1024, 'tablet'], [390, 844, 'phone'], [320, 740, 'narrow-phone']] as const) {
  test(`Home composition, navigation and accessibility at ${label}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = await mock(page);
    await ready(page);
    await expect(page.getByRole('heading', { name: CAMPAIGN_TITLE, exact: true })).toBeVisible();
    await expect(page.getByText(CAMPAIGN_TAGLINE, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Share a recognition', exact: true }).first()).toHaveAttribute('href', '/recognize');
    await expect(page.getByRole('link', { name: 'Explore the nine expressions' })).toHaveAttribute('href', '/expressions');
    await expect(page.getByRole('link', { name: width <= 560 ? 'Sharing guide' : 'Read the sharing guide', exact: true })).toHaveAttribute('href', '/privacy');
    await expect(page.getByRole('link', { name: 'TV View' })).toHaveAttribute('href', '/display');
    await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveAttribute('href', '/admin/login');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(await page.locator('img').evaluateAll(images => images.every(img => (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
    const first = await page.getByRole('article').first().boundingBox();
    expect(first!.y).toBeLessThan(height * .68);
    const axe = await new AxeBuilder({ page: page as never }).analyze();
    expect(axe.violations).toEqual([]);
    expect(errors).toEqual([]);
    await shot(page, `home-${label}`);
    if (width === 390) await shot(page, 'home-phone-viewport', false);
  });
}

test('500 characters, all nine phrases, long Unicode name and markup are complete', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const message = '<script>alert("not executed")</script>\n' + 'Thank you for your kindness. '.repeat(20);
  const long = { ...record(0), recipient: 'Á長'.repeat(40), message: message.slice(0, 500), expressionIds: EXPRESSIONS.map(x => x.id) };
  const errors = await mock(page, () => [long]);
  await ready(page);
  const card = page.getByRole('article');
  await expect(card.locator('h3')).toHaveText(long.recipient);
  await expect(card.locator('p').nth(1)).toHaveText(long.message);
  await expect(card.getByRole('listitem')).toHaveCount(9);
  for (const expression of EXPRESSIONS) await expect(card).toContainText(expression.phrase);
  expect(await card.locator('p').nth(1).evaluate(el => ({ text: el.textContent, clamp: getComputedStyle(el).webkitLineClamp, height: el.scrollHeight <= el.clientHeight + 1 })))
    .toEqual({ text: long.message, clamp: 'none', height: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  expect(errors).toEqual([]);
  await shot(page, 'home-long-content');
});

test('loading, unavailable, retry and empty states preserve working controls', async ({ page }) => {
  let code = 503;
  let items: Fixture[] = fixtures;
  let release: (() => void) | undefined;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  await mock(page, () => items, () => code);
  await page.route('**/api/feed', async route => { await waiting; await route.fulfill({ status: code, json: { serverTime, items } }); });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Loading recognitions' })).toBeVisible();
  await shot(page, 'home-loading');
  release!();
  await expect(page.getByRole('heading', { name: 'Unable to load recognitions' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  await shot(page, 'home-unavailable');
  code = 200; items = [];
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'No recognitions yet' })).toBeVisible();
  await shot(page, 'home-empty');
});

test('polling preserves the reading anchor and focus; removed records never linger', async ({ page }) => {
  let items = [...fixtures];
  await page.clock.install();
  await mock(page, () => items);
  await ready(page);
  const viewport = page.getByRole('region', { name: 'Recent recognitions' });
  await viewport.evaluate(el => { el.scrollTop = 450; });
  await viewport.focus();
  await page.waitForTimeout(30);
  const anchor = await viewport.evaluate(el => {
    const top = el.getBoundingClientRect().top;
    const node = Array.from(el.querySelectorAll<HTMLElement>('[data-recognition-id]')).find(n => n.getBoundingClientRect().top >= top)!;
    return { id: node.dataset.recognitionId!, top: node.getBoundingClientRect().top - top };
  });
  items = [{ ...record(0), id: 'new-item', recipient: 'New synthetic recognition', firstPublishedAt: serverTime }, ...items];
  await page.clock.fastForward(10_010);
  await expect(page.locator('[data-recognition-id="new-item"]')).toHaveCount(1);
  const relativeTop = () => page.locator(`[data-recognition-id="${anchor.id}"]`).evaluate(el => el.getBoundingClientRect().top - el.closest('[role="region"]')!.getBoundingClientRect().top);
  expect(Math.abs(await relativeTop() - anchor.top)).toBeLessThan(2);
  await expect(viewport).toBeFocused();
  items = items.filter(item => item.id !== 'design-0');
  await page.clock.fastForward(10_010);
  await expect(page.locator('[data-recognition-id="design-0"]')).toHaveCount(0);
  expect(Math.abs(await relativeTop() - anchor.top)).toBeLessThan(2);
  await expect(viewport).toBeFocused();
});

test('keyboard access, independent circular motion, pause and reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mock(page);
  await ready(page);
  const shapeData = await page.locator('[class*="welcomeArt"] [class*="medallion"], [class*="decorativeBubble"]').evaluateAll(nodes => nodes.map(el => {
    const rect = el.getBoundingClientRect(); const css = getComputedStyle(el);
    return { round: Math.abs(rect.width - rect.height) < 1 && css.borderRadius === '50%', duration: css.animationDuration };
  }));
  expect(shapeData.length).toBe(5);
  expect(shapeData.every(x => x.round)).toBe(true);
  expect(new Set(shapeData.map(x => x.duration)).size).toBe(5);
  const moving = page.locator('[class*="heroMedallionOne"]');
  const before = await moving.evaluate(el => getComputedStyle(el).transform);
  const control = page.getByRole('link', { name: 'Share a recognition', exact: true }).first();
  const controlBox = await control.boundingBox();
  await page.waitForTimeout(700);
  expect(await moving.evaluate(el => getComputedStyle(el).transform)).not.toBe(before);
  expect(await control.boundingBox()).toEqual(controlBox);
  const pause = page.getByRole('button', { name: 'Pause animation' });
  await pause.click();
  await expect(page.getByRole('button', { name: 'Resume animation' })).toHaveAttribute('aria-pressed', 'true');
  const stopped = await moving.evaluate(el => getComputedStyle(el).transform);
  await page.waitForTimeout(250);
  expect(await moving.evaluate(el => getComputedStyle(el).transform)).toBe(stopped);
  // Focused skip link and region provide keyboard reading without animation.
  await page.getByRole('link', { name: 'Skip to recognitions' }).focus();
  await page.getByRole('link', { name: 'Skip to recognitions' }).press('Enter');
  const viewport = page.getByRole('region', { name: 'Recent recognitions' });
  await expect(viewport).toBeFocused();
  await viewport.press('End');
  await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('[data-home-experience]').evaluate(el => el.getAnimations({ subtree: true }).filter(x => x.playState === 'running').length)).toBe(0);
  await page.getByRole('button', { name: 'Resume animation' }).click();
  expect(await moving.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
});

test('unmodified routes contain no Home theme and have no unexpected browser errors', async ({ page }) => {
  const errors = await mock(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['/expressions', '/privacy', '/admin/login', '/display']) {
    await page.goto(route);
    await expect(page.locator('[data-home-experience]')).toHaveCount(0);
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--home-cream'))).toBe('');
    await shot(page, `unchanged-${route.slice(1).replaceAll('/', '-')}`);
  }
  expect(errors).toEqual([]);
});

// Compare decoded pixels after the same settled state. Two diagnostic runs
// isolated 11-15 edge pixels with channel deltas <= 3 on unchanged pages.
// Allow only tiny rasterization variance, never a layout or content difference.
test('protected routes match baseline within tiny rasterization tolerance', async ({ browser }) => {
  test.skip(!process.env.HOME_BASELINE_URL, 'Baseline server is provided by the dedicated review workflow.');
  const before = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const after = await browser.newPage({ baseURL: process.env.PLAYWRIGHT_BASE_URL, viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await before.clock.setFixedTime(new Date(serverTime));
  await after.clock.setFixedTime(new Date(serverTime));
  await mock(before); await mock(after);
  mkdirSync('home-review-evidence', { recursive: true });
  const checks = [];
  for (const route of ['/expressions', '/privacy', '/admin/login', '/display']) {
    await before.goto(process.env.HOME_BASELINE_URL! + route);
    await after.goto(route);
    for (const page of [before, after]) {
      if (route === '/recognize') {
        await expect(page.getByRole('heading', { name: 'Recognition sharing is paused' })).toBeVisible();
      }
      if (['/recognize', '/expressions', '/privacy'].includes(route)) {
        await expect(page.getByRole('button', { name: 'Like recognition for Avery', exact: true })).toBeEnabled();
      }
      await page.evaluate(async () => { await document.fonts.ready; });
      await page.waitForTimeout(500);
    }
    const name = route.slice(1).replaceAll('/', '-');
    const a = await before.screenshot({ path: `home-review-evidence/baseline-${name}.png`, animations: 'disabled' });
    const b = await after.screenshot({ path: `home-review-evidence/review-${name}.png`, animations: 'disabled' });
    const rawA = await sharp(a).ensureAlpha().raw().toBuffer();
    const rawB = await sharp(b).ensureAlpha().raw().toBuffer();
    expect(rawA.length).toBe(rawB.length);
    let differentPixels = 0;
    let maxChannelDelta = 0;
    for (let i = 0; i < rawA.length; i += 4) {
      if (rawA[i] !== rawB[i] || rawA[i + 1] !== rawB[i + 1] || rawA[i + 2] !== rawB[i + 2] || rawA[i + 3] !== rawB[i + 3]) differentPixels++;
      for (let c = 0; c < 4; c++) maxChannelDelta = Math.max(maxChannelDelta, Math.abs(rawA[i + c] - rawB[i + c]));
    }
    const pixels = rawA.length / 4;
    const withinRasterTolerance = differentPixels / pixels <= 0.00005 && maxChannelDelta <= 4;
    checks.push({ route, identical: rawA.equals(rawB), withinRasterTolerance, differentPixels, pixels, maxChannelDelta });
  }
  writeFileSync('home-review-evidence/protected-routes.json', JSON.stringify(checks, null, 2));
  expect(checks.every(x => x.withinRasterTolerance)).toBe(true);
  await before.close(); await after.close();
});
