import { writeFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { syntheticSnapshot } from '../plan08/display-fixtures';

test('full circle messages pan automatically and the owner can pause all motion', async ({ page }) => {
  const snapshot = syntheticSnapshot({ count: 1, longMessage: true, settings: { motion: 'lively', playlist: [{ id: 'garden', enabled: true }] } });
  await page.route('**/api/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) }));
  await page.route('**/api/display/snapshot**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(snapshot) }));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/display');
  const message = page.locator('[data-message-complete="true"]').first();
  await expect(message).toHaveText(snapshot.recognitions[0].message);
  await expect(message).toHaveAttribute('data-scrolling', 'true');
  const metrics = await message.evaluate(node => ({ travel: node.style.getPropertyValue('--message-travel'), animation: getComputedStyle(node.firstElementChild!).animationName }));
  expect(parseFloat(metrics.travel)).toBeGreaterThan(0);
  expect(metrics.animation).toContain('gardenMessageRead');
  snapshot.settings.pauseRotation = true;
  await page.reload();
  await expect(page.getByTestId('display-app')).toHaveAttribute('data-paused', 'true');
  expect(await message.locator('span').evaluate(node => getComputedStyle(node).animationPlayState)).toBe('paused');
});

test('rich Garden motion remains bounded at both TV sizes and records rendering evidence', async ({ page }, testInfo) => {
  const snapshot = syntheticSnapshot({ count: 12, settings: { motion: 'lively', playlist: [{ id: 'garden', enabled: true }] } });
  await page.route('**/api/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) }));
  await page.route('**/api/display/snapshot**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(snapshot) }));
  const evidence = [];
  for (const size of [{ width: 1920, height: 1080 }, { width: 3840, height: 2160 }]) {
    await page.setViewportSize(size);
    await page.goto('/display');
    await expect(page.getByTestId('garden-card')).toHaveCount(12);
    await page.waitForTimeout(2_000); // Measure steady motion after the entrance finishes.
    const frames = await page.evaluate(() => new Promise<{ frames: number; maxGapMs: number; averageGapMs: number }>(resolve => {
      const gaps: number[] = []; let last = performance.now(); const start = last;
      function measure(now: number) { gaps.push(now - last); last = now; if (now - start < 1500) requestAnimationFrame(measure); else resolve({ frames: gaps.length, maxGapMs: Math.max(...gaps), averageGapMs: gaps.reduce((a,b) => a+b,0)/gaps.length }); }
      requestAnimationFrame(measure);
    }));
    const bounds = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
    expect(bounds.width).toBeLessThanOrEqual(size.width);
    expect(bounds.height).toBeLessThanOrEqual(size.height);
    expect(frames.frames).toBeGreaterThan(0); // Record measured rendering, not an inferred hardware frame guarantee.
    evidence.push({ size, ...frames, bounds });
    await page.screenshot({ path: testInfo.outputPath(`garden-${size.width}.png`) });
  }
  await writeFile(testInfo.outputPath('rendering-evidence.json'), JSON.stringify(evidence, null, 2));
  await testInfo.attach('synthetic-rendering-evidence', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

test('the actual Nine Expressions screen unfolds from a radial flower into readable cards', async ({ page }, testInfo) => {
  await page.clock.install();
  const snapshot = syntheticSnapshot({ count: 2, settings: { motion: 'lively', playlist: [{ id: 'expressions', enabled: true }] } });
  let first = true;
  await page.route('**/api/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) }));
  await page.route('**/api/display/snapshot**', route => { const body = { ...snapshot, sync: first ? 'reset' : 'delta' }; first = false; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }); });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/display');
  const flower = page.getByTestId('nine-radial-flower');
  await expect(flower).toBeVisible();
  await expect(page.locator('[data-story-role="radial-petal"]')).toHaveCount(9);
  await page.clock.runFor(2_000);
  await page.screenshot({ path: testInfo.outputPath('nine-opening.png') });
  await page.clock.runFor(7_000);
  await expect(page.getByTestId('nine-expressions')).toHaveAttribute('data-story-phase', 'settled');
  expect(await flower.evaluate(node => Number(getComputedStyle(node).opacity))).toBeLessThan(0.05);
  const cards = page.getByTestId('nine-expression-cards').locator(':scope > li');
  await expect(cards).toHaveCount(9);
  for (const card of await cards.all()) expect(await card.evaluate(node => Number(getComputedStyle(node).opacity))).toBeGreaterThan(0.95);
  await page.screenshot({ path: testInfo.outputPath('nine-cards.png') });
  for (const card of await page.getByTestId('flower-expression-card').all()) expect(await card.evaluate(node => { const box = node.getBoundingClientRect(); return Array.from(node.children).every(child => { const text = child.getBoundingClientRect(); return text.top >= box.top && text.bottom <= box.bottom; }); })).toBe(true);
});

for (const screen of ['shared-expression', 'impact'] as const) {
  test(`${screen} plays its approved reveal sequence`, async ({ page }, testInfo) => {
    await page.clock.install();
    const snapshot = syntheticSnapshot({ count: 4, settings: { motion: 'lively', playlist: [{ id: screen, enabled: true }] } });
    let first = true;
    await page.route('**/api/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) }));
    await page.route('**/api/display/snapshot**', route => { const body = { ...snapshot, sync: first ? 'reset' : 'delta' }; first = false; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }); });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/display');
    const scene = page.getByTestId(screen === 'impact' ? 'monthly-impact' : screen);
    await expect(scene).toHaveAttribute('data-story-phase', 'opening');
    if (screen === 'shared-expression') await expect(page.getByTestId('connected-recognition')).toHaveCount(4);
    else await expect(page.getByTestId('monthly-impact-total')).toContainText('12');
    await page.screenshot({ path: testInfo.outputPath(`${screen}-opening.png`) });
    await page.clock.runFor(11_000);
    await expect(scene).toHaveAttribute('data-story-phase', 'settled');
    if (screen === 'shared-expression') {
      await expect(page.getByTestId('heart-ribbon-strand')).toHaveCount(4);
      await expect(page.getByTestId('heart-phrase-reveal')).toContainText('How Are You?');
    } else await expect(page.getByTestId('monthly-impact-flow-ribbon')).toHaveCount(9);
    await page.screenshot({ path: testInfo.outputPath(`${screen}-settled.png`) });
  });
}

for (const screen of ['spotlight', 'daily-practice', 'one-kind-word', 'everyday-peace', 'peace-promise'] as const) {
  test(`${screen} shows the timed teaching journey`, async ({ page }, testInfo) => {
    await page.clock.install();
    const snapshot = syntheticSnapshot({ count: 2, settings: { motion: 'lively', playlist: [{ id: screen, enabled: true }] } });
    let first = true;
    await page.route('**/api/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) }));
    await page.route('**/api/display/snapshot**', route => { const body = { ...snapshot, sync: first ? 'reset' : 'delta' }; first = false; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }); });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/display');
    const scene = page.getByTestId(screen === 'spotlight' ? 'expression-spotlight' : screen);
    await expect(scene).toBeVisible();
    if (screen === 'everyday-peace') {
      await expect(scene.locator('[data-scene="home"]')).toBeVisible();
      await expect(scene.locator('[data-scene="school"]')).not.toBeVisible();
      await page.clock.runFor(8_500);
      await expect(scene.locator('[data-scene="school"]')).toBeVisible();
      await expect(scene.locator('[data-scene="home"]')).not.toBeVisible();
      await page.clock.runFor(8_000);
      await expect(scene.locator('[data-scene="work"]')).toBeVisible();
    } else {
      const start = await scene.getAttribute('data-phase');
      await page.clock.runFor(9_000);
      expect(await scene.getAttribute('data-phase')).not.toBe(start);
    }
    await page.waitForTimeout(1_000); // Allow the phase transition to settle before the visual capture.
    const bounds = await scene.evaluate(node => { const rect = node.getBoundingClientRect(); return { right: rect.right, bottom: rect.bottom, height: node.scrollHeight - node.clientHeight }; });
    expect(bounds.right).toBeLessThanOrEqual(1920);
    expect(bounds.bottom).toBeLessThanOrEqual(1080);
    // Decorative pseudo-elements intentionally extend beyond the clipped scene.
    await page.screenshot({ path: testInfo.outputPath(`${screen}-reading.png`) });
  });
}
