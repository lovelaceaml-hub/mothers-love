// Plan 28 Section 5: live mode browser run against a deployment of /world. Attributes only: no
// screenshot, no video, and no recognition text is written anywhere. Record field NAMES are
// read to prove the projection carries no private field; their values are never kept.
// Usage: LIVE_ORIGIN=<deployment origin> LIVE_SHARE=<Vercel share link, or the origin when the
// deployment is public> LIVE_OUTPUT=<report.json> node scripts/review/world-live-check.mjs
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const origin = process.env.LIVE_ORIGIN;
const share = process.env.LIVE_SHARE; // a temporary Vercel share link, never written out
const output = process.env.LIVE_OUTPUT;
const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--use-gl=angle', '--use-angle=metal'] });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const report = { origin, when: new Date().toISOString(), checks: [], apiPaths: new Set(), pageErrors: 0, consoleErrors: 0, failedRequests: 0, recordFieldNames: new Set(), maxRecords: 0 };
const allowedFields = new Set(['id', 'recipient', 'message', 'expressionIds', 'createdAt', 'firstPublishedAt', 'expiresAt', 'version', 'status', 'featured']);
page.on('pageerror', () => report.pageErrors++);
page.on('console', m => { if (m.type() === 'error') report.consoleErrors++; });
// A request the next page.goto cuts off (net::ERR_ABORTED) is navigation, not a failure of the
// world; it is listed apart by path so a reader can tell, and every other failure still counts.
report.abortedByNavigation = [];
page.on('requestfailed', r => {
  if (r.url().includes('_vercel')) return;
  const path = new URL(r.url()).pathname, failure = r.failure()?.errorText ?? '';
  if (failure === 'net::ERR_ABORTED') report.abortedByNavigation.push(path);
  else { report.failedRequests++; (report.failedList ??= []).push({ path, failure }); }
});
page.on('request', r => { const u = new URL(r.url()); if (u.pathname.startsWith('/api/')) report.apiPaths.add(u.pathname); });
page.on('response', async r => {
  const u = new URL(r.url());
  if (u.pathname !== '/api/display/color-polish' || !r.ok()) return;
  try {
    const body = await r.json();
    report.maxRecords = Math.max(report.maxRecords, body.recognitions?.length ?? 0);
    for (const record of body.recognitions ?? []) for (const key of Object.keys(record)) report.recordFieldNames.add(key);
  } catch { /* a body that is not JSON is the app's problem, counted by its own checks */ }
});
const world = page.getByTestId('world-preview');
const attrs = () => world.evaluate(el => Object.fromEntries([...el.attributes].filter(a => a.name.startsWith('data-') && !a.name.startsWith('data-camera') && !a.name.startsWith('data-world-bubble-p') && !a.name.startsWith('data-world-bubble-s')).map(a => [a.name, a.value])));
const check = async (test, run) => {
  try { const detail = await run(); report.checks.push({ test, passed: true, ...(detail ?? {}) }); }
  catch (error) { report.checks.push({ test, passed: false, detail: String(error).slice(0, 300) }); }
};
try {
  await page.goto(share, { waitUntil: 'domcontentloaded' });
  await check('/world opens the design TV page on live recognitions, on Automatic', async () => {
    await page.goto(`${origin}/world`, { waitUntil: 'domcontentloaded' });
    await expect(world).toHaveAttribute('data-ready', 'true', { timeout: 60000 });
    await expect(world).toHaveAttribute('data-source', 'live');
    await expect(world).toHaveAttribute('data-design', 'true');
    await expect(world).toHaveAttribute('data-tv-page', 'true');
    await expect(world).toHaveAttribute('data-quality', 'auto');
    await expect(world).not.toHaveAttribute('data-design-review', /.*/);
    await expect(world).toHaveAttribute('data-kit', 'ready', { timeout: 20000 });
    await expect(world).toHaveAttribute('data-feed-phase', /^(live|quiet|neutral|disabled)$/, { timeout: 30000 });
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toHaveCount(0);
    return { attributes: await attrs() };
  });
  const phase = await world.getAttribute('data-feed-phase');
  if (phase === 'live') {
    await check('Live pearls appear in the world and the ticker runs', async () => {
      await expect.poll(async () => Number(await world.getAttribute('data-world-bubbles')), { timeout: 30000 }).toBeGreaterThan(0);
      await expect(page.locator('section[aria-label="Live recognitions"]')).toHaveCount(1);
      await expect(page.getByText('Fictional sample')).toHaveCount(0);
      return { bubbles: Number(await world.getAttribute('data-world-bubbles')) };
    });
    await check('A quiet state from the endpoint clears every pearl and the ticker at the next poll', async () => {
      await page.route('**/api/display/color-polish*', async route => {
        const response = await route.fetch();
        const body = await response.json();
        body.settings = { ...body.settings, mode: 'quiet' };
        body.recognitions = [];
        body.arrivals = [];
        await route.fulfill({ response, json: body });
      });
      await expect(world).toHaveAttribute('data-feed-phase', 'quiet', { timeout: 20000 });
      await expect(world).toHaveAttribute('data-world-bubbles', '0');
      await expect(page.locator('section[aria-label="Live recognitions"]')).toHaveCount(0);
      await expect(page.getByRole('status')).toContainText('A quiet moment.');
      await page.unroute('**/api/display/color-polish*');
      return { attributes: await attrs() };
    });
  } else report.checks.push({ test: `Live pearls: skipped, production display mode is ${phase}`, passed: true });
  await check('?view=explore keeps Settings with Automatic, High and Low, starting on Automatic', async () => {
    await page.goto(`${origin}/world?view=explore`, { waitUntil: 'domcontentloaded' });
    await expect(world).toHaveAttribute('data-ready', 'true', { timeout: 60000 });
    await expect(world).toHaveAttribute('data-source', 'live');
    await expect(world).not.toHaveAttribute('data-tv-page', /.*/);
    await expect(world).toHaveAttribute('data-quality', 'auto');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const options = await page.getByLabel('Picture quality').locator('option').allTextContents();
    await page.getByLabel('Picture quality').selectOption('high');
    await expect(world).toHaveAttribute('data-quality', 'high');
    await page.getByLabel('Picture quality').selectOption('low');
    await expect(world).toHaveAttribute('data-quality', 'low');
    await page.getByRole('dialog').getByRole('button', { name: /^Close / }).click();
    await expect(page.getByRole('complementary', { name: 'Arrival design studies' })).toHaveCount(0);
    return { options };
  });
  for (const art of ['classic', 'cinematic']) await check(`?art=${art} stays an explicit fallback on live content`, async () => {
    await page.goto(`${origin}/world?art=${art}`, { waitUntil: 'domcontentloaded' });
    await expect(world).toHaveAttribute('data-ready', 'true', { timeout: 60000 });
    await expect(world).toHaveAttribute('data-source', 'live');
    await expect(world).not.toHaveAttribute('data-design', /.*/);
    await expect(world).toHaveAttribute('data-kit', 'off');
    return {};
  });
  await check('/display/world-preview redirects to /world with its query', async () => {
    await page.goto(`${origin}/display/world-preview?art=classic`, { waitUntil: 'domcontentloaded' });
    const url = new URL(page.url());
    if (url.pathname !== '/world' || url.search !== '?art=classic') throw new Error(`landed on ${url.pathname}${url.search}`);
    return { landed: url.pathname + url.search };
  });
} finally {
  const fields = [...report.recordFieldNames].sort();
  report.checks.push({ test: 'The world called only the public TV projection endpoint', passed: [...report.apiPaths].every(p => p === '/api/display/color-polish'), apiPaths: [...report.apiPaths] });
  report.checks.push({ test: 'Every record field is on the public allowlist (field names only)', passed: fields.every(f => allowedFields.has(f)), fields });
  report.checks.push({ test: 'At most 100 records in any response', passed: report.maxRecords <= 100, maxRecords: report.maxRecords });
  report.checks.push({ test: 'No page errors, console errors or failed requests', passed: !report.pageErrors && !report.consoleErrors && !report.failedRequests, pageErrors: report.pageErrors, consoleErrors: report.consoleErrors, failedRequests: report.failedRequests });
  await browser.close();
  const out = { ...report, apiPaths: [...report.apiPaths], recordFieldNames: fields };
  await writeFile(output, JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify({ checks: out.checks.map(c => ({ test: c.test, passed: c.passed, ...(c.passed ? {} : { detail: c.detail }) })) }, null, 1));
  if (out.checks.some(c => !c.passed)) process.exitCode = 1;
}
