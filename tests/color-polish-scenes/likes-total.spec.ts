import { expect, test, type Frame, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildActiveDisplayFixture } from './helpers';

// The header likes count shows the campaign-wide total the host passes in, not
// the sum over the latest 100 recognitions the snapshot carries. Fictional
// sample data only; the renderer is served from this checkout's public folder.

test.describe.configure({ timeout: 120_000 });
const publicFolder = resolve(process.cwd(), 'public');
const NOW = '2026-09-10T18:00:00.000Z';
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function record(n: number) {
  const created = Date.parse('2026-09-10T17:30:00Z') - n * 17 * 60000;
  return {
    id: uuid(n + 1),
    recipient: `Sample ${n + 1}`,
    message: `A synthetic public message (${n + 1}).`,
    expressionIds: [1 + (n % 9)],
    createdAt: new Date(created).toISOString(),
    firstPublishedAt: new Date(created).toISOString(),
    expiresAt: new Date(created + 7 * 86400000).toISOString(),
    version: 1,
    status: 'published',
    featured: false,
  };
}

const recognitions = Array.from({ length: 3 }, (_, n) => record(n));
const reactionCounts = { [uuid(1)]: 2, [uuid(2)]: 3, [uuid(3)]: 4 };

function snapshot() {
  const base = buildActiveDisplayFixture() as any;
  return { ...base, serverTime: NOW, recognitions, presentation: { ...base.presentation, enabled: true } };
}

async function boot(page: Page): Promise<Frame> {
  await page.addInitScript(() => {
    window.requestAnimationFrame = () => 0;
  });
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/probe') {
      return route.fulfill({
        contentType: 'text/html',
        body: '<html><body style="margin:0"><iframe title="Probe" sandbox="allow-scripts" referrerpolicy="no-referrer" src="/color-polish/renderer.html" style="width:100vw;height:100vh;border:0"></iframe></body></html>',
      });
    }
    if (!url.pathname.startsWith('/color-polish/') || url.pathname.includes('..')) return route.abort();
    const file = resolve(publicFolder, '.' + url.pathname);
    const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : 'image/png';
    try {
      await route.fulfill({ contentType: type, body: await readFile(file) });
    } catch {
      await route.abort();
    }
  });
  await page.goto('/probe');
  await page.evaluate(async () => {
    const frame = document.querySelector('iframe')!;
    const channel = new MessageChannel();
    const nonce = crypto.randomUUID();
    await new Promise<void>((done) => {
      channel.port1.onmessage = (event) => {
        if (event.data.type === 'color-polish:ready') done();
      };
      channel.port1.start();
      frame.contentWindow!.postMessage({ version: 'color-polish-v6', type: 'color-polish:bootstrap', nonce, sequence: 0 }, '*', [channel.port2]);
    });
    (window as any).probePort = channel.port1;
    (window as any).probeNonce = nonce;
    (window as any).probeSequence = 0;
  });
  const frame = page.frames().find((f) => f.url().endsWith('/color-polish/renderer.html'));
  if (!frame) throw new Error('renderer frame not found');
  return frame;
}

async function send(page: Page, control: Record<string, unknown>) {
  await page.evaluate(
    ({ snapshot, control }) => {
      const w = window as any;
      w.probeSequence += 1;
      w.probePort.postMessage({ version: 'color-polish-v6', type: 'color-polish:update', nonce: w.probeNonce, sequence: w.probeSequence, snapshot, control });
    },
    { snapshot: snapshot(), control: { nowMs: Date.parse(NOW), status: 'ready', source: 'live', playing: true, scene: 'welcome', reactionCounts, submissionUrl: 'https://mothers-love.vercel.app/recognize', qrDataUrl: null, ...control } },
  );
}

const headerTotal = (frame: Frame) => frame.evaluate(() => (window as any).reactionTotal());

test('the header shows the campaign-wide likes total when the host sends one', async ({ page }) => {
  const frame = await boot(page);
  await send(page, { reactionTotal: 250 });
  await expect.poll(() => headerTotal(frame)).toBe(250);
});

test('without a campaign total the header falls back to the likes it holds', async ({ page }) => {
  const frame = await boot(page);
  await send(page, {});
  await expect.poll(() => headerTotal(frame)).toBe(9);
  await send(page, { reactionTotal: null });
  await expect.poll(() => headerTotal(frame)).toBe(9);
});
