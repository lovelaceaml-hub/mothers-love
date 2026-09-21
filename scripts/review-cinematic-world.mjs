import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Only explicit fictional mode may enter screenshots or test artifacts.
const output = 'world-art-evidence';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [], checks = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && /THREE|WebGL|shader/i.test(m.text())) errors.push(m.text()); });
await page.route('**/api/**', route => route.abort('blockedbyclient'));
page.setDefaultTimeout(60000);
await page.goto('http://127.0.0.1:3000/display/world-preview?source=sample', { waitUntil: 'networkidle', timeout: 120000 });
const world = page.getByTestId('world-preview');
await world.waitFor();
await page.waitForFunction(() => document.querySelector('[data-testid="world-preview"]')?.getAttribute('data-ready') === 'true', undefined, { timeout: 60000 });
if (await world.getAttribute('data-source') !== 'sample') throw Error('Refusing to record non-sample content');
checks.push({ test: 'Sample mode and working 3D renderer', passed: true });
await page.screenshot({ path: `${output}/garden.png`, fullPage: true });
for (const [name, file] of [['Sanctuary', 'sanctuary'], ['Expressions', 'expressions']]) {
  const quick = page.getByRole('button', { name: new RegExp(name, 'i') }).first();
  if (!(await quick.count())) throw Error(`Missing ${name} navigation`);
  {
    await quick.click(); await page.waitForTimeout(1400);
    if (await world.getAttribute('data-zone') !== (file === 'sanctuary' ? 'heart' : 'expressions')) throw Error(`Wrong ${name} destination`);
    await page.screenshot({ path: `${output}/${file}.png`, fullPage: true });
    checks.push({ test: `${name} navigation`, passed: true });
  }
}
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(1200);
await page.screenshot({ path: `${output}/phone.png`, fullPage: true });
checks.push({ test: 'Phone document has no horizontal overflow', passed: await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth) });
await page.setViewportSize({ width: 1920, height: 1080 });
await page.goto('http://127.0.0.1:3000/display/world-preview?source=sample&art=classic', { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.querySelector('[data-testid="world-preview"]')?.getAttribute('data-ready') === 'true');
await page.screenshot({ path: `${output}/classic-comparison.png`, fullPage: true });
checks.push({ test: 'Classic comparison remains available', passed: true });
checks.push({ test: 'No browser or shader errors', passed: errors.length === 0 });
await writeFile(`${output}/report.json`, JSON.stringify({ checks, errors, limitations: ['Software browser capture only, no physical TV or long-run test.'] }, null, 2));
await browser.close();
if (checks.some(c => !c.passed)) process.exitCode = 1;
