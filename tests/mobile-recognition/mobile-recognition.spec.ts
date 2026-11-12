import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';
import { EXPRESSIONS } from '../../src/lib/catalog';

const out = 'mobile-recognition-evidence';
const now = '2030-01-08T12:00:00.000Z';
const names = ['Avery', 'Morgan', 'Jordan', 'Taylor', 'Casey'];
const messages = [
  'Thank you for staying to help put everything away. Your thoughtfulness made the afternoon feel lighter for everyone.',
  'You took the time to listen when I was having a difficult day. I really appreciated your patience and understanding.',
  'You greeted me so warmly and made room for me to join. Thank you for making me feel welcome.',
  'Your encouraging words helped me try again. Thank you for believing in me.',
  'Thank you for helping when I needed a hand. Your kindness meant so much.',
];
const rows = Array.from({ length: 30 }, (_, i) => ({
  id: `mobile-synthetic-${i}`, recipient: names[i % 5], message: messages[i % 5],
  expressionIds: [[2,8], [6], [1,4], [7,9], [8,2]][i % 5],
  firstPublishedAt: new Date(Date.UTC(2030,0,8,11,59-i)).toISOString(),
  expiresAt: '2030-01-15T11:00:00.000Z',
}));
async function mock(page: Page) {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/feed') return route.fulfill({ json: { serverTime: now, items: rows } });
    if (url.pathname === '/api/config') return route.fulfill({ json: { configured: true, collectionOpen: true } });
    if (url.pathname === '/api/reactions' && route.request().method() === 'GET') {
      return route.fulfill({ json: { items: (url.searchParams.get('ids')?.split(',') ?? []).map((id,i) => ({ id, count: 3+i, liked: false })) } });
    }
    return route.fulfill({ status: 503, json: { error: 'Isolated browser review only.', code: 'unavailable' } });
  });
}
async function shot(page: Page, name: string, fullPage = false) {
  mkdirSync(out, { recursive: true });
  await page.evaluate(async () => { await Promise.all(Array.from(document.images).map(img => img.decode().catch(() => undefined))); });
  await page.screenshot({ path: `${out}/${name}.png`, fullPage, animations: 'disabled' });
}
async function fill(page: Page) {
  await page.getByLabel('Your name', { exact: true }).fill('Private synthetic sender');
  await page.getByLabel('Who would you like to recognize?').fill('Avery');
  await page.getByRole('button', { name: /^02 /, pressed: false }).click();
  await page.getByRole('button', { name: /^08 /, pressed: false }).click();
  await page.getByLabel('Share your appreciation').fill(messages[0]);
}
for (const [width,height] of [[390,844], [320,568], [430,932]]) {
  test(`phone shell is stationary and feed remains usable at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width,height }); await mock(page); await page.goto('/');
    await expect(page.locator('[data-recognition-id]')).toHaveCount(30);
    const bounds = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
    expect(bounds.width).toBe(width); expect(bounds.height).toBeLessThanOrEqual(height + 1);
    const action = page.getByRole('link', { name: 'Share a recognition', exact: true });
    await expect(action).toBeVisible();
    const before = await action.boundingBox(); expect(before!.height).toBeGreaterThanOrEqual(44);
    expect(before!.y + before!.height).toBeLessThan(height);
    await shot(page, `home-${width}`);
    const viewport = page.getByRole('region', { name: 'Recent recognitions', exact: true });
    const box = await viewport.boundingBox(); expect(box!.height).toBeGreaterThan(height * .32);
    await viewport.focus(); await viewport.press('End');
    await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    expect(await action.boundingBox()).toEqual(before);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    const axe = await new AxeBuilder({ page: page as never }).analyze(); expect(axe.violations).toEqual([]);
    await action.click(); await expect(page).toHaveURL(/\/recognize$/);
    await expect(page.getByLabel('Your name', { exact: true })).toBeVisible();
  });
}
test('phone expression motion is independent, circular, pausable and reduced-motion aware', async ({ page }) => {
  await page.setViewportSize({ width:390,height:844 }); await mock(page); await page.goto('/');
  const orbs = page.locator('[data-drift-orb]'); await expect(orbs).toHaveCount(9);
  const describe = () => orbs.evaluateAll(els => els.map(el => { const r=el.getBoundingClientRect(); const s=getComputedStyle(el);return { width:r.width,height:r.height,round:s.borderRadius,duration:s.animationDuration,transform:s.transform }; }));
  const a=await describe(); await page.waitForTimeout(1200); const b=await describe();
  expect(a.every(v=>Math.abs(v.width-v.height)<.1 && v.round==='50%')).toBe(true);
  expect(new Set(a.map(v=>v.duration)).size).toBe(9);
  expect(a.every((v,i)=>v.transform!==b[i].transform)).toBe(true);
  await page.getByRole('button',{name:'Pause animation'}).click(); const c=await describe();
  await page.waitForTimeout(500); expect(await describe()).toEqual(c);
  await page.emulateMedia({ reducedMotion:'reduce' }); await page.getByRole('button',{name:'Resume animation'}).click();
  expect(await orbs.evaluateAll(els=>els.every(el=>getComputedStyle(el).animationName==='none'))).toBe(true);
});
for (const width of [390,768,1440]) {
  test(`submission composition, complete catalog and accessibility at ${width}`,async({page})=>{
    await page.setViewportSize({width,height:width===1440?1000:844});await mock(page);await page.goto('/recognize');
    await expect(page.getByTestId('expression-card-1')).toBeVisible();await fill(page);
    for(const e of EXPRESSIONS){const card=page.getByTestId(`expression-card-${e.id}`);await expect(card).toContainText(e.phrase);await expect(card).toContainText(e.principle);await expect(card).toContainText(e.example!);}
    await expect(page.getByTestId('growing-bouquet')).toHaveAttribute('data-selected-count','2');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
    const boxes=await page.locator('[data-testid^="expression-card-"]').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().x));expect(new Set(boxes).size).toBe(1);
    const axe=await new AxeBuilder({page:page as never}).analyze();expect(axe.violations).toEqual([]);
    await page.evaluate(()=>window.scrollTo(0,0));await shot(page,`recognize-${width}`);await shot(page,`recognize-${width}-full`,true);
    await page.getByTestId('expression-card-2').scrollIntoViewIfNeeded();await shot(page,`expressions-${width}`);
    await page.getByRole('button',{name:'Preview public message'}).click();const dialog=page.getByRole('dialog');
    await expect(dialog).toBeVisible();await expect(dialog).toContainText('Avery');await expect(dialog).not.toContainText('Private synthetic sender');await expect(dialog).toContainText(messages[0]);await shot(page,`preview-${width}`);
    await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Preview public message'})).toBeFocused();
  });
}
test('submission prevents duplicate sends and malformed receipts remain unconfirmed',async({page})=>{
  await mock(page);await page.goto('/recognize');await fill(page);
  let calls=0;let release:(()=>void)|undefined;const gate=new Promise<void>(r=>{release=r;});const keys:string[]=[];
  await page.route('**/api/recognitions',async r=>{calls++;keys.push(r.request().postDataJSON().requestKey);await gate;await r.fulfill({json:{status:'published'}});});
  await page.locator('form').evaluate((el:HTMLFormElement)=>{el.requestSubmit();el.requestSubmit();});
  await expect(page.getByRole('button',{name:'Sending…'})).toBeDisabled();expect(calls).toBeLessThanOrEqual(1);
  await expect(page.getByLabel('Your name',{exact:true})).toBeDisabled();release!();
  await expect(page.getByRole('button',{name:'Retry recognition'})).toBeVisible();expect(calls).toBe(1);
  await expect(page.getByTestId('submission-receipt')).toHaveCount(0);await expect(page.getByLabel('Your name',{exact:true})).toHaveValue('Private synthetic sender');
  await page.unroute('**/api/recognitions');await page.route('**/api/recognitions',async r=>{keys.push(r.request().postDataJSON().requestKey);await r.fulfill({status:201,json:{id:'synthetic-held',status:'held',expiresAt:'2030-01-15T12:00:00.000Z'}});});
  await page.getByRole('button',{name:'Retry recognition'}).click();expect(keys[1]).toBe(keys[0]);
  await expect(page.getByTestId('submission-receipt')).toContainText('It is not on the home page or TV yet');await shot(page,'receipt-held');
});
test('motion walkthrough and published receipt with synthetic responses only',async({browser})=>{
  test.setTimeout(60000);mkdirSync(out,{recursive:true});
  const context=await browser.newContext({baseURL:process.env.PLAYWRIGHT_BASE_URL??'http://127.0.0.1:3100',viewport:{width:390,height:844},recordVideo:{dir:out,size:{width:390,height:844}}});
  const page=await context.newPage();await mock(page);await page.goto('/');await expect(page.locator('[data-recognition-id]').first()).toBeVisible();await page.waitForTimeout(6000);
  await page.getByRole('region',{name:'Recent recognitions',exact:true}).evaluate(el=>{el.scrollTop=175;});await page.waitForTimeout(1500);
  await page.getByRole('link',{name:'Share a recognition',exact:true}).click();await fill(page);await page.getByTestId('expression-card-2').scrollIntoViewIfNeeded();await page.waitForTimeout(1800);
  await page.getByRole('button',{name:'Preview public message'}).click();await page.waitForTimeout(1800);await page.keyboard.press('Escape');
  await page.route('**/api/recognitions',r=>r.fulfill({status:201,json:{id:'synthetic-published',status:'published',expiresAt:'2030-01-15T12:00:00.000Z'}}));
  await page.getByRole('button',{name:'Send recognition'}).click();await expect(page.getByTestId('submission-receipt')).toContainText('ready to appear');await shot(page,'receipt-published');await page.waitForTimeout(2000);await context.close();
});
test('phone dominant action overlaps and outranks the medallions with a periodic pulse, honoring reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mock(page);
  await page.goto('/');
  const title = page.getByRole('heading', { level: 1 });
  const action = page.getByRole('link', { name: 'Share a recognition', exact: true });
  const medallions = page.locator('[data-expression-drift]');
  const feedRegion = page.getByRole('region', { name: 'Recent recognitions', exact: true });
  await expect(action).toBeVisible();
  // Order: title, then the action, then the floating medallions, then the feed.
  const [titleBox, actionBox, medallionBox, feedBox] = await Promise.all([
    title.boundingBox(), action.boundingBox(), medallions.boundingBox(), feedRegion.boundingBox(),
  ]);
  expect(titleBox!.y).toBeLessThan(actionBox!.y);
  expect(actionBox!.y).toBeLessThan(medallionBox!.y);
  expect(medallionBox!.y).toBeLessThan(feedBox!.y);
  // The action overlaps the top of the medallion row rather than merely preceding it.
  expect(actionBox!.y + actionBox!.height).toBeGreaterThan(medallionBox!.y);
  expect(actionBox!.height).toBeGreaterThanOrEqual(58);
  const actionZ = await action.evaluate((el) => Number(getComputedStyle(el).zIndex));
  expect(actionZ).toBeGreaterThan(0);
  // CSS modules hash keyframe names (e.g. "HomeExperience-module__DPTuUG__ctaPulse"),
  // so check for the animation by substring rather than an exact match.
  const animationName = await action.evaluate((el) => getComputedStyle(el).animationName);
  expect(animationName).toContain('ctaPulse');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reducedName = await action.evaluate((el) => getComputedStyle(el).animationName);
  expect(reducedName).toBe('none');
  const axe = await new AxeBuilder({ page: page as never }).analyze();
  expect(axe.violations).toEqual([]);
});
test('phone recognition cards compact to at most 90% of the measured pre-polish height without truncating the message', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const compactMessage = 'Thank you for your kindness today.\nIt truly made a difference for me.\nI want you to know it was noticed.\nYour support means a great deal.';
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/feed') {
      return route.fulfill({ json: { serverTime: now, items: [{
        id: 'compact-synthetic-1', recipient: 'Avery', message: compactMessage,
        expressionIds: [2, 8], firstPublishedAt: '2030-01-08T11:59:00.000Z', expiresAt: '2030-01-15T11:00:00.000Z',
      }] } });
    }
    if (url.pathname === '/api/config') return route.fulfill({ json: { configured: true, collectionOpen: true } });
    if (url.pathname === '/api/reactions' && route.request().method() === 'GET') {
      return route.fulfill({ json: { items: [{ id: 'compact-synthetic-1', count: 4, liked: false }] } });
    }
    return route.fulfill({ status: 503, json: { error: 'Isolated browser review only.', code: 'unavailable' } });
  });
  await page.goto('/');
  const card = page.locator('[data-recognition-id="compact-synthetic-1"]');
  await expect(card).toBeVisible();
  await expect(card.locator('p').nth(1)).toHaveText(compactMessage);
  const height = (await card.boundingBox())!.height;
  // Both heights below were measured live (not reasoned) at 390x844 with this exact
  // fixture on 2026-09-10. The "before" figure came from temporarily swapping in the
  // pre-polish src/components/feed/HomeExperience.module.css from commit 81592a9 and
  // reading this same journey's failure output; the "after" figure is the current,
  // already-compacted card. That is a reduction of about 20.9%, so the 20% legibility
  // floor from the earlier correction was met without tightening the CSS further.
  const MEASURED_BEFORE_HEIGHT_PX = 210.6875;
  const MEASURED_AFTER_HEIGHT_PX = 166.75;
  // At most 90% of the measured pre-polish height, and at most the measured after
  // height plus 4px of tolerance, so a future regression is still caught.
  expect(height).toBeLessThanOrEqual(MEASURED_BEFORE_HEIGHT_PX * 0.9);
  expect(height).toBeLessThanOrEqual(MEASURED_AFTER_HEIGHT_PX + 4);
  const axe = await new AxeBuilder({ page: page as never }).analyze();
  expect(axe.violations).toEqual([]);
});
