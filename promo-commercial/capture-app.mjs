import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.MOTHERS_LOVE_URL || 'https://mothers-love.vercel.app';
const outDir = path.resolve('promo-commercial/captures');
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function openPage(viewport, pathname) {
  const context = await browser.newContext({ viewportSize: viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3500);
  return { context, page };
}

async function safeCapture(name, task) {
  try {
    await task();
    console.log(`Captured ${name}`);
  } catch (error) {
    console.warn(`Capture ${name} skipped:`, error?.message || error);
  }
}

await safeCapture('home-mobile', async () => {
  const { context, page } = await openPage({ width: 390, height: 844 }, '/');
  await page.evaluate(() => {
    const samples = [
      ['Jordan', 'Thank you for noticing when someone needed help. Your kindness changed the whole moment.'],
      ['Maya', 'Your encouragement helped me keep going. I appreciate the way you listened.'],
      ['Daniel', 'You made space for someone else and showed real consideration. Thank you.'],
    ];
    document.querySelectorAll('[data-recognition-id]').forEach((card, index) => {
      const sample = samples[index % samples.length];
      const heading = card.querySelector('h3');
      if (heading) heading.textContent = sample[0];
      const paragraphs = [...card.querySelectorAll('p')];
      const message = paragraphs.find((node) => {
        const text = (node.textContent || '').trim();
        return text.length > 24 && !/recognition for/i.test(text);
      });
      if (message) message.textContent = sample[1];
    });
  });
  await page.screenshot({ path: path.join(outDir, 'home-mobile.png'), fullPage: false });
  await context.close();
});

await safeCapture('recognize-top', async () => {
  const { context, page } = await openPage({ width: 390, height: 844 }, '/recognize');
  await page.screenshot({ path: path.join(outDir, 'recognize-top.png'), fullPage: false });
  await context.close();
});

await safeCapture('recognize-filled', async () => {
  const { context, page } = await openPage({ width: 390, height: 844 }, '/recognize');
  await page.locator('#submitter').waitFor({ state: 'visible' });
  await page.locator('#submitter').fill('Avery');
  await page.locator('#recipient').fill('Jordan');
  for (const id of [2, 4, 9]) {
    const button = page.locator(`[data-testid="expression-card-${id}"] button`);
    await button.scrollIntoViewIfNeeded();
    await button.click();
  }
  await page.locator('#message').fill('Your kindness made a hard day lighter. Thank you for noticing, listening, and helping.');
  await page.locator('#message').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, 'recognize-filled.png'), fullPage: false });

  const preview = page.getByRole('button', { name: /Preview public message/i });
  if (await preview.isEnabled()) {
    await preview.click();
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(outDir, 'recognize-preview.png'), fullPage: false });
  }
  await context.close();
});

await safeCapture('display', async () => {
  const { context, page } = await openPage({ width: 1600, height: 900 }, '/display');
  // Preserve the real composition and palette without reusing public recognition text in the ad.
  await page.addStyleTag({ content: 'body { filter: blur(10px) saturate(1.08); transform: scale(1.02); transform-origin:center; }' });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(outDir, 'display-blurred.png'), fullPage: false });
  await context.close();
});

await browser.close();
