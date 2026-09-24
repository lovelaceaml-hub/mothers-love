import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const repo = '/Users/anthony/Projects/mothers-love-worktrees/world-quality-continuation';
const output = '/private/tmp/mothers-love-plan24-dev-harness-baseline';
const require = createRequire(path.join(repo, 'package.json'));
const { chromium } = require('@playwright/test');
const { build } = require('esbuild');
await mkdir(output, { recursive: true });
await build({
  stdin: { contents: "export * as THREE from 'three'; export {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js'; export {createWorldScene} from './src/components/display/world/world-scene'; export {ZONES} from './src/components/display/world/world-data';", resolveDir: repo, sourcefile: 'baseline-entry.ts', loader: 'ts' },
  bundle: true, format: 'iife', globalName: 'WorldReview', target: 'es2022',
  outfile: path.join(output, 'world-review-runtime.js'),
});
await writeFile(path.join(output, 'scene-review.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Plan 24 no-data baseline</title><style>body{margin:0;background:#f6eee7}canvas{display:block;width:100vw;height:100vh}</style><canvas id="art"></canvas><script src="world-review-runtime.js"></script><script>
try {
  const {THREE:T,RoomEnvironment,createWorldScene,ZONES}=WorldReview;
  const start=performance.now(), world=createWorldScene();
  const renderer=new T.WebGLRenderer({canvas:document.getElementById('art'),antialias:true});
  renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight,false);
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.82;
  const pm=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pm.fromScene(room,.04);
  world.scene.environment=env.texture;world.scene.environmentIntensity=.55;room.dispose();pm.dispose();
  const camera=new T.PerspectiveCamera(43,innerWidth/innerHeight,.1,450),z=ZONES.find(z=>z.id==='garden');
  camera.position.fromArray(z.eye);camera.lookAt(new T.Vector3(...z.target));world.update(10,'garden');
  renderer.render(world.scene,camera);
  window.BASELINE={ready:renderer.info.render.calls>0,elapsedMs:performance.now()-start,art:!!world.scene.getObjectByName('Cinematic world art'),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures};
  window.disposeBaseline=()=>{world.dispose();env.dispose();renderer.dispose()};
}catch(e){window.BASELINE={ready:false,error:String(e)};console.error(e)}
</script></html>`);
const staticServer = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  const name = pathname === '/scene-review.html' ? 'scene-review.html' : pathname === '/world-review-runtime.js' ? 'world-review-runtime.js' : null;
  if (!name) { response.writeHead(404).end(); return; }
  response.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' : 'text/html');
  response.end(await readFile(path.join(output, name)));
});
await new Promise(resolve => staticServer.listen(0, '127.0.0.1', resolve));
const harnessOrigin = `http://127.0.0.1:${staticServer.address().port}`;
const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const browser = await chromium.launch({ headless: true, args });
const report = {
  sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(),
  applicationSourceSha: 'b324b81cabe947592f6723425c58f14307b58083',
  viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce', headless: true, args,
  browser: browser.version(), platform: process.platform, checks: [],
  limitations: ['Baseline diagnosis only; no runtime fix or historical cause established.', 'Headless macOS differs from historical headed Linux CI.', 'No-data harness intentionally omits React and recognitions.'],
};
try {
  for (const runtime of ['dev', 'harness']) for (const art of ['classic', 'cinematic']) {
    const context = await browser.newContext({ viewport: report.viewport, reducedMotion: report.reducedMotion });
    const page = await context.newPage();
    const errors = [], consoleMessages = [], failedRequests = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (['warning','error'].includes(m.type())) consoleMessages.push({ type: m.type(), text: m.text() }); });
    page.on('requestfailed', r => failedRequests.push({ url: r.url(), failure: r.failure()?.errorText }));
    await page.route('**/api/**', route => route.abort('blockedbyclient'));
    const url = (runtime === 'dev' ? 'http://127.0.0.1:32742/display/world-preview?source=sample' : `${harnessOrigin}/scene-review.html?source=none`) + (art === 'classic' ? '&art=classic' : '');
    const start = performance.now(), check = { runtime, art, url, passed: false };
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      if (runtime === 'dev') {
        await page.waitForFunction(() => {
          const e = document.querySelector('[data-testid="world-preview"]');
          return e?.getAttribute('data-source') === 'sample' && e?.getAttribute('data-ready') === 'true' && Number(e?.getAttribute('data-frames')) > 0;
        }, undefined, { timeout: 60000 });
        check.attributes = await page.getByTestId('world-preview').evaluate(e => Object.fromEntries([...e.attributes].filter(a => a.name.startsWith('data-')).map(a => [a.name,a.value])));
        if (check.attributes['data-source'] !== 'sample') throw Error('Refusing non-sample evidence');
      } else {
        await page.waitForFunction(() => window.BASELINE?.ready === true, undefined, { timeout: 60000 });
        check.scene = await page.evaluate(() => window.BASELINE);
        if (check.scene.art !== (art === 'cinematic')) throw Error('Wrong art path rendered');
      }
      check.readyElapsedMs = Math.round(performance.now() - start);
      await page.screenshot({ path: path.join(output, `${runtime}-${art}.png`), fullPage: true });
      check.passed = true;
    } catch (error) { check.error = String(error); }
    Object.assign(check, { errors, consoleMessages, failedRequests });
    report.checks.push(check);
    console.log(JSON.stringify(check));
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise(resolve => staticServer.close(resolve));
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ report: path.join(output, 'report.json') }));
}
if (report.checks.some(c => !c.passed)) process.exitCode = 1;
