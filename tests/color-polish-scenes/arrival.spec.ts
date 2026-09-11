import { expect, test, type Frame, type Page } from '@playwright/test';
import { buildActiveDisplayFixture } from './helpers';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

test.use({ viewport: { width: 1920, height: 1080 } });

const publicFolder = resolve(process.cwd(), 'public');

type ArrivalRecord = {
  id: string;
  recipient: string;
  message: string;
  createdAt: string;
  firstPublishedAt: string;
  expiresAt: string;
  expressionIds: number[];
  [key: string]: unknown;
};

type ArrivalEvent = {
  eventId: string;
  recognitionId: string;
  publishedAt: string;
  [key: string]: unknown;
};

type ArrivalSnapshot = Omit<ReturnType<typeof buildActiveDisplayFixture>, 'recognitions' | 'arrivals'> & {
  recognitions: ArrivalRecord[];
  arrivals: ArrivalEvent[];
  sync?: string;
};

async function setupArrivalHarness(page: Page): Promise<{
  frame: Frame;
  snapshot: ArrivalSnapshot;
  dummyQr: string;
  reactionCounts: Record<string, number>;
}> {
  await page.addInitScript(() => {
    let seed = 7301;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
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
    if (!url.pathname.startsWith('/color-polish/') || url.pathname.includes('..')) {
      return route.abort();
    }
    const file = resolve(publicFolder, '.' + url.pathname);
    const type = file.endsWith('.js')
      ? 'text/javascript'
      : file.endsWith('.css')
      ? 'text/css'
      : file.endsWith('.html')
      ? 'text/html'
      : file.endsWith('.svg')
      ? 'image/svg+xml'
      : 'image/png';
    try {
      const body = await readFile(file);
      await route.fulfill({ contentType: type, body });
    } catch {
      await route.abort();
    }
  });

  await page.goto('/probe');
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const dummyQr =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const reactionCounts: Record<string, number> = { [snapshot.recognitions[0].id]: 0 };

  await page.evaluate(
    async ({ snapshot, qr, reactionCounts }) => {
      const frame = document.querySelector('iframe');
      if (!frame || !frame.contentWindow) throw new Error('iframe not found');
      const channel = new MessageChannel();
      const nonce = crypto.randomUUID();
      await new Promise<void>((resolve) => {
        channel.port1.onmessage = (event) => {
          if (event.data.type === 'color-polish:ready') resolve();
        };
        channel.port1.start();
        frame.contentWindow!.postMessage(
          { version: 'color-polish-v6', type: 'color-polish:bootstrap', nonce, sequence: 0 },
          '*',
          [channel.port2],
        );
      });
      (window as any).probePort = channel.port1;
      (window as any).probeNonce = nonce;
      channel.port1.postMessage({
        version: 'color-polish-v6',
        type: 'color-polish:update',
        nonce,
        sequence: 1,
        snapshot,
        control: {
          nowMs: Date.parse(snapshot.serverTime),
          status: 'ready',
          source: 'sample',
          playing: true,
          scene: 'welcome',
          reactionCounts,
          qrDataUrl: qr,
          submissionUrl: snapshot.submissionUrl,
        },
      });
    },
    { snapshot, qr: dummyQr, reactionCounts },
  );

  const frame = page.frames().find((f) => f.url().endsWith('/color-polish/renderer.html'));
  if (!frame) throw new Error('renderer frame not found');
  await frame.waitForFunction(() => (window as any).colorPolishRuntime?.getState().mode === 'normal');

  return { frame, snapshot, dummyQr, reactionCounts };
}

