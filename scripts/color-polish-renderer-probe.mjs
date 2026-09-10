import { chromium } from '@playwright/test';
import { buildSync } from 'esbuild';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import QRCode from 'qrcode';
import assert from 'node:assert/strict';

// Controller-owned synthetic probe. It never requests campaign records.
const source = resolve(process.argv[2] || resolve(import.meta.dirname, '..'));
const output = resolve(process.argv[3] || '/private/tmp/ml-color-polish-renderer-probe');
await mkdir(output, { recursive: true });
const compiled = buildSync({ entryPoints: [resolve(source, 'src/components/display/color-polish/sample.ts')], bundle: true, platform: 'node', format: 'cjs', write: false, tsconfig: resolve(source, 'tsconfig.json') });
const moduleFile = resolve(output, 'sample.cjs');
await writeFile(moduleFile, compiled.outputFiles[0].contents);
const { buildColorPolishSampleSnapshot } = createRequire(import.meta.url)(moduleFile);
const snapshot = buildColorPolishSampleSnapshot();
const originalFixture = JSON.parse(await readFile(resolve(source, 'docs/design/color-polish-v6/fixtures.json'), 'utf8'));
const reactionCounts = Object.fromEntries(originalFixture.records.map((record, index) => [snapshot.recognitions[index]?.id, record.likes]));
const qr = await QRCode.toDataURL('https://mothers-love.vercel.app/recognize', { width: 180, margin: 1, color: { dark: '#303342', light: '#fffdf6' } });
const browser = await chromium.launch({ headless: true });
const issues = [];
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', error => issues.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') issues.push(message.text()); });
  await page.addInitScript(() => {
    let seed = 7301;
    Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    window.requestAnimationFrame = () => 0;
  });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/probe') return route.fulfill({ contentType: 'text/html', body: '<html><body style="margin:0"><iframe title="Probe" sandbox="allow-scripts" referrerpolicy="no-referrer" src="/color-polish/renderer.html" style="width:100vw;height:100vh;border:0"></iframe></body></html>' });
    if (!url.pathname.startsWith('/color-polish/') || url.pathname.includes('..')) return route.abort();
    const file = resolve(source, 'public', '.' + url.pathname);
    const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : file.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
    await route.fulfill({ contentType: type, body: await readFile(file) });
  });
  await page.goto('http://127.0.0.1:3106/probe');
  await page.evaluate(async ({ snapshot, qr, reactionCounts }) => {
    const frame = document.querySelector('iframe');
    const channel = new MessageChannel();
    const nonce = crypto.randomUUID();
    await new Promise(resolve => {
      channel.port1.onmessage = event => { if (event.data.type === 'color-polish:ready') resolve(); };
      channel.port1.start();
      frame.contentWindow.postMessage({ version: 'color-polish-v6', type: 'color-polish:bootstrap', nonce, sequence: 0 }, '*', [channel.port2]);
    });
    window.probePort = channel.port1;
    window.probeNonce = nonce;
    channel.port1.postMessage({ version: 'color-polish-v6', type: 'color-polish:update', nonce, sequence: 1, snapshot, control: { nowMs: Date.parse(snapshot.serverTime), status: 'ready', source: 'sample', playing: true, scene: 'welcome', reactionCounts, qrDataUrl: qr, submissionUrl: snapshot.submissionUrl } });
  }, { snapshot, qr, reactionCounts });
  const frame = page.frames().find(frame => frame.url().endsWith('/color-polish/renderer.html'));
  await frame.waitForFunction(() => window.colorPolishRuntime?.getState().mode === 'normal');
  await frame.evaluate(() => { window.colorPolishRuntime.step(14000); document.getAnimations().forEach(animation => { animation.pause(); animation.currentTime = 14000; }); });
  await frame.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode().catch(() => {}))); });
  await page.screenshot({ path: resolve(output, 'welcome.png') });
  const states = [await frame.evaluate(() => window.colorPolishRuntime.getState())];
  const scenes = [['garden', 2], ['featured', 4], ['calendar', 5], ['peacemakers', 8], ['status', 6], ['expressions', 7], ['peace-in-practice', 9], ['orbit', 10], ['milestone', 11]];
  for (let index = 0; index < scenes.length; index++) {
    const [scene, id] = scenes[index];
    await page.evaluate(({ snapshot, qr, scene, index, reactionCounts }) => {
      window.probePort.postMessage({ version: 'color-polish-v6', type: 'color-polish:update', nonce: window.probeNonce, sequence: index + 2, snapshot, control: { nowMs: Date.parse(snapshot.serverTime), elapsedMs: 0, replayKey: index + 1, status: 'ready', source: 'sample', playing: true, scene, reactionCounts, qrDataUrl: qr, submissionUrl: snapshot.submissionUrl } });
    }, { snapshot, qr, scene, index, reactionCounts });
    await frame.waitForFunction(id => window.colorPolishRuntime.getState().scene === id, id);
    await frame.evaluate(() => { window.colorPolishRuntime.step(14000); document.getAnimations().forEach(animation => { animation.pause(); animation.currentTime = 14000; }); });
    await frame.evaluate(async () => { await Promise.all([...document.images].map(image => image.decode().catch(() => {}))); });
    await page.screenshot({ path: resolve(output, scene + '.png') });
    states.push(await frame.evaluate(() => window.colorPolishRuntime.getState()));
  }
  const arrivals = [];
  if (process.argv.includes('--arrivals')) {
    let sequence = 10;
    for (let wave = 0; wave < 11; wave++) {
      const count = wave < 6 ? 1 : 10;
      const records = Array.from({ length: count }, (_, index) => ({
        ...snapshot.recognitions[0],
        id: `arrival-${wave}-${index}`,
        recipient: `Sample ${wave + 1}.${index + 1}`,
        message: 'Thank you for helping today.',
        createdAt: snapshot.serverTime,
        firstPublishedAt: snapshot.serverTime,
        expiresAt: new Date(Date.parse(snapshot.serverTime) + 86_400_000).toISOString(),
        expressionIds: [2],
      }));
      snapshot.recognitions.push(...records);
      snapshot.revision++;
      snapshot.sync = 'delta';
      snapshot.arrivals = records.map(record => ({ eventId: 'event-' + record.id, recognitionId: record.id, publishedAt: snapshot.serverTime }));
      await page.evaluate(({ snapshot, qr, reactionCounts, sequence }) => {
        window.probePort.postMessage({ version: 'color-polish-v6', type: 'color-polish:update', nonce: window.probeNonce, sequence, snapshot, control: { nowMs: Date.parse(snapshot.serverTime), status: 'ready', source: 'sample', playing: true, scene: 'welcome', reactionCounts, qrDataUrl: qr, submissionUrl: snapshot.submissionUrl } });
      }, { snapshot, qr, reactionCounts, sequence: ++sequence });
      await frame.waitForFunction(count => window.colorPolishRuntime.getState().queueLength >= count, count);
      await frame.evaluate(() => window.colorPolishRuntime.step(1200));
      arrivals.push(await frame.evaluate(() => window.colorPolishRuntime.getState()));
      await frame.evaluate(() => window.colorPolishRuntime.step(50000));
    }
  }
  await writeFile(resolve(output, 'result.json'), JSON.stringify({ issues, states, arrivals }, null, 2));
  console.log(JSON.stringify({ issues, scenes: states.map(state => state.scene), arrivals: arrivals.map(state => state.active && { kind: state.active.kind, style: state.active.style }), output }));
  assert.deepEqual(issues, [], 'Browser errors in renderer');
  assert.equal(new Set(states.map(state => state.scene)).size, 10, 'Not every scene rendered');
  if (process.argv.includes('--arrivals')) {
    assert.equal(new Set(arrivals.filter(state => state.active?.kind === 'single').map(state => state.active.style)).size, 6, 'Single entrance styles did not cycle');
    assert.equal(new Set(arrivals.filter(state => state.active?.kind === 'group').map(state => state.active.style)).size, 5, 'Group entrance styles did not cycle');
  }
} finally { await browser.close(); }
