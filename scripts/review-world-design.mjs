import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpus, loadavg } from 'node:os';
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
// A frame timing taken while the rest of the machine is busy says nothing about the world,
// so every run records the load it was taken at and every timing carries its own reading.
const load = () => loadavg().map(value => Math.round(value * 100) / 100);
const report = { sourceSha, origin, mode, sourceFiles, browser: browser.version(), platform: process.platform, args,
  machine: { cores: cpus().length, loadAverageAtStart: load() },
  renderingDetailsMeaning: 'The study turns renderer.info.autoReset off and resets once per presented frame, so Draw calls and Triangles sum every pass of that frame: the main pass, the sun shadow map on the frames that refresh it, the glow, protect and ray mask passes, the thirteen bloom quads, the ray blur and the composite. They are not a main pass figure.',
  checks: [], errors: [], consoleMessages: [], failedRequests: [], apiRequests: [], cameraSamples: [], limitations: ['Design review only. P0 and physical device acceptance remain open.', 'All records are fictional. This is not a real-data test.'] };
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
async function setQuality(value) {
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByLabel('Picture quality').selectOption(value);
  await page.getByRole('dialog').getByRole('button',{name:/^Close /}).click();
}
async function renderingDetails() {
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('dialog').locator('details').evaluate(node=>{node.open=true;});
  const text=await page.getByRole('dialog').locator('dl').innerText();
  await page.getByRole('dialog').getByRole('button',{name:/^Close /}).click();
  return text;
}
/** The two numbers out of one rendering details panel, so a report can be read at a glance. */
function renderingNumbers(text) {
  const read=label=>{const m=String(text).match(new RegExp(`${label}\\n([\\d,]+)`));return m?Number(m[1].replace(/,/g,'')):null;};
  return { calls: read('Draw calls'), triangles: read('Triangles'), meaning: 'every pass of one presented frame' };
}
function intervalStats(intervals) {
  const sorted=[...intervals].sort((a,b)=>a-b);
  const at=q=>Math.round(sorted[Math.min(sorted.length-1,Math.floor(q*sorted.length))]*100)/100;
  return {samples:sorted.length,medianMs:at(.5),p95Ms:at(.95),maxMs:at(1),
    fractionOver33_3:Math.round(sorted.filter(v=>v>33.3).length/Math.max(1,sorted.length)*1000)/1000};
}
async function measure(label,width,height,quality) {
  await page.setViewportSize({width,height});
  await setQuality(quality);
  await pause();
  await visit('garden','Garden of Kindness');
  const pausedGardenRenderingDetails=await renderingDetails();
  const resume=page.getByRole('button',{name:'Resume tour',exact:true});
  if(await resume.count()) await resume.click();
  await expect(world).toHaveAttribute('data-motion','tour');
  const before=await attrs();
  const loadBefore=load();
  const intervals=await page.evaluate(()=>new Promise(resolve=>{
    const samples=[];let previous=0;
    const step=now=>{if(previous)samples.push(now-previous);previous=now;if(samples.length<120)requestAnimationFrame(step);else resolve(samples);};requestAnimationFrame(step);
  }));
  const after=await attrs();
  const loadAfter=load();
  const movingRenderingDetails=await renderingDetails();
  const stats=intervalStats(intervals);
  const advanced=intervals.length===120&&Number(after['data-frames'])>Number(before['data-frames'])+10&&Number(after['data-elapsed'])>Number(before['data-elapsed']);
  // One minute load average above eight means other work on this machine, not this world,
  // decided the intervals. The number is recorded either way so a reader can tell.
  const polluted=Math.max(loadBefore[0],loadAfter[0])>8;
  report.measurements.push({label,viewport:{width,height},quality,...stats,
    loadAverage:{before:loadBefore,after:loadAfter},loadPolluted:polluted,
    pausedGardenRenderingDetails,movingRenderingDetails,
    pausedGarden:renderingNumbers(pausedGardenRenderingDetails),moving:renderingNumbers(movingRenderingDetails),
    frames:{before:Number(before['data-frames']),after:Number(after['data-frames'])},
    elapsed:{before:Number(before['data-elapsed']),after:Number(after['data-elapsed'])}});
  report.checks.push({test:`Real animation timing with advancing app frames and clock at ${label}`,passed:advanced,...stats,loadAverage1Min:loadAfter[0],loadPolluted:polluted});
}
try {
  await open('design');
  if (mode === 'quality') {
    await pause();
    await setQuality('high');
    report.resolutions=[];
    for(const [width,height,label] of [[1920,1080,'hd'],[3840,2160,'4k']]) {
      await page.setViewportSize({width,height});
      await expect.poll(()=>page.locator('canvas[role="img"]').evaluate(c=>[c.width,c.height].join('x'))).toBe(`${width}x${height}`);
      const resolution=await page.locator('canvas[role="img"]').evaluate(c=>({width:c.width,height:c.height,cssWidth:c.clientWidth,cssHeight:c.clientHeight,dpr:devicePixelRatio}));
      report.resolutions.push(resolution);await shot(`high-${label}-garden`);
      report.checks.push({test:`High tier actual ${width} by ${height} drawing buffer`,passed:true,resolution});
    }
    await setQuality('low');
    await expect.poll(()=>page.locator('canvas[role="img"]').evaluate(c=>c.width*c.height)).toBeLessThanOrEqual(1050000);
    report.checks.push({test:'Low tier retains bounded drawing buffer at a 4K viewport',passed:true});
    // Real browser frames during ordinary app motion. The app clock is never replaced.
    // With the study radiance pass the renderer's info is reset once per presented frame, so
    // its calls and triangles now sum every pass of that frame, the shadow pass included.
    await page.emulateMedia({reducedMotion:'no-preference'});
    report.measurements=[];
    for(const [label,width,height,quality] of [['1920x1080 High',1920,1080,'high'],['3840x2160 High',3840,2160,'high'],['1920x1080 Low',1920,1080,'low']]) {
      await measure(label,width,height,quality);
    }
    report.renderingDetails=report.measurements[0]?.pausedGardenRenderingDetails;
    report.loadPolluted=report.measurements.some(m=>m.loadPolluted);
  } else if (mode === 'tour') {
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
    report.renderingDetails=await renderingDetails();
    report.renderingNumbers=renderingNumbers(report.renderingDetails);
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
  report.machine.loadAverageAtEnd=load();
  await context.close();
  if(mode==='tour') report.video=await page.video().path();
  await browser.close();
  await writeFile(path.join(output,`${mode}-report.json`),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({report:path.join(output,`${mode}-report.json`),checks:report.checks.length,failed:report.checks.filter(c=>!c.passed),video:report.video,
    machine:report.machine,
    measurements:report.measurements?.map(m=>({label:m.label,medianMs:m.medianMs,p95Ms:m.p95Ms,maxMs:m.maxMs,fractionOver33_3:m.fractionOver33_3,load1Min:m.loadAverage.after[0],loadPolluted:m.loadPolluted,pausedGarden:m.pausedGarden,moving:m.moving}))}));
}
if(report.checks.some(c=>!c.passed))process.exitCode=1;
