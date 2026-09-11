import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const LIVE = 'https://mothers-love.vercel.app';
const OUT = path.resolve('mobile-recognition-evidence/real-promo-capture');

async function finishContext(context: BrowserContext, page: Page, name: string) {
  const video = page.video();
  await context.close();
  if (video) {
    try {
      await video.saveAs(path.join(OUT, `${name}.webm`));
    } catch {
      // Keep screenshots even if the runner cannot persist browser video.
    }
  }
}

async function scrollShowcase(page: Page, distance: number, durationMs = 1200) {
  await page.evaluate(async ({ distance, durationMs }) => {
    const start = window.scrollY;
    const startAt = performance.now();
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const t = Math.min(1, (now - startAt) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        window.scrollTo(0, start + distance * eased);
        if (t < 1) requestAnimationFrame(tick); else resolve();
      };
      requestAnimationFrame(tick);
    });
  }, { distance, durationMs });
}

test('record deployed Mother's Love app for promo', async ({ browser }) => {
  test.setTimeout(120_000);
  await mkdir(OUT, { recursive: true });

  // 1) Real mobile home/live feed and real tap into Share Recognition.
  const homeContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    recordVideo: { dir: OUT, size: { width: 780, height: 1688 } },
  });
  const home = await homeContext.newPage();
  await home.goto(`${LIVE}/`, { waitUntil: 'networkidle', timeout: 45_000 });
  await home.screenshot({ path: path.join(OUT, 'mobile-home-real.png'), fullPage: false });
  await home.waitForTimeout(1400);
  await scrollShowcase(home, 520, 1500);
  await home.waitForTimeout(1300);
  const share = home.getByRole('link', { name: /share a recognition/i }).first();
  await expect(share).toBeVisible({ timeout: 12_000 });
  await share.scrollIntoViewIfNeeded();
  await home.waitForTimeout(500);
  await share.click();
  await home.waitForURL(/\/recognize/, { timeout: 20_000 });
  await home.waitForTimeout(1500);
  await home.screenshot({ path: path.join(OUT, 'mobile-recognize-entry-real.png'), fullPage: false });
  await finishContext(homeContext, home, 'mobile-home-to-recognize-real');

  // 2) Real recognition form interaction. Never press Send.
  const formContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    recordVideo: { dir: OUT, size: { width: 780, height: 1688 } },
  });
  const form = await formContext.newPage();
  await form.goto(`${LIVE}/recognize`, { waitUntil: 'networkidle', timeout: 45_000 });
  await form.waitForTimeout(1200);

  const yourName = form.getByLabel('Your name');
  const recipient = form.getByLabel(/Who would you like to recognize/i);
  const message = form.getByLabel(/Share your appreciation/i);

  if (await yourName.isVisible().catch(() => false)) {
    await yourName.fill('Jordan');
    await form.waitForTimeout(350);
    await recipient.fill('Alex');
    await form.waitForTimeout(450);

    const thankYou = form.getByRole('button', { name: /thank you.*all thanks to you/i }).first();
    if (await thankYou.isVisible().catch(() => false)) {
      await thankYou.scrollIntoViewIfNeeded();
      await form.waitForTimeout(450);
      await thankYou.click();
      await form.waitForTimeout(600);
    }

    const amazing = form.getByRole('button', { name: /you.?re amazing.*doing great/i }).first();
    if (await amazing.isVisible().catch(() => false)) {
      await amazing.scrollIntoViewIfNeeded();
      await amazing.click();
      await form.waitForTimeout(500);
    }

    await message.scrollIntoViewIfNeeded();
    await message.fill('Thank you for noticing what needed to be done and helping with such a warm heart.');
    await form.waitForTimeout(700);
    await form.screenshot({ path: path.join(OUT, 'mobile-form-filled-real.png'), fullPage: false });

    const preview = form.getByRole('button', { name: /preview public message/i });
    if (await preview.isVisible().catch(() => false)) {
      await preview.scrollIntoViewIfNeeded();
      await form.waitForTimeout(450);
      await preview.click();
      await form.waitForTimeout(900);
      await form.screenshot({ path: path.join(OUT, 'mobile-public-preview-real.png'), fullPage: false });
      await form.waitForTimeout(1600);
    }
  } else {
    // If sharing is paused, preserve the real state rather than fabricating one.
    await form.screenshot({ path: path.join(OUT, 'mobile-sharing-paused-real.png'), fullPage: false });
  }
  await finishContext(formContext, form, 'mobile-form-preview-real');

  // 3) Real expressions page, showing the actual nine-expression gallery.
  const expressionsContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    recordVideo: { dir: OUT, size: { width: 780, height: 1688 } },
  });
  const expressions = await expressionsContext.newPage();
  await expressions.goto(`${LIVE}/expressions`, { waitUntil: 'networkidle', timeout: 45_000 });
  await expressions.screenshot({ path: path.join(OUT, 'mobile-expressions-real.png'), fullPage: false });
  await expressions.waitForTimeout(1000);
  for (let i = 0; i < 4; i++) {
    await scrollShowcase(expressions, 520, 900);
    await expressions.waitForTimeout(650);
  }
  await finishContext(expressionsContext, expressions, 'mobile-expressions-real');

  // 4) Real large TV display. This records whatever the deployed public display is actually presenting.
  const displayContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
  });
  const display = await displayContext.newPage();
  await display.goto(`${LIVE}/display`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await display.waitForTimeout(5000);
  await display.screenshot({ path: path.join(OUT, 'tv-display-real.png'), fullPage: false });
  await display.waitForTimeout(11_000);
  await display.screenshot({ path: path.join(OUT, 'tv-display-real-later.png'), fullPage: false });
  await finishContext(displayContext, display, 'tv-display-real');
});