async function pushArrivalWave(
  page: Page,
  frame: Frame,
  snapshot: ArrivalSnapshot,
  dummyQr: string,
  reactionCounts: Record<string, number>,
  wave: number,
  sequence: number,
) {
  const count = wave < 6 ? 1 : 10;
  const records: ArrivalRecord[] = Array.from({ length: count }, (_, index) => ({
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
  snapshot.arrivals = records.map((record: ArrivalRecord) => ({
    eventId: 'event-' + record.id,
    recognitionId: record.id,
    publishedAt: snapshot.serverTime,
  }));

  await page.evaluate(
    ({ snapshot, qr, reactionCounts, sequence }) => {
      (window as any).probePort.postMessage({
        version: 'color-polish-v6',
        type: 'color-polish:update',
        nonce: (window as any).probeNonce,
        sequence,
        snapshot,
        control: {
          nowMs: Date.parse(snapshot.serverTime),
          status: 'ready',
          source: 'sample',
          playing: true,
          scene: 'welcome',
          reactionCounts,
          qrDataUrl: qr,
          submissionUrl: snapshot.submissionUrl,
        },
      });
    },
    { snapshot, qr: dummyQr, reactionCounts, sequence },
  );

  await frame.waitForFunction(
    (targetCount) => (window as any).colorPolishRuntime.getState().queueLength >= targetCount,
    count,
  );
}

test('single and group entrance styles cycle in the recorded order', async ({ page }) => {
  test.setTimeout(60_000);
  const { frame, snapshot, dummyQr, reactionCounts } = await setupArrivalHarness(page);

  const expectedSequence = [
    { kind: 'single', style: 1 },
    { kind: 'single', style: 5 },
    { kind: 'single', style: 2 },
    { kind: 'single', style: 3 },
    { kind: 'single', style: 4 },
    { kind: 'single', style: 0 },
    { kind: 'group', style: 2 },
    { kind: 'group', style: 4 },
    { kind: 'group', style: 3 },
    { kind: 'group', style: 1 },
    { kind: 'group', style: 0 },
  ];

  const recordedSequence: Array<{ kind: string; style: number }> = [];
  let seq = 1;

  for (let wave = 0; wave < 11; wave++) {
    seq++;
    await pushArrivalWave(page, frame, snapshot, dummyQr, reactionCounts, wave, seq);
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(1200));

    const activeState = await frame.evaluate(() => {
      const state = (window as any).colorPolishRuntime.getState();
      return state.active ? { kind: state.active.kind, style: state.active.style } : null;
    });

    expect(activeState).not.toBeNull();
    recordedSequence.push(activeState!);

    await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
    await frame.waitForFunction(() => (window as any).colorPolishRuntime.getState().active === null);
  }

  expect(recordedSequence).toEqual(expectedSequence);
});

test('the four reworked entrances start deep and resolve flat', async ({ page }) => {
  test.setTimeout(60_000);
  const { frame, snapshot, dummyQr, reactionCounts } = await setupArrivalHarness(page);

  // Direct trajectory function depth checks in renderer frame
  const s2z = await frame.evaluate(() => (window as any).singleTrajectory(2, 0.15).z);
  const s5z = await frame.evaluate(() => (window as any).singleTrajectory(5, 0.15).z);
  expect(s2z).toBeLessThan(-450);
  expect(s5z).toBeLessThan(-450);

  // Group style 0 constellation: rank 9 starts at least 400 deeper than rank 0
  const g0zRank0 = await frame.evaluate(
    () => (window as any).groupTrajectory(0, 0, 0.15, { x: 906, y: 307 }).z,
  );
  const g0zRank9 = await frame.evaluate(
    () => (window as any).groupTrajectory(0, 9, 9 * 0.032 + 0.15, { x: 906, y: 307 }).z,
  );
  expect(g0zRank0 - g0zRank9).toBeGreaterThanOrEqual(400);

  // Group style 4 ripple of kindness: per-source zStart differences
  const [g4z0, g4z1, g4z2] = await frame.evaluate(() => {
    const b = { x: 906, y: 307 };
    return [
      (window as any).groupTrajectory(4, 0, 0.2, b).z,
      (window as any).groupTrajectory(4, 1, 0.2, b).z,
      (window as any).groupTrajectory(4, 2, 0.2, b).z,
    ];
  });
  expect(Math.abs(g4z0 - g4z1)).toBeGreaterThanOrEqual(100);
  expect(Math.abs(g4z0 - g4z2)).toBeGreaterThanOrEqual(100);

  const [normZ0, normZ1, normZ2] = await frame.evaluate(() => {
    const b = { x: 906, y: 307 };
    const duration = 0.71;
    const orders = [2, 7, 1, 3, 6, 8, 0, 4, 5, 9];
    const pForU = (idx: number, uVal: number) => orders.indexOf(idx) * 0.032 + uVal * duration;
    return [
      (window as any).groupTrajectory(4, 0, pForU(0, 0.2), b).z,
      (window as any).groupTrajectory(4, 1, pForU(1, 0.2), b).z,
      (window as any).groupTrajectory(4, 2, pForU(2, 0.2), b).z,
    ];
  });
  expect(Math.abs(normZ0 - normZ1)).toBeGreaterThanOrEqual(100);
  expect(Math.abs(normZ0 - normZ2)).toBeGreaterThanOrEqual(100);
  expect(Math.abs(normZ1 - normZ2)).toBeGreaterThanOrEqual(100);

  // Trajectory resolution flat checks at entrance end (p = 1)
  const settled = await frame.evaluate(() => {
    const b = { x: 906, y: 307 };
    return {
      s2: (window as any).singleTrajectory(2, 1),
      s5: (window as any).singleTrajectory(5, 1),
      g0: (window as any).groupTrajectory(0, 3, 1, b),
      g4: (window as any).groupTrajectory(4, 5, 1, b),
    };
  });
  expect(Math.abs(settled.s2.z)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(settled.s2.k - 1)).toBeLessThanOrEqual(0.01);
  expect(Math.abs(settled.s5.z)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(settled.s5.k - 1)).toBeLessThanOrEqual(0.01);
  expect(Math.abs(settled.g0.z)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(settled.g0.k - 1)).toBeLessThanOrEqual(0.01);
  expect(Math.abs(settled.g4.z)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(settled.g4.k - 1)).toBeLessThanOrEqual(0.01);

  let seq = 1;
  for (let wave = 0; wave < 11; wave++) {
    seq++;
    await pushArrivalWave(page, frame, snapshot, dummyQr, reactionCounts, wave, seq);

    // Queue gap: step 650 ms first
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(650));

    // Sample at resolved time: entrance duration plus 100 ms
    const entranceDuration = wave < 6 ? 3600 : 4700;
    await frame.evaluate((ms) => (window as any).colorPolishRuntime.step(ms), entranceDuration + 100);

    const resolvedInfo = await frame.evaluate(() => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>('.event-orb'));
      return elements.map((el) => {
        const zi = parseInt(el.style.zIndex || window.getComputedStyle(el).zIndex || '600', 10);
        const z = zi - 600;
        const opacity = parseFloat(el.style.opacity || '1');
        const transform = el.style.transform || '';
        const match = transform.match(/scale\(([^)]+)\)/);
        const scale = match ? parseFloat(match[1]) : 1;
        return { z, scale, opacity };
      });
    });

    expect(resolvedInfo.length).toBeGreaterThan(0);
    for (const orb of resolvedInfo) {
      expect(Math.abs(orb.z)).toBeLessThanOrEqual(2);
      expect(Math.abs(orb.scale - 1)).toBeLessThanOrEqual(0.02);
      expect(orb.opacity).toBe(1);
    }

    await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
    await frame.waitForFunction(() => (window as any).colorPolishRuntime.getState().active === null);
  }
});

