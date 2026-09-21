import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

// A real-app sample-only visual check. No clocks, renderer or camera are replaced.
const origin = process.env.DESIGN_REVIEW_ORIGIN || 'http://127.0.0.1:32743';
const output = process.env.DESIGN_REVIEW_OUTPUT || '/private/tmp/mothers-love-design-study-01';
const mode = process.env.DESIGN_REVIEW_MODE || 'stills';
const args = process.env.DESIGN_REVIEW_SOFTWARE === '1'
  ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
  : ['--use-gl=angle', '--use-angle=metal'];
await mkdir(output, { recursive: true });
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const applicationPaths = execFileSync('git', ['ls-files', 'src/components/display/world', 'src/app/display/world-preview', 'public/world-prototype'], { encoding: 'utf8' }).trim().split('\n');
const sourceFiles = [];
for (const file of applicationPaths) sourceFiles.push({ file, sha256: createHash('sha256').update(await readFile(file)).digest('hex') });
const browser = await chromium.launch({ headless: true, args });
const report = { sourceSha, origin, mode, sourceFiles, browser: browser.version(), platform: process.platform, args, checks: [], errors: [], consoleMessages: [], failedRequests: [], apiRequests: [], cameraSamples: [], limitations: ['Design review only. P0 and physical device acceptance remain open.', 'All records are fictional. This is not a real-data test.'] };
const context = await browser.newContext({
  viewport: mode === 'tour' ? { width: 1440, height: 900 } : { width: 1920, height: 1080 },
  deviceScaleFactor: 1, reducedMotion: mode === 'tour' ? 'no-preference' : 'reduce',
  ...(mode === 'tour' ? { recordVideo: { dir: output, size: { width: 1440, height: 900 } } } : {}),
});
const page = await context.newPage();
page.on('pageerror', e => report.errors.push(e.message));
page.on('console', m => { if (['warning', 'error'].includes(m.type())) report.consoleMessages.push({ type: m.type(), text: m.text() }); });
page.on('requestfailed', r => report.failedRequests.push({ url: r.url(), failure: r.failure()?.errorText }));
await page.route('**/api/**', route => { report.apiRequests.push(route.request().url()); return route.abort('blockedbyclient'); });
page.setDefaultTimeout(10000);
const world = page.getByTestId('world-preview');
const attrs = () => world.evaluate(el => Object.fromEntries([...el.attributes].filter(a => a.name.startsWith('data-')).map(a => [a.name, a.value])));
async function open(art) {
  const start = performance.now();
  await page.goto(`${origin}/display/world-preview?source=sample&art=${art}`, { waitUntil: 'domcontentloaded' });
  await expect(world).toHaveAttribute('data-ready', 'true', { timeout: 60000 });
  await expect.poll(async () => Number(await world.getAttribute('data-frames'))).toBeGreaterThan(0);
  await expect(world).toHaveAttribute('data-source', 'sample');
  if (art === 'design') await expect(world).toHaveAttribute('data-prototype-heart-ready', 'true');
  report.checks.push({ test: `${art} rendered with explicit sample content`, passed: true, readyElapsedMs: Math.round(performance.now()-start), attributes: await attrs() });
}
async function shot(name) {
  await expect(world).toHaveAttribute('data-source', 'sample');
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
  console.log(JSON.stringify({ captured: name, attributes: await attrs() }));
}
async function pause() { const button=page.getByRole('button',{name:'Pause tour',exact:true}); if (await button.count()) await button.click(); }
const zones = [
  ['garden','Garden of Kindness'],['heart','Heart Sanctuary'],['expressions','Nine Expressions Grove'],
  ['welcome','Butterfly Gate'],['featured','Pearl Pavilion'],['calendar','Garden of Days'],
  ['peacemakers','Peace Globe'],['status','Love Observatory'],['orbit','Expression Cosmos'],
  ['milestone','Fountain of Kindness'],['live-feed','River of Recognitions'],['practice','Daily Practice Terrace'],['promise','Peace Promise'],
];
async function visit(id, name) {
  const frames=Number(await world.getAttribute('data-frames'));
  await page.getByRole('button',{name:'World map',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:new RegExp(name)}).click();
  await expect(world).toHaveAttribute('data-zone',id,{timeout:60000});
  await expect(world).toHaveAttribute('data-traveling','false',{timeout:60000});
  await expect.poll(async()=>Number(await world.getAttribute('data-frames'))).toBeGreaterThan(frames);
}
try {
  await open('design');
  if (mode === 'tour') {
    const started=performance.now();
    const sample=async label=>{report.cameraSamples.push({label,wallSeconds:Math.round((performance.now()-started)/100)/10,attributes:await attrs()});};
    await sample('Garden start');
    await page.waitForTimeout(8000);
    await sample('Garden motion');
    await page.getByRole('button',{name:'02 Sanctuary',exact:true}).click();
    await expect(world).toHaveAttribute('data-traveling','true');
    await page.waitForTimeout(5000);await sample('Travel to Sanctuary');
    await expect(world).toHaveAttribute('data-zone','heart',{timeout:60000});
    await expect(world).toHaveAttribute('data-traveling','false');
    await sample('Sanctuary arrived');await page.waitForTimeout(10000);
    await page.getByRole('button',{name:'03 Expressions',exact:true}).click();
    await expect(world).toHaveAttribute('data-traveling','true');
    await page.waitForTimeout(5000);await sample('Travel to Expressions');
    await expect(world).toHaveAttribute('data-zone','expressions',{timeout:60000});
    await expect(world).toHaveAttribute('data-traveling','false');
    await sample('Expressions arrived');await page.waitForTimeout(10000);
    await sample('Expressions motion');
    report.checks.push({test:'Continuous normal-motion Garden to Sanctuary to Expressions recording, selected with UI controls',passed:true,wallSeconds:Math.round((performance.now()-started)/1000)});
  } else {
    await pause();
    for (const [id,name] of zones) {
      if(id!=='garden') await visit(id,name);
      await shot(`design-${id}`);
      report.checks.push({test:`Resident destination ${name}`,passed:true,attributes:await attrs()});
    }
    await visit('garden','Garden of Kindness');
    await page.getByRole('button',{name:'Settings',exact:true}).click();
    await page.getByText('Rendering details',{exact:true}).click();
    report.renderingDetails=await page.getByRole('dialog').locator('dl').innerText();
    await page.getByRole('dialog').getByRole('button',{name:/^Close /}).click();
    for (const [style,label] of [['constellation','Pearl formation'],['ribbon','Silk unveiling'],['bloom','Petal bloom']]) {
      await page.getByRole('button',{name:label,exact:true}).click();
      await expect(world).toHaveAttribute('data-arrival','reading',{timeout:20000});
      await expect(world).toHaveAttribute('data-arrival-in-world','true');
      await pause();await shot(`arrival-${style}`);
      report.checks.push({test:`${label} reading in the world`,passed:true,attributes:await attrs()});
      await page.getByRole('button',{name:'Back to world',exact:true}).click();
      await expect(world).toHaveAttribute('data-arrival','idle');
      await expect(world).toHaveAttribute('data-arrival-in-world','false');
    }
    await page.setViewportSize({width:390,height:844});
    await visit('garden','Garden of Kindness');await shot('phone-garden');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    report.checks.push({test:'390 by 844 phone without horizontal page overflow',passed:!overflow});
    for(const [style,label] of [['ribbon','Silk unveiling'],['bloom','Petal bloom']]){
      await page.getByRole('button',{name:label,exact:true}).click();await expect(world).toHaveAttribute('data-arrival','reading');await pause();await shot(`phone-${style}`);
      await page.getByRole('button',{name:'Back to world',exact:true}).click();await expect(world).toHaveAttribute('data-arrival','idle');
    }
    await page.setViewportSize({width:1920,height:1080});
    for(const art of ['classic','cinematic']){
      await open(art);await pause();
      await expect(page.getByRole('complementary',{name:'Arrival design studies'})).toHaveCount(0);
      await shot(`${art}-garden`);
      await visit('heart','Heart Sanctuary');await shot(`${art}-heart`);
      report.checks.push({test:`${art} comparison excludes design controls`,passed:true});
    }
  }
} catch(error) {
  report.checks.push({test:'Design verification completed',passed:false,detail:String(error)});
  if(await world.getAttribute('data-source').catch(()=>null)==='sample') await shot(`${mode}-failure`).catch(()=>{});
} finally {
  report.checks.push({test:'No page errors, error console messages or API requests',passed:!report.errors.length&&!report.consoleMessages.some(m=>m.type==='error')&&!report.apiRequests.length});
  await context.close();
  if(mode==='tour') report.video=await page.video().path();
  await browser.close();
  await writeFile(path.join(output,`${mode}-report.json`),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({report:path.join(output,`${mode}-report.json`),checks:report.checks.length,failed:report.checks.filter(c=>!c.passed),video:report.video}));
}
if(report.checks.some(c=>!c.passed))process.exitCode=1;
