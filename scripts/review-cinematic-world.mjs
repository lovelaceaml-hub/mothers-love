import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

// Only explicit fictional mode may enter screenshots or test artifacts.
const output = 'world-art-evidence';
await mkdir(output, { recursive: true });
// A portable, no-data scene harness helps distinguish art errors from app startup errors.
await build({ stdin: { contents: `export * as THREE from 'three'; export {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js'; export {createWorldScene} from './src/components/display/world/world-scene'; export {ZONES} from './src/components/display/world/world-data';`, resolveDir: process.cwd(), sourcefile: 'world-review-entry.ts', loader: 'ts' }, bundle: true, format: 'iife', globalName: 'WorldReview', target: 'es2022', outfile: `${output}/world-review-runtime.js`, minify: false });
await writeFile(`${output}/scene-review.html`, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>World art review - synthetic scenery only</title><style>body{margin:0;background:#f6eee7}canvas{display:block;width:100vw;height:100vh}nav{position:fixed;bottom:18px;left:18px;right:18px;display:flex;gap:6px;flex-wrap:wrap}button{padding:8px 12px;border:1px solid #d5bca7;background:#fff9ebd9;border-radius:20px;color:#795c66;font:12px sans-serif}#error{position:fixed;top:30px;left:30px;right:30px;color:#833;font:16px monospace}</style><canvas id="art"></canvas><div id="error"></div><nav id="nav"></nav><script src="world-review-runtime.js"></script><script>
try { const {THREE:T,RoomEnvironment,createWorldScene,ZONES}=WorldReview; const w=createWorldScene(),r=new T.WebGLRenderer({canvas:document.getElementById('art'),antialias:true}),c=new T.PerspectiveCamera(43,1,.1,450); r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=.82;const pm=new T.PMREMGenerator(r),room=new RoomEnvironment(),env=pm.fromScene(room,.04);w.scene.environment=env.texture;w.scene.environmentIntensity=.55;room.dispose();pm.dispose();let id='garden';function draw(){r.setPixelRatio(Math.min(devicePixelRatio,1.3));r.setSize(innerWidth,innerHeight,false);c.aspect=innerWidth/innerHeight;c.fov=innerWidth<innerHeight?63:43;c.updateProjectionMatrix();const z=ZONES.find(z=>z.id===id);c.position.fromArray(z.eye);c.lookAt(new T.Vector3(...z.target));w.update(10,id);r.render(w.scene,c);}for(const z of ZONES){const b=document.createElement('button');b.textContent=z.name;b.onclick=()=>{id=z.id;draw()};document.getElementById('nav').append(b);}window.SCENE_REVIEW={visit:(v)=>{id=v;draw()},draw,inspect:()=>({art:!!w.scene.getObjectByName('Cinematic world art'),calls:r.info.render.calls,triangles:r.info.render.triangles,geometries:r.info.memory.geometries}),dispose:()=>{w.dispose();env.dispose();r.dispose()}};addEventListener('resize',draw);draw(); }catch(e){document.getElementById('error').textContent=String(e);console.error(e)}
</script></html>`);
const browser = await chromium.launch({ headless: false, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [], checks = [], consoleMessages = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') consoleMessages.push({type:m.type(),text:m.text()}); if (m.type() === 'error' && /THREE|WebGL|shader|Cinematic art/i.test(m.text())) errors.push(m.text()); });
await page.route('**/api/**', route => route.abort('blockedbyclient'));
page.setDefaultTimeout(60000);
try {
  await page.goto('http://localhost:3000/display/world-preview?source=sample', { waitUntil: 'networkidle', timeout: 120000 });
  const world = page.getByTestId('world-preview'); await world.waitFor();
  if (await world.getAttribute('data-source') !== 'sample') throw Error('Refusing to record non-sample content');
  await page.screenshot({ path: `${output}/startup.png`, fullPage: true });
  await page.waitForFunction(() => document.querySelector('[data-testid="world-preview"]')?.getAttribute('data-ready') === 'true', undefined, { timeout: 60000 });
  checks.push({ test: 'Sample mode and working 3D renderer', passed: true });
  await page.screenshot({ path: `${output}/garden.png`, fullPage: true });
  for (const [name, file] of [['Sanctuary', 'sanctuary'], ['Expressions', 'expressions']]) {
    const quick = page.getByRole('button', { name: new RegExp(name, 'i') }).first();
    if (!(await quick.count())) throw Error(`Missing ${name} navigation`);
    await quick.click(); await page.waitForTimeout(1400);
    if (await world.getAttribute('data-zone') !== (file === 'sanctuary' ? 'heart' : 'expressions')) throw Error(`Wrong ${name} destination`);
    await page.screenshot({ path: `${output}/${file}.png`, fullPage: true });
    checks.push({ test: `${name} navigation`, passed: true });
  }
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(1200);
  await page.screenshot({ path: `${output}/phone.png`, fullPage: true });
  checks.push({ test: 'Phone document has no horizontal overflow', passed: await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth) });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('http://localhost:3000/display/world-preview?source=sample&art=classic', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('[data-testid="world-preview"]')?.getAttribute('data-ready') === 'true');
  await page.screenshot({ path: `${output}/classic-comparison.png`, fullPage: true });
  checks.push({ test: 'Classic comparison remains available', passed: true });
} catch (error) {
  checks.push({test:'Browser review completed',passed:false,detail:String(error)});
  if (await page.locator('[data-testid="world-preview"][data-source="sample"]').count()) await page.screenshot({path:`${output}/failure.png`,fullPage:true}).catch(()=>{});
} finally {
  checks.push({test:'No browser or shader errors',passed:errors.length===0});
  await writeFile(`${output}/report.json`, JSON.stringify({checks,errors,consoleMessages,limitations:['Software browser capture only, no physical TV or long-run test.']},null,2));
  await browser.close();
}
if (checks.some(c => !c.passed)) process.exitCode = 1;