test('every arriving orb stays circular mid-entrance', async ({ page }) => {
  test.setTimeout(60_000);
  const { frame, snapshot, dummyQr, reactionCounts } = await setupArrivalHarness(page);

  let seq = 1;
  for (let wave = 0; wave < 11; wave++) {
    seq++;
    await pushArrivalWave(page, frame, snapshot, dummyQr, reactionCounts, wave, seq);

    // Step 650 ms queue gap first, then advance to mid-entrance
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(650));
    const midEntranceMs = wave < 6 ? 1800 : 2350;
    await frame.evaluate((ms) => (window as any).colorPolishRuntime.step(ms), midEntranceMs);

    const orbShapes = await frame.evaluate(() => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>('.event-orb'));
      return elements.map((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const beforeStyle = window.getComputedStyle(el, '::before');
        const inner = el.querySelector<HTMLElement>('.orb');
        const innerStyle = inner ? window.getComputedStyle(inner) : null;
        return {
          width: rect.width,
          height: rect.height,
          radius: style.borderRadius,
          beforeRadius: beforeStyle.borderRadius,
          innerRadius: innerStyle?.borderRadius || '',
        };
      });
    });

    expect(orbShapes.length).toBeGreaterThan(0);
    for (const orb of orbShapes) {
      expect(Math.abs(orb.width - orb.height)).toBeLessThanOrEqual(1);
      const is50Percent =
        orb.radius.includes('50%') ||
        orb.beforeRadius.includes('50%') ||
        orb.innerRadius.includes('50%');
      const halfWidth = orb.width / 2;
      const isNumericHalf =
        halfWidth > 0 &&
        [orb.radius, orb.beforeRadius, orb.innerRadius].some((r) => {
          const parts = r.split(/\s+/).map(parseFloat).filter((n) => !isNaN(n));
          return parts.length > 0 && parts.every((p) => Math.abs(p - halfWidth) <= 1);
        });
      expect(is50Percent || isNumericHalf).toBe(true);
    }

    await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
    await frame.waitForFunction(() => (window as any).colorPolishRuntime.getState().active === null);
  }
});

test('a screenshot per style at the entrance midpoint', async ({ page }) => {
  test.setTimeout(60_000);
  const { frame, snapshot, dummyQr, reactionCounts } = await setupArrivalHarness(page);

  const screenshotPaths: string[] = [];
  let seq = 1;

  for (let wave = 0; wave < 11; wave++) {
    seq++;
    await pushArrivalWave(page, frame, snapshot, dummyQr, reactionCounts, wave, seq);

    // Step 650 ms queue gap first, then advance to mid-entrance
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(650));
    const midpointMs = wave < 6 ? 1800 : 2350;
    await frame.evaluate((ms) => (window as any).colorPolishRuntime.step(ms), midpointMs);

    const activeInfo = await frame.evaluate(() => {
      const state = (window as any).colorPolishRuntime.getState();
      return state.active ? { kind: state.active.kind, style: state.active.style } : null;
    });

    expect(activeInfo).not.toBeNull();
    const filename = `${activeInfo!.kind}-${activeInfo!.style}.png`;
    const outputPath = test.info().outputPath(filename);

    await frame.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
    });

    await page.screenshot({ path: outputPath });
    screenshotPaths.push(outputPath);

    await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
    await frame.waitForFunction(() => (window as any).colorPolishRuntime.getState().active === null);
  }

  expect(screenshotPaths).toHaveLength(11);
  for (const p of screenshotPaths) {
    const fileStat = await stat(p);
    expect(fileStat.size).toBeGreaterThan(0);
  }
});
