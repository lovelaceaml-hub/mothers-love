import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve('promo-commercial/out');
const videoDir = path.resolve('promo-commercial/.video');
await fs.mkdir(outDir, { recursive: true });
await fs.rm(videoDir, { recursive: true, force: true });
await fs.mkdir(videoDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 720, height: 1280 },
  recordVideo: { dir: videoDir, size: { width: 720, height: 1280 } },
});
const page = await context.newPage();
await page.goto('http://127.0.0.1:4173/promo-commercial/promo.html', { waitUntil: 'networkidle' });
const video = page.video();
await page.waitForTimeout(60500);
await context.close();
const recordedPath = await video.path();
await fs.copyFile(recordedPath, path.join(outDir, 'mothers-love-promo-silent.webm'));

const coverContext = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
const coverPage = await coverContext.newPage();
await coverPage.goto('http://127.0.0.1:4173/promo-commercial/promo.html?cover=1', { waitUntil: 'networkidle' });
await coverPage.waitForTimeout(900);
await coverPage.screenshot({ path: path.join(outDir, 'mothers-love-promo-cover.png'), fullPage: false });
await coverContext.close();
await browser.close();
console.log('Recorded silent commercial and promotional cover.');
