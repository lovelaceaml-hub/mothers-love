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
// Plan 26: the 3D Studio kit dresses the design study by default. DESIGN_REVIEW_KIT=off runs the
// same captures on `&kit=off`, the fully procedural study, for A/B and byte comparison.
const kitOff = process.env.DESIGN_REVIEW_KIT === 'off';
// An installed browser channel (for example `chrome`) when the pinned Playwright build is absent.
const channel = process.env.DESIGN_REVIEW_CHANNEL || undefined;
const args = process.env.DESIGN_REVIEW_SOFTWARE === '1'
  ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
  : ['--use-gl=angle', '--use-angle=metal'];
await mkdir(output, { recursive: true });
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const applicationPaths = execFileSync('git', ['ls-files', 'src/components/display/world', 'src/app/world', 'public/world-prototype', 'public/world-kit'], { encoding: 'utf8' }).trim().split('\n');
const sourceFiles = [];
for (const file of applicationPaths) sourceFiles.push({ file, sha256: createHash('sha256').update(await readFile(file)).digest('hex') });
const browser = await chromium.launch({ headless: true, args, ...(channel ? { channel } : {}) });
// A frame timing taken while the rest of the machine is busy says nothing about the world,
// so every run records the load it was taken at and every timing carries its own reading.
const load = () => loadavg().map(value => Math.round(value * 100) / 100);
const report = { sourceSha, origin, mode, kit: kitOff ? 'off' : 'on', channel: channel ?? 'playwright chromium', sourceFiles, browser: browser.version(), platform: process.platform, args,
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
page.on('console', m => {
  if (!['warning', 'error'].includes(m.type())) return;
  // The browser's own notice for a request the fault mode aborted is not a page problem.
  if (m.type() === 'error' && isDeliberate(m.location()?.url ?? '') && /Failed to load resource/.test(m.text())) return;
  report.consoleMessages.push({ type: m.type(), text: m.text() });
});
// Requests the fault mode fails on purpose are recorded apart, so every other failure still counts.
const deliberate = [];
const isDeliberate = url => deliberate.some(pattern => url.includes(pattern));
report.deliberateFailures = [];
page.on('requestfailed', r => (isDeliberate(r.url()) ? report.deliberateFailures : report.failedRequests).push({ url: r.url(), failure: r.failure()?.errorText }));
await page.route('**/api/**', route => { report.apiRequests.push(route.request().url()); return route.abort('blockedbyclient'); });
page.setDefaultTimeout(10000);
const world = page.getByTestId('world-preview');
const attrs = () => world.evaluate(el => Object.fromEntries([...el.attributes].filter(a => a.name.startsWith('data-')).map(a => [a.name, a.value])));
/**
 * The world's address since Plan 28 Section 5. The design look opens the TV page by default,
 * so the design study (its explorer, map and Settings) is `&view=explore`; classic and
 * cinematic keep exactly the query they always had.
 */
const study = (query = '') => `${origin}/world?source=sample&art=design&view=explore${query}`;
/**
 * Opens one art mode on sample data. The design study waits for its kit state as well: `ready`
 * by default, `off` under DESIGN_REVIEW_KIT=off, or whatever a fault run expects; classic and
 * cinematic never load the kit and must say `off`.
 */
async function open(art, { kit = art === 'design' && !kitOff ? 'ready' : 'off', label = art, query: extra = '' } = {}) {
  const start = performance.now();
  const query = (art === 'design' && kitOff ? '&kit=off' : '') + extra;
  await page.goto(art === 'design' ? study(query) : `${origin}/world?source=sample&art=${art}${query}`, { waitUntil: 'domcontentloaded' });
  await expect(world).toHaveAttribute('data-ready', 'true', { timeout: 60000 });
  const readyElapsedMs = Math.round(performance.now() - start);
  // The kit loads before the engine, so its state is published with the first report; allow
  // it ten seconds past data-ready and record how long it actually took.
  await expect(world).toHaveAttribute('data-kit', kit, { timeout: 10000 });
  const kitElapsedMs = Math.round(performance.now() - start);
  await expect.poll(async () => Number(await world.getAttribute('data-frames'))).toBeGreaterThan(0);
  await expect(world).toHaveAttribute('data-source', 'sample');
  // Every view starts on Automatic (Plan 28 Section 5).
  await expect(world).toHaveAttribute('data-quality', 'auto');
  if (art === 'design') await expect(world).toHaveAttribute('data-prototype-heart-ready', 'true');
  report.checks.push({ test: `${label} rendered with explicit sample content, kit ${kit}, quality auto`, passed: true, readyElapsedMs, kitElapsedMs,
    kitAfterReadyMs: kitElapsedMs - readyElapsedMs, attributes: await attrs() });
}
/**
 * The design study's stills and parity captures stay at High, the tier they were always taken
 * at, so they compare byte for byte with the captures from before Auto became the default.
 */
async function openStudyAtHigh(query = '') {
  await open('design', { query });
  await setQuality('high');
  await expect(world).toHaveAttribute('data-quality', 'high');
}
async function shot(name) {
  await expect(world).toHaveAttribute('data-source', 'sample');
  const bytes = await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
  console.log(JSON.stringify({ captured: name, attributes: await attrs() }));
  return bytes;
}
/** Byte equality first; when two captures differ, how many pixels and where, decoded in the page. */
async function compareShots(a, b) {
  if (Buffer.compare(a, b) === 0) return { identical: true, differingPixels: 0 };
  const detail = await page.evaluate(async ([left, right]) => {
    const load = src => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; });
    const [x, y] = await Promise.all([load(left), load(right)]);
    if (x.width !== y.width || x.height !== y.height) return { sizeMismatch: [x.width, x.height, y.width, y.height] };
    const read = image => { const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height; const context = canvas.getContext('2d'); context.drawImage(image, 0, 0); return context.getImageData(0, 0, image.width, image.height).data; };
    const p = read(x), q = read(y);
    let count = 0, box = null;
    for (let i = 0; i < p.length; i += 4) if (p[i] !== q[i] || p[i + 1] !== q[i + 1] || p[i + 2] !== q[i + 2]) {
      count++; const px = (i / 4) % x.width, py = Math.floor(i / 4 / x.width);
      box = box ? [Math.min(box[0], px), Math.min(box[1], py), Math.max(box[2], px), Math.max(box[3], py)] : [px, py, px, py];
    }
    return { differingPixels: count, box };
  }, [`data:image/png;base64,${a.toString('base64')}`, `data:image/png;base64,${b.toString('base64')}`]);
  return { identical: false, ...detail };
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
/** The rendering details out of one panel, so a report can be read at a glance. */
function renderingNumbers(text) {
  const read=label=>{const m=String(text).match(new RegExp(`${label}\\n([\\d,]+)`));return m?Number(m[1].replace(/,/g,'')):null;};
  const raw=label=>String(text).match(new RegExp(`${label}\\n([^\\n]+)`))?.[1]??null;
  return { calls: read('Draw calls'), triangles: read('Triangles'), textures: read('Textures'), geometries: read('Geometries'), kit: raw('Kit'), meaning: 'every pass of one presented frame' };
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
  if (mode === 'stills') await openStudyAtHigh();
  else if (mode !== 'kit-faults' && mode !== 'parity') await open('design');
  if (mode === 'parity') {
    // The pearl text parity check: the paused Garden at High with the radiance pass on and with
    // `&radiance=off`. The glow may change everything around the pearl, never its words, so
    // every pixel inside .8 of the focused pearl's projected radius (the outermost text pixel
    // sits at .81 of the face) must be identical.
    const garden = async (query, name) => {
      await openStudyAtHigh(query);
      await pause();
      await expect(world).toHaveAttribute('data-zone', 'garden');
      await expect(world).toHaveAttribute('data-traveling', 'false');
      const attributes = await attrs();
      return { bytes: await shot(name), attributes };
    };
    const on = await garden('', 'parity-radiance-on');
    const off = await garden('&radiance=off', 'parity-radiance-off');
    const numbers = value => String(value ?? '').split(',').map(Number);
    const [cameraX, cameraY, cameraZ] = numbers(on.attributes['data-camera-position']);
    const [pearlX, pearlY, pearlZ] = numbers(on.attributes['data-world-bubble-position']);
    const [ndcX, ndcY] = numbers(on.attributes['data-world-bubble-screen']);
    const radius = Number(on.attributes['data-world-bubble-radius']);
    const distance = Math.hypot(pearlX - cameraX, pearlY - cameraY, pearlZ - cameraZ);
    const { width, height } = page.viewportSize();
    // The world camera's vertical field of view is 43 degrees on a landscape screen.
    const pixels = radius / (distance * Math.tan((43 * Math.PI) / 360)) * (height / 2);
    const disc = { cx: (ndcX + 1) / 2 * width, cy: (1 - ndcY) / 2 * height, r: 0.8 * pixels };
    const sameCamera = on.attributes['data-camera-position'] === off.attributes['data-camera-position']
      && on.attributes['data-world-bubble-screen'] === off.attributes['data-world-bubble-screen'];
    const inside = await page.evaluate(async ([left, right, disc]) => {
      const load = src => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; });
      const [x, y] = await Promise.all([load(left), load(right)]);
      const read = image => { const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height; const context = canvas.getContext('2d'); context.drawImage(image, 0, 0); return context.getImageData(0, 0, image.width, image.height).data; };
      const p = read(x), q = read(y);
      let compared = 0, differing = 0, outside = 0;
      for (let i = 0; i < p.length; i += 4) {
        const px = (i / 4) % x.width, py = Math.floor(i / 4 / x.width);
        const same = p[i] === q[i] && p[i + 1] === q[i + 1] && p[i + 2] === q[i + 2];
        if ((px - disc.cx) ** 2 + (py - disc.cy) ** 2 <= disc.r ** 2) { compared++; if (!same) differing++; } else if (!same) outside++;
      }
      return { compared, differing, differingOutside: outside };
    }, [`data:image/png;base64,${on.bytes.toString('base64')}`, `data:image/png;base64,${off.bytes.toString('base64')}`, disc]);
    report.checks.push({ test: 'Pearl text parity: radiance on and off identical inside the focused pearl', passed: sameCamera && inside.compared > 10000 && inside.differing === 0,
      sameCamera, disc: { cx: Math.round(disc.cx), cy: Math.round(disc.cy), r: Math.round(disc.r) }, ...inside,
      note: 'differingOutside counts the glow, rays and protect pass around the pearl, which the radiance switch is meant to change' });
  } else if (mode === 'kit-faults') {
    // Plan 26 K0: the kit fails soft. Three paused Garden captures on the same run: the
    // procedural study (`kit=off`), the study with the Draco decoder refused (every asset
    // fails, so `data-kit="failed"`), and the study with one asset refused (`partial`, one
    // missing). While the district, neighbor and corridor builders are K0 stubs, both fault
    // captures must be byte identical to the procedural one.
    const pixels = process.env.DESIGN_REVIEW_FAULT_PIXELS !== 'off';
    const partialAsset = process.env.DESIGN_REVIEW_PARTIAL_ASSET || 'landmarks/pearl-arch.glb';
    // The study opens parked at the Garden, which is where every capture here is taken.
    const garden = async name => { await pause(); await expect(world).toHaveAttribute('data-zone', 'garden'); return shot(name); };
    // The procedural reference is always `&kit=off`, whatever DESIGN_REVIEW_KIT says.
    await page.goto(study('&kit=off'), { waitUntil: 'domcontentloaded' });
    await expect(world).toHaveAttribute('data-ready', 'true', { timeout: 60000 });
    await expect(world).toHaveAttribute('data-kit', 'off', { timeout: 10000 });
    await expect(world).toHaveAttribute('data-prototype-heart-ready', 'true');
    report.checks.push({ test: 'Procedural reference opened with kit=off', passed: true, attributes: await attrs() });
    const reference = await garden('kit-off-garden');
    const faultRun = async ({ pattern, expected, missing, name }) => {
      deliberate.push(pattern);
      const handler = route => route.abort('failed');
      await page.route(`**/${pattern}`, handler);
      const start = performance.now();
      await page.goto(study(), { waitUntil: 'domcontentloaded' });
      await expect(world).toHaveAttribute('data-ready', 'true', { timeout: 60000 });
      await expect(world).toHaveAttribute('data-kit', expected, { timeout: 10000 });
      const readyElapsedMs = Math.round(performance.now() - start);
      await expect(world).toHaveAttribute('data-prototype-heart-ready', 'true');
      const attributes = await attrs();
      const capture = await garden(name);
      await page.unroute(`**/${pattern}`, handler);
      const comparison = await compareShots(reference, capture);
      const missingOk = missing === undefined || attributes['data-kit-missing'] === String(missing);
      report.checks.push({ test: `Kit ${expected} when ${pattern} is refused: procedural world stands`, passed: missingOk && (!pixels || comparison.identical),
        aborted: pattern, readyElapsedMs, attributes, comparedWith: 'kit-off-garden', ...comparison, pixelAssertion: pixels });
    };
    await faultRun({ pattern: 'world-kit/draco/draco_decoder.wasm', expected: 'failed', name: 'kit-failed-garden' });
    await faultRun({ pattern: `world-kit/v1/${partialAsset}`, expected: 'partial', missing: 1, name: 'kit-partial-garden' });
    // And the healthy kit, for the record: every asset, within ten seconds of data-ready.
    await open('design', { kit: 'ready', label: 'design kit on' });
    const healthy = await garden('kit-on-garden');
    const healthyComparison = await compareShots(reference, healthy);
    report.checks.push({ test: 'Kit ready: stub builders draw the procedural world', passed: !pixels || healthyComparison.identical,
      comparedWith: 'kit-off-garden', ...healthyComparison, pixelAssertion: pixels });
  } else if (mode === 'quality') {
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
    for(const [label,width,height,quality] of [['1920x1080 High',1920,1080,'high'],['3840x2160 High',3840,2160,'high'],['1920x1080 Auto',1920,1080,'auto'],['1920x1080 Low',1920,1080,'low']]) {
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
    // Plan 28 Section 5: `/world` with only `?source=sample` is the design look's TV page on
    // Automatic, the kit dressed, no settings panel; and the old preview address redirects here
    // with its query intact.
    await page.goto(`${origin}/world?source=sample`, { waitUntil: 'domcontentloaded' });
    await expect(world).toHaveAttribute('data-ready', 'true', { timeout: 60000 });
    await expect(world).toHaveAttribute('data-kit', kitOff ? 'off' : 'ready', { timeout: 10000 });
    await expect(world).toHaveAttribute('data-tv-page', 'true');
    await expect(world).toHaveAttribute('data-design', 'true');
    await expect(world).toHaveAttribute('data-quality', 'auto');
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toHaveCount(0);
    await shot('tv-default-garden');
    report.checks.push({ test: '/world defaults to the design TV page on Automatic', passed: true, attributes: await attrs() });
    await page.goto(`${origin}/display/world-preview?source=sample&art=classic`, { waitUntil: 'domcontentloaded' });
    const moved = new URL(page.url());
    await expect(world).toHaveAttribute('data-ready', 'true', { timeout: 60000 });
    report.checks.push({ test: '/display/world-preview redirects to /world with its query', passed: moved.pathname === '/world' && moved.search === '?source=sample&art=classic', url: moved.pathname + moved.search });
  }
} catch(error) {
  report.checks.push({test:'Design verification completed',passed:false,detail:String(error)});
  if(await world.getAttribute('data-source').catch(()=>null)==='sample') await shot(`${mode}-failure`).catch(()=>{});
} finally {
  report.checks.push({test:'No page errors, error console messages or API requests',passed:!report.errors.length&&!report.consoleMessages.some(m=>m.type==='error')&&!report.apiRequests.length});
  report.checks.push({test:'No failed requests',passed:!report.failedRequests.length,failedRequests:report.failedRequests.length,deliberateFailures:report.deliberateFailures.length});
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
