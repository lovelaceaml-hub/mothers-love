import { expect, test, type Frame, type Page } from '@playwright/test';
import { buildActiveDisplayFixture, circularity, loadRenderer } from './helpers';
import { mkdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

test.use({ viewport: { width: 1920, height: 1080 } });

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

async function pushArrivalWave(
  page: Page,
  frame: Frame,
  snapshot: ArrivalSnapshot,
  wave: number,
  sequence: number,
  options?: { idPrefix?: string; expressionIds?: number[]; message?: string },
) {
  const count = wave < 6 ? 1 : 10;
  const prefix = options?.idPrefix || `arrival-w${wave}-s${sequence}`;
  const records: ArrivalRecord[] = Array.from({ length: count }, (_, index) => ({
    ...snapshot.recognitions[0],
    id: `${prefix}-${index}`,
    recipient: `Sample ${wave + 1}.${index + 1}`,
    message: options?.message || 'Thank you for helping today.',
    createdAt: snapshot.serverTime,
    firstPublishedAt: snapshot.serverTime,
    expiresAt: new Date(Date.parse(snapshot.serverTime) + 86_400_000).toISOString(),
    expressionIds: options?.expressionIds || [2],
  }));
  snapshot.recognitions.push(...records);
  snapshot.revision++;
  snapshot.sync = 'delta';
  snapshot.arrivals = records.map((record: ArrivalRecord) => ({
    eventId: 'event-' + record.id,
    recognitionId: record.id,
    publishedAt: snapshot.serverTime,
  }));

  const dummyQr =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const reactionCounts: Record<string, number> = { [snapshot.recognitions[0].id]: 0 };

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

test('single and group entrance styles cycle in the recorded order, and four frame styles are declared', async ({ page }) => {
  test.setTimeout(60_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

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
    await pushArrivalWave(page, frame, snapshot, wave, seq);
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(1200));

    const activeState = await frame.evaluate(() => {
      const state = (window as any).colorPolishRuntime.getState();
      return state.active ? { kind: state.active.kind, style: state.active.style } : null;
    });

    expect(activeState).not.toBeNull();
    recordedSequence.push(activeState!);

    await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
    await frame.waitForFunction(() => {
      const st = (window as any).colorPolishRuntime.getState();
      return st.active === null && st.queueLength === 0;
    });
  }

  expect(recordedSequence).toEqual(expectedSequence);

  // Assert four frame styles recorded in log over the first four single arrivals
  const logFrames = await frame.evaluate(() => {
    const logs = (window as any).colorPolishRuntime.getState().log || [];
    return logs
      .filter((l: any) => l.type === 'entrance_start')
      .slice(0, 4)
      .map((l: any) => l.frame);
  });
  const expectedFrames = ['Light beam', 'Petal curtain', 'Aurora', 'Constellation gather'];
  expect(new Set(logFrames)).toEqual(new Set(expectedFrames));
  expect(logFrames).toHaveLength(4);
});

test('the four reworked entrances start deep and resolve flat', async ({ page }) => {
  test.setTimeout(60_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  const s2z = await frame.evaluate(() => (window as any).singleTrajectory(2, 0.15).z);
  const s5z = await frame.evaluate(() => (window as any).singleTrajectory(5, 0.15).z);
  expect(s2z).toBeLessThan(-450);
  expect(s5z).toBeLessThan(-450);

  const g0zRank0 = await frame.evaluate(
    () => (window as any).groupTrajectory(0, 0, 0.15, { x: 906, y: 307 }).z,
  );
  const g0zRank9 = await frame.evaluate(
    () => (window as any).groupTrajectory(0, 9, 9 * 0.032 + 0.15, { x: 906, y: 307 }).z,
  );
  expect(g0zRank0 - g0zRank9).toBeGreaterThanOrEqual(400);

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
    await pushArrivalWave(page, frame, snapshot, wave, seq);
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(650));

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

test('circularity holds on .event-orb at entrance midpoint, hold midpoint, and exit midpoint', async ({ page }) => {
  test.setTimeout(60_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  await pushArrivalWave(page, frame, snapshot, 0, 2);

  // 1. Entrance midpoint (~1800 ms)
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(650));
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(1800));
  const entranceCirc = await circularity(frame);
  expect(entranceCirc.failures).toHaveLength(0);
  expect(entranceCirc.count).toBeGreaterThan(0);

  // 2. Hold midpoint (~1800 ms + 4000 ms = hold phase)
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(4000));
  const holdCirc = await circularity(frame);
  expect(holdCirc.failures).toHaveLength(0);
  expect(holdCirc.count).toBeGreaterThan(0);

  // 3. Exit midpoint (~675 ms into exit)
  await frame.evaluate(() => {
    const active = (window as any).active;
    const remainingHold = Math.max(0, (active?.hold || 8) - (active?.localTime || 0));
    (window as any).colorPolishRuntime.step(remainingHold * 1000 + 10);
    (window as any).colorPolishRuntime.step(675);
  });
  const exitCirc = await circularity(frame);
  expect(exitCirc.failures).toHaveLength(0);
  expect(exitCirc.count).toBeGreaterThan(0);

  await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
  await frame.waitForFunction(() => (window as any).colorPolishRuntime.getState().active === null);
});

test('arrival ring carries 3D rotation while orb and ancestors carry none', async ({ page }) => {
  test.setTimeout(60_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  await pushArrivalWave(page, frame, snapshot, 0, 2);
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(650));
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(2000));

  const transformAudit = await frame.evaluate(() => {
    const rings = Array.from(document.querySelectorAll<HTMLElement>('.arrival-ring'));
    const orbs = Array.from(document.querySelectorAll<HTMLElement>('.event-orb'));
    return {
      rings: rings.map((r) => ({
        inline: r.style.transform || '',
        computed: window.getComputedStyle(r).transform,
        preserve3d: window.getComputedStyle(r).transformStyle,
      })),
      orbs: orbs.map((o) => {
        const inline = o.style.transform || '';
        const computed = window.getComputedStyle(o).transform;
        const ancestors: Array<{ tag: string; id: string; className: string; transform: string; computed: string }> = [];
        let p = o.parentElement;
        while (p && p.id !== 'tv') {
          ancestors.push({
            tag: p.tagName,
            id: p.id,
            className: p.className,
            transform: p.style.transform || '',
            computed: window.getComputedStyle(p).transform,
          });
          p = p.parentElement;
        }
        return { inline, computed, ancestors };
      }),
    };
  });

  expect(transformAudit.rings.length).toBeGreaterThan(0);
  for (const r of transformAudit.rings) {
    const hasRotate = r.inline.includes('rotate') || r.computed.startsWith('matrix3d');
    expect(hasRotate).toBe(true);
    expect(r.preserve3d).toBe('preserve-3d');
  }

  expect(transformAudit.orbs.length).toBeGreaterThan(0);
  for (const o of transformAudit.orbs) {
    expect(o.inline).not.toContain('rotate');
    expect(o.computed.startsWith('matrix3d')).toBe(false);
    for (const a of o.ancestors) {
      expect(a.transform).not.toContain('rotate');
      expect(a.computed.startsWith('matrix3d')).toBe(false);
    }
  }

  await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
  await frame.waitForFunction(() => (window as any).colorPolishRuntime.getState().active === null);
});

test('reduced motion displays bubble within one frame without assembly or burst', async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  await pushArrivalWave(page, frame, snapshot, 0, 2);

  // Confirm queue and mode state in reduced motion
  const initial = await frame.evaluate(() => {
    const st = (window as any).colorPolishRuntime.getState();
    return { queueLength: st.queueLength, mode: st.mode, still: st.still };
  });
  expect(initial.queueLength).toBeGreaterThanOrEqual(1);
  expect(initial.mode).toBe('normal');
  expect(initial.still).toBe(true);

  // Advance past 650 ms queue gap so the queued arrival begins
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(700));
  await frame.waitForFunction(() => (window as any).colorPolishRuntime.getState().active !== null);

  const stillCheck = await frame.evaluate(() => {
    const state = (window as any).colorPolishRuntime.getState();
    const orbs = Array.from(document.querySelectorAll<HTMLElement>('.event-orb'));
    const bursts = document.querySelectorAll('.arrival-burst-item');
    const sky = document.getElementById('arrival-sky');
    const skyStyle = sky ? window.getComputedStyle(sky) : null;
    const ray = document.querySelector<HTMLElement>('.arrival-sky-ray');
    const rayStyle = ray ? window.getComputedStyle(ray) : null;
    return {
      still: state.still,
      active: state.active !== null,
      orbCount: orbs.length,
      firstOrbOpacity: orbs[0] ? parseFloat(orbs[0].style.opacity || '1') : 0,
      burstCount: bursts.length,
      hasBackdrop: !!sky,
      backdropOpacity: skyStyle ? parseFloat(skyStyle.opacity) : 0,
      skyAnimation: skyStyle ? skyStyle.animationName : 'missing',
      rayCount: document.querySelectorAll('.arrival-sky-ray').length,
      rayAnimation: rayStyle ? rayStyle.animationName : 'missing',
    };
  });

  expect(stillCheck.still).toBe(true);
  expect(stillCheck.active).toBe(true);
  expect(stillCheck.orbCount).toBe(1);
  expect(stillCheck.firstOrbOpacity).toBe(1);
  expect(stillCheck.burstCount).toBe(0);
  // Reduced motion keeps the bright backdrop, static, with no ray animation.
  expect(stillCheck.hasBackdrop).toBe(true);
  expect(stillCheck.backdropOpacity).toBe(1);
  expect(stillCheck.rayCount).toBeGreaterThan(0);
  expect(stillCheck.skyAnimation).toBe('none');
  expect(stillCheck.rayAnimation).toBe('none');

  await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
  await frame.waitForFunction(() => {
    const st = (window as any).colorPolishRuntime.getState();
    return st.active === null && st.queueLength === 0;
  });
});

test('G3 computed-style stage dim holds, and the backdrop is a bright full screen layer above header and rail', async ({ page }) => {
  test.setTimeout(60_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  await pushArrivalWave(page, frame, snapshot, 0, 2);
  // Step past gap and entrance to hold midpoint (entrance 3.6 s + 4 s hold)
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(650));
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(5600));

  // Wait for the CSS transitions on #stage and the backdrop to settle. A fixed wait is
  // not enough on a loaded machine, so poll the settled values instead.
  await page.waitForTimeout(1000);
  await expect
    .poll(
      async () =>
        await frame.evaluate(() => {
          const stage = document.getElementById('stage');
          const sky = document.getElementById('arrival-sky');
          return (
            !!stage && parseFloat(window.getComputedStyle(stage).opacity) <= 0.23 &&
            !!sky && parseFloat(window.getComputedStyle(sky).opacity) === 1
          );
        }),
      { timeout: 20_000 },
    )
    .toBe(true);

  const styles = await frame.evaluate(() => {
    const stage = document.getElementById('stage');
    const eventStage = document.getElementById('event');
    const tv = document.getElementById('tv');
    const sky = document.getElementById('arrival-sky');
    const header = document.querySelector<HTMLElement>('.tv-header');
    const footer = document.querySelector<HTMLElement>('.footer');
    if (!stage || !eventStage || !tv || !header || !footer) return null;
    const stageStyle = window.getComputedStyle(stage);
    const legacyBackdrop = window.getComputedStyle(eventStage, '::before');
    const skyStyle = sky ? window.getComputedStyle(sky) : null;
    const tvRect = tv.getBoundingClientRect();
    const skyRect = sky ? sky.getBoundingClientRect() : null;
    return {
      stageDimmed: stage.classList.contains('dimmed'),
      stageOpacity: parseFloat(stageStyle.opacity),
      stageFilter: stageStyle.filter,
      legacyBackdropContent: legacyBackdrop.content,
      legacyBackdropBg: legacyBackdrop.backgroundColor,
      hasSky: !!sky,
      skyOpacity: skyStyle ? parseFloat(skyStyle.opacity) : 0,
      skyZ: skyStyle ? parseInt(skyStyle.zIndex, 10) : 0,
      skyPointerEvents: skyStyle ? skyStyle.pointerEvents : '',
      eventZ: parseInt(window.getComputedStyle(eventStage).zIndex, 10),
      headerZ: parseInt(window.getComputedStyle(header).zIndex, 10),
      footerZ: parseInt(window.getComputedStyle(footer).zIndex, 10),
      skyInTv: !!sky && sky.parentElement === tv,
      tvRect: { x: tvRect.x, y: tvRect.y, width: tvRect.width, height: tvRect.height },
      skyRect: skyRect ? { x: skyRect.x, y: skyRect.y, width: skyRect.width, height: skyRect.height } : null,
    };
  });

  expect(styles).not.toBeNull();
  expect(styles!.stageDimmed).toBe(true);
  expect(styles!.stageOpacity).toBeLessThanOrEqual(0.23);
  expect(styles!.stageFilter).toContain('blur(');

  // The near-black arrival backdrop is gone.
  const legacyAlphaMatch = styles!.legacyBackdropBg.match(
    /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/,
  );
  const legacyAlpha = legacyAlphaMatch
    ? parseFloat(legacyAlphaMatch[1])
    : styles!.legacyBackdropBg.startsWith('rgb(')
    ? 1
    : 0;
  expect(legacyAlpha).toBe(0);

  // The bright backdrop is mounted on #tv, covers the whole TV box, and paints
  // above the header and the footer that carries the live recognition rail.
  expect(styles!.hasSky).toBe(true);
  expect(styles!.skyInTv).toBe(true);
  expect(styles!.skyOpacity).toBe(1);
  expect(styles!.skyPointerEvents).toBe('none');
  expect(styles!.skyZ).toBeGreaterThan(styles!.headerZ);
  expect(styles!.skyZ).toBeGreaterThan(styles!.footerZ);
  expect(styles!.eventZ).toBeGreaterThan(styles!.skyZ);
  expect(Math.abs(styles!.skyRect!.x - styles!.tvRect.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(styles!.skyRect!.y - styles!.tvRect.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(styles!.skyRect!.width - styles!.tvRect.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(styles!.skyRect!.height - styles!.tvRect.height)).toBeLessThanOrEqual(1);

  await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
  await frame.waitForFunction(() => {
    const st = (window as any).colorPolishRuntime.getState();
    return st.active === null && st.queueLength === 0;
  });
});

test('four frame styles are logged with no immediate repeat and vary independently from path styles', async ({ page }) => {
  test.setTimeout(60_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  await frame.evaluate(() => (window as any).arrivalResetFrameBag?.());

  let seq = 1;
  for (let wave = 0; wave < 4; wave++) {
    seq++;
    await pushArrivalWave(page, frame, snapshot, wave, seq);
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(1200));
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
    await frame.waitForFunction(() => {
      const st = (window as any).colorPolishRuntime.getState();
      return st.active === null && st.queueLength === 0;
    });
  }

  const logEntries = await frame.evaluate(() => {
    const logs = (window as any).colorPolishRuntime.getState().log || [];
    return logs.filter((l: any) => l.type === 'entrance_start');
  });

  expect(logEntries.length).toBeGreaterThanOrEqual(4);
  const frames = logEntries.slice(0, 4).map((l: any) => l.frame);
  const styles = logEntries.slice(0, 4).map((l: any) => l.style);

  // Four different frame names logged over four consecutive single arrivals
  const uniqueFrames = new Set(frames);
  expect(uniqueFrames.size).toBe(4);

  // No immediate repeat
  for (let i = 0; i < frames.length - 1; i++) {
    expect(frames[i]).not.toBe(frames[i + 1]);
  }

  // Frame and path vary independently: logged pair differs in at least one component every time
  for (let i = 0; i < frames.length - 1; i++) {
    const samePair = frames[i] === frames[i + 1] && styles[i] === styles[i + 1];
    expect(samePair).toBe(false);
  }
});

test('feed rail and returnScene behavior are unchanged after arrival chain', async ({ page }) => {
  test.setTimeout(60_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  const beforeState = await frame.evaluate(() => {
    const feed = document.getElementById('feed-columns');
    const items = Array.from(feed?.querySelectorAll<HTMLElement>('.chat-item') || []);
    const feedIds = items.map((el) => el.dataset.feedId || '').filter(Boolean);
    return {
      scene: (window as any).colorPolishRuntime.getState().scene,
      chatItemCount: items.length,
      feedIds,
    };
  });

  // Run single arrival
  await pushArrivalWave(page, frame, snapshot, 0, 2);
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(1200));
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
  await frame.waitForFunction(() => {
    const st = (window as any).colorPolishRuntime.getState();
    return st.active === null && st.queueLength === 0;
  });

  const afterState = await frame.evaluate(() => {
    const feed = document.getElementById('feed-columns');
    const items = Array.from(feed?.querySelectorAll<HTMLElement>('.chat-item') || []);
    const feedIds = items.map((el) => el.dataset.feedId || '').filter(Boolean);
    return {
      scene: (window as any).colorPolishRuntime.getState().scene,
      chatItemCount: items.length,
      feedIds,
    };
  });

  expect(afterState.scene).toBe(beforeState.scene);
  expect(afterState.chatItemCount).toBe(beforeState.chatItemCount);
  expect(afterState.feedIds).toEqual(beforeState.feedIds);
});

test('screenshots for frame styles at assembly midpoint and path styles at entrance midpoint', async ({ page }) => {
  test.setTimeout(180_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  const outputFolder = resolve(process.cwd(), 'docs/runs/2026-09-12-tv-next-level/logs/arrival');
  await mkdir(outputFolder, { recursive: true });

  const screenshotPaths: string[] = [];
  let seq = 1;

  for (let wave = 0; wave < 11; wave++) {
    seq++;
    await pushArrivalWave(page, frame, snapshot, wave, seq);

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
    const outputPath = resolve(outputFolder, filename);

    await frame.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
    });

    await page.screenshot({ path: outputPath });
    screenshotPaths.push(outputPath);

    await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
    await frame.waitForFunction(() => {
      const st = (window as any).colorPolishRuntime.getState();
      return st.active === null && st.queueLength === 0;
    });
  }

  expect(screenshotPaths).toHaveLength(11);
  for (const p of screenshotPaths) {
    const fileStat = await stat(p);
    expect(fileStat.size).toBeGreaterThan(0);
  }

  // Also capture screenshots of the 4 frame styles at assembly midpoint
  await frame.evaluate(() => (window as any).arrivalResetFrameBag?.());
  for (let f = 0; f < 4; f++) {
    seq++;
    await pushArrivalWave(page, frame, snapshot, f, seq, { idPrefix: `frame-shot-${f}` });
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(650));
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(1800));

    const frameFile = `frame-${f}.png`;
    const framePath = resolve(outputFolder, frameFile);

    await frame.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
    });

    await page.screenshot({ path: framePath });
    const frameStat = await stat(framePath);
    expect(frameStat.size).toBeGreaterThan(0);

    await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
    await frame.waitForFunction(() => {
      const st = (window as any).colorPolishRuntime.getState();
      return st.active === null && st.queueLength === 0;
    });
  }
});

test('arrival records log exactly one arrival_record_shown per record for single arrival and oversize group wave', async ({ page }) => {
  test.setTimeout(120_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  // 1. Single arrival: exactly one arrival_record_shown entry exists for that record's id
  let seq = 2;
  const singlePrefix = 'arrival-single-log';
  await pushArrivalWave(page, frame, snapshot, 0, seq, { idPrefix: singlePrefix });
  const singleRecordId = `${singlePrefix}-0`;

  await frame.evaluate(() => (window as any).colorPolishRuntime.step(1200));
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(25000));
  await frame.waitForFunction(() => {
    const st = (window as any).colorPolishRuntime.getState();
    return st.active === null && st.queueLength === 0;
  });

  const singleShownLogs = await frame.evaluate((id: string) => {
    const logs = (window as any).colorPolishRuntime.getState().log || [];
    return logs.filter((l: any) => l.type === 'arrival_record_shown' && l.id === id);
  }, singleRecordId);
  expect(singleShownLogs).toHaveLength(1);

  // 2. Full oversize group wave of ten: each of the ten ids has exactly one entry, not more
  seq++;
  const groupPrefix = 'arrival-group-oversize-log';
  const longMessage =
    'This is an extended appreciation message designed to test the full oversize group reading flow across all five circular pair pages on the display. Thank you for your continued support and kindness.';
  await pushArrivalWave(page, frame, snapshot, 6, seq, {
    idPrefix: groupPrefix,
    message: longMessage,
  });

  const expectedGroupIds = Array.from({ length: 10 }, (_, i) => `${groupPrefix}-${i}`);

  // Step through all 5 buildGroupPage pages and exit to completion
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(1200));
  for (let step = 0; step < 25; step++) {
    const isDone = await frame.evaluate(() => {
      const st = (window as any).colorPolishRuntime.getState();
      return st.active === null && st.queueLength === 0;
    });
    if (isDone) break;
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(8000));
  }

  await frame.waitForFunction(() => {
    const st = (window as any).colorPolishRuntime.getState();
    return st.active === null && st.queueLength === 0;
  });

  // Verify all 5 pages (0 through 4) executed
  const pagesLogged = await frame.evaluate(() => {
    const logs = (window as any).colorPolishRuntime.getState().log || [];
    return logs
      .filter((l: any) => l.type === 'reading_start' && l.kind === 'group')
      .map((l: any) => l.page);
  });
  expect(pagesLogged).toEqual(expect.arrayContaining([0, 1, 2, 3, 4]));

  // Verify each of the ten record ids has exactly one arrival_record_shown entry
  const allShownLogs = await frame.evaluate(() => {
    const logs = (window as any).colorPolishRuntime.getState().log || [];
    return logs.filter((l: any) => l.type === 'arrival_record_shown');
  });

  for (const id of expectedGroupIds) {
    const idLogs = allShownLogs.filter((l: any) => l.id === id);
    expect(idLogs).toHaveLength(1);
  }
});

type LuminanceStats = {
  mean: number;
  min: number;
  darkest5: number;
  brightest50: number;
  /** Share of pixels darker than mid grey, which is what readable dark text looks like. */
  darkFraction: number;
  count: number;
};

type Box = { x: number; y: number; width: number; height: number };

/**
 * Screenshots the viewport (or one clip of it) and measures rendered luminance.
 * The PNG is decoded back inside the probe page, so no image dependency is added.
 */
async function luminanceStats(page: Page, clip?: Box, stride = 1): Promise<LuminanceStats> {
  const rounded = clip
    ? {
        x: Math.max(0, Math.round(clip.x)),
        y: Math.max(0, Math.round(clip.y)),
        width: Math.max(1, Math.round(clip.width)),
        height: Math.max(1, Math.round(clip.height)),
      }
    : undefined;
  const buffer = await page.screenshot(rounded ? { clip: rounded } : {});
  const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
  return await page.evaluate(
    async ({ url, stride }) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('no 2d context');
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const channel = (value: number) => {
        const c = value / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      };
      const values: number[] = [];
      for (let i = 0; i < pixels.length; i += 4 * stride) {
        values.push(
          0.2126 * channel(pixels[i]) + 0.7152 * channel(pixels[i + 1]) + 0.0722 * channel(pixels[i + 2]),
        );
      }
      values.sort((a, b) => a - b);
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      const band = (from: number, to: number) => {
        const start = Math.floor(values.length * from);
        const end = Math.max(Math.floor(values.length * to), start + 1);
        const slice = values.slice(start, end);
        return slice.reduce((sum, value) => sum + value, 0) / slice.length;
      };
      let dark = 0;
      for (const value of values) {
        if (value < 0.35) dark++;
        else break;
      }
      return {
        mean,
        min: values[0],
        darkest5: band(0, 0.05),
        brightest50: band(0.5, 1),
        darkFraction: dark / values.length,
        count: values.length,
      };
    },
    { url: dataUrl, stride },
  );
}

function colorLuminance(color: string): number {
  const parts = color.match(/[\d.]+/g);
  if (!parts || parts.length < 3) throw new Error(`unreadable color: ${color}`);
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * channel(Number(parts[0])) +
    0.7152 * channel(Number(parts[1])) +
    0.0722 * channel(Number(parts[2]))
  );
}

function contrastRatio(a: number, b: number): number {
  const light = Math.max(a, b);
  const dark = Math.min(a, b);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Steps the virtual clock until the arrival is holding on screen.
 * The renderer fixture stubs requestAnimationFrame, so waitForFunction cannot
 * re-poll here; every wait in these checks steps or polls explicitly instead.
 */
async function stepToReading(frame: Frame) {
  await frame.evaluate(() => {
    const runtime = (window as any).colorPolishRuntime;
    for (let i = 0; i < 200; i++) {
      const state = runtime.getState();
      if (state.active && state.active.phase === 'reading') return;
      runtime.step(200);
    }
    throw new Error('arrival never reached its reading phase');
  });
  const phase = await frame.evaluate(
    () => (window as any).colorPolishRuntime.getState().active?.phase ?? null,
  );
  expect(phase).toBe('reading');
}

async function stepToDrained(frame: Frame) {
  await frame.evaluate(() => {
    const runtime = (window as any).colorPolishRuntime;
    for (let i = 0; i < 400; i++) {
      const state = runtime.getState();
      if (state.active === null && state.queueLength === 0) return;
      runtime.step(250);
    }
  });
  const state = await frame.evaluate(() => {
    const value = (window as any).colorPolishRuntime.getState();
    return { active: value.active, queueLength: value.queueLength };
  });
  expect(state.active).toBeNull();
  expect(state.queueLength).toBe(0);
}

async function waitForSkyGone(frame: Frame) {
  await expect
    .poll(async () => await frame.evaluate(() => !document.getElementById('arrival-sky')), {
      timeout: 5000,
    })
    .toBe(true);
}

const ARRIVAL_KINDS: Array<{ name: string; wave: number; expected: string }> = [
  { name: 'single', wave: 0, expected: 'single' },
  { name: 'group', wave: 6, expected: 'group' },
];

for (const kind of ARRIVAL_KINDS) {
test(`the ${kind.name} arrival backdrop is bright at 1920 and at 3840, and orb text keeps AA contrast on it`, async ({ page }) => {
  test.setTimeout(180_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  const beforeArrival = await luminanceStats(page, undefined, 7);

  await pushArrivalWave(page, frame, snapshot, kind.wave, 2);
  await stepToReading(frame);
  await page.waitForTimeout(900);

  const activeKind = await frame.evaluate(
    () => (window as any).colorPolishRuntime.getState().active?.kind ?? null,
  );
  expect(activeKind).toBe(kind.expected);

  const during1920 = await luminanceStats(page, undefined, 7);
  expect(during1920.mean).toBeGreaterThan(0.72);
  expect(during1920.mean).toBeGreaterThan(beforeArrival.mean * 0.9);

  // A column of the TV that only the backdrop paints, top edge to bottom edge.
  const tvBox1920 = await frame.locator('#tv').boundingBox();
  expect(tvBox1920).not.toBeNull();
  const skyOnly1920 = await luminanceStats(
    page,
    { x: tvBox1920!.x + 8, y: tvBox1920!.y + 40, width: 40, height: tvBox1920!.height - 80 },
    1,
  );
  expect(skyOnly1920.mean).toBeGreaterThan(0.85);
  expect(skyOnly1920.min).toBeGreaterThan(0.6);

  // Text on the orb against the backdrop it is actually rendered on.
  const orbBox = await frame.locator('.event-orb').first().boundingBox();
  expect(orbBox).not.toBeNull();
  const orbStats = await luminanceStats(page, orbBox!, 1);
  const textColors = await frame.evaluate(() => {
    const orb = document.querySelector<HTMLElement>('.event-orb');
    if (!orb) return null;
    const recipient = orb.querySelector<HTMLElement>('.recipient');
    const message = orb.querySelector<HTMLElement>('.message');
    return {
      recipient: recipient ? window.getComputedStyle(recipient).color : null,
      message: message ? window.getComputedStyle(message).color : null,
    };
  });
  expect(textColors).not.toBeNull();
  expect(textColors!.recipient).not.toBeNull();
  expect(textColors!.message).not.toBeNull();
  for (const color of [textColors!.recipient!, textColors!.message!]) {
    expect(contrastRatio(colorLuminance(color), orbStats.brightest50)).toBeGreaterThanOrEqual(4.5);
  }

  // Same arrival, 3840 wide: the backdrop still covers the whole TV box and stays bright.
  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.waitForTimeout(400);
  const geometry3840 = await frame.evaluate(() => {
    const tv = document.getElementById('tv');
    const sky = document.getElementById('arrival-sky');
    if (!tv || !sky) return null;
    const tvRect = tv.getBoundingClientRect();
    const skyRect = sky.getBoundingClientRect();
    return {
      tv: { width: tvRect.width, height: tvRect.height, x: tvRect.x, y: tvRect.y },
      sky: { width: skyRect.width, height: skyRect.height, x: skyRect.x, y: skyRect.y },
      skyOpacity: parseFloat(window.getComputedStyle(sky).opacity),
    };
  });
  expect(geometry3840).not.toBeNull();
  expect(geometry3840!.tv.width).toBeGreaterThan(3000);
  expect(Math.abs(geometry3840!.sky.width - geometry3840!.tv.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry3840!.sky.height - geometry3840!.tv.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry3840!.sky.x - geometry3840!.tv.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry3840!.sky.y - geometry3840!.tv.y)).toBeLessThanOrEqual(1);
  expect(geometry3840!.skyOpacity).toBe(1);

  const during3840 = await luminanceStats(page, undefined, 13);
  expect(during3840.mean).toBeGreaterThan(0.72);
  const skyOnly3840 = await luminanceStats(
    page,
    {
      x: geometry3840!.tv.x + 16,
      y: geometry3840!.tv.y + 80,
      width: 80,
      height: geometry3840!.tv.height - 160,
    },
    2,
  );
  expect(skyOnly3840.mean).toBeGreaterThan(0.85);
  expect(skyOnly3840.min).toBeGreaterThan(0.6);

  await page.setViewportSize({ width: 1920, height: 1080 });
  await stepToDrained(frame);
});

test(`the header and the live recognition rail are covered during the ${kind.name} arrival and readable again after`, async ({ page }) => {
  test.setTimeout(180_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  const railItems = await frame.locator('#feed-columns .chat-item').count();
  expect(railItems).toBeGreaterThan(0);

  const headerBox = await frame.locator('.tv-header').boundingBox();
  const railBox = await frame.locator('#feed-columns').boundingBox();
  expect(headerBox).not.toBeNull();
  expect(railBox).not.toBeNull();

  // The footer panel carries the rail, its LIVE RECOGNITIONS title and the QR
  // block, so it stays a stable readability probe while the rail lanes scroll.
  const footerBox = await frame.locator('.footer').boundingBox();
  expect(footerBox).not.toBeNull();

  const headerBefore = await luminanceStats(page, headerBox!, 1);
  const railBefore = await luminanceStats(page, railBox!, 1);
  const footerBefore = await luminanceStats(page, footerBox!, 1);
  // Readable dark text is on screen in the header, the rail and the footer.
  expect(headerBefore.darkFraction).toBeGreaterThan(0.002);
  expect(railBefore.darkFraction).toBeGreaterThan(0.002);
  expect(footerBefore.darkFraction).toBeGreaterThan(0.002);

  await pushArrivalWave(page, frame, snapshot, kind.wave, 2);
  await stepToReading(frame);
  await page.waitForTimeout(900);

  const headerDuring = await luminanceStats(page, headerBox!, 1);
  const railDuring = await luminanceStats(page, railBox!, 1);
  const footerDuring = await luminanceStats(page, footerBox!, 1);
  // Nothing dark shows through: the header, the rail and the whole footer are
  // washed by the bright backdrop for the length of the arrival.
  expect(headerDuring.darkFraction).toBeLessThan(0.0002);
  expect(railDuring.darkFraction).toBeLessThan(0.0002);
  expect(footerDuring.darkFraction).toBeLessThan(0.0002);
  expect(headerDuring.min).toBeGreaterThan(0.3);
  expect(railDuring.min).toBeGreaterThan(0.3);
  expect(headerDuring.mean).toBeGreaterThan(0.6);
  expect(railDuring.mean).toBeGreaterThan(0.6);

  await stepToDrained(frame);
  await waitForSkyGone(frame);
  await page.waitForTimeout(400);

  const headerAfter = await luminanceStats(page, headerBox!, 1);
  const footerAfter = await luminanceStats(page, footerBox!, 1);
  // Readable again: the header and the footer that carries the rail show their
  // own dark text instead of the wash.
  expect(headerAfter.darkFraction).toBeGreaterThan(0.002);
  expect(footerAfter.darkFraction).toBeGreaterThan(0.002);

  const skyGone = await frame.evaluate(() => !document.getElementById('arrival-sky'));
  expect(skyGone).toBe(true);
});
}

test('every entrance style, single and group, runs under the bright backdrop', async ({ page }) => {
  test.setTimeout(180_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  const seen: Array<{ kind: string; style: number; hasSky: boolean; opacity: number; rays: number }> = [];
  let seq = 1;

  for (let wave = 0; wave < 11; wave++) {
    seq++;
    await pushArrivalWave(page, frame, snapshot, wave, seq);
    await stepToReading(frame);
    const reading = await frame.evaluate(() => {
      const state = (window as any).colorPolishRuntime.getState();
      const sky = document.getElementById('arrival-sky');
      const style = sky ? window.getComputedStyle(sky) : null;
      return {
        kind: state.active?.kind ?? 'none',
        style: state.active?.style ?? -1,
        hasSky: !!sky,
        opacity: style ? parseFloat(style.opacity) : 0,
        rays: document.querySelectorAll('.arrival-sky-ray').length,
      };
    });
    seen.push(reading);
    await stepToDrained(frame);
  }

  expect(seen).toHaveLength(11);
  for (const entry of seen) {
    expect(entry.hasSky).toBe(true);
    expect(entry.opacity).toBe(1);
    expect(entry.rays).toBeGreaterThan(0);
  }
  const singleStyles = seen.filter((entry) => entry.kind === 'single').map((entry) => entry.style);
  const groupStyles = seen.filter((entry) => entry.kind === 'group').map((entry) => entry.style);
  expect(new Set(singleStyles).size).toBe(6);
  expect(new Set(groupStyles).size).toBe(5);
});

test('arrival timing is unchanged: single entrance, hold and exit keep their recorded lengths', async ({ page }) => {
  test.setTimeout(120_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  const sample = async (steps: number) =>
    await frame.evaluate((count: number) => {
      const runtime = (window as any).colorPolishRuntime;
      const samples: Array<{ clock: number; phase: string | null }> = [];
      for (let i = 0; i < count; i++) {
        const state = runtime.getState();
        samples.push({ clock: state.clock, phase: state.active ? state.active.phase : null });
        runtime.step(100);
      }
      return samples;
    }, steps);

  const firstClock = (samples: Array<{ clock: number; phase: string | null }>, phase: string | null) =>
    samples.find((entry) => entry.phase === phase)?.clock ?? null;

  await pushArrivalWave(page, frame, snapshot, 0, 2);
  const singleSamples = await sample(180);
  const singleEntrance = firstClock(singleSamples, 'entrance');
  const singleReading = firstClock(singleSamples, 'reading');
  const singleExit = firstClock(singleSamples, 'exit');
  const afterSingle = singleSamples.find(
    (entry) => entry.phase === null && singleExit !== null && entry.clock > singleExit,
  )?.clock ?? null;

  expect(singleEntrance).not.toBeNull();
  expect(singleReading).not.toBeNull();
  expect(singleExit).not.toBeNull();
  expect(afterSingle).not.toBeNull();
  expect(singleReading! - singleEntrance!).toBeGreaterThanOrEqual(3.5);
  expect(singleReading! - singleEntrance!).toBeLessThanOrEqual(3.8);
  expect(singleExit! - singleReading!).toBeGreaterThanOrEqual(7.9);
  expect(singleExit! - singleReading!).toBeLessThanOrEqual(8.3);
  expect(afterSingle! - singleExit!).toBeGreaterThanOrEqual(1.25);
  expect(afterSingle! - singleExit!).toBeLessThanOrEqual(1.55);

  await stepToDrained(frame);

  await pushArrivalWave(page, frame, snapshot, 6, 3);
  const groupSamples = await sample(120);
  const groupEntrance = firstClock(groupSamples, 'entrance');
  const groupReading = firstClock(groupSamples, 'reading');
  expect(groupEntrance).not.toBeNull();
  expect(groupReading).not.toBeNull();
  expect(groupReading! - groupEntrance!).toBeGreaterThanOrEqual(4.6);
  expect(groupReading! - groupEntrance!).toBeLessThanOrEqual(4.9);

  await frame.evaluate(() => (window as any).colorPolishRuntime.step(120000));
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(120000));
});

for (const width of [1920, 3840]) {
test(`captures the bright single and group arrival at start, mid flight and after clearing, at ${width}`, async ({ page }) => {
  test.setTimeout(300_000);
  const outputFolder =
    process.env.L11_CAPTURE_DIR ??
    resolve(process.cwd(), 'docs/runs/2026-09-18-tv-fit/logs/captures/L11/after');
  await mkdir(outputFolder, { recursive: true });

  const written: string[] = [];
  const height = width === 1920 ? 1080 : 2160;
  await page.setViewportSize({ width, height });

  for (const kind of ARRIVAL_KINDS) {
    const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
    const frame = await loadRenderer(page);
    await page.waitForTimeout(300);

    const shot = async (name: string) => {
      await frame.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
      });
      const target = resolve(outputFolder, `w${width}-${kind.name}-${name}.png`);
      await page.screenshot({ path: target });
      const info = await stat(target);
      expect(info.size).toBeGreaterThan(0);
      written.push(target);
    };

    await pushArrivalWave(page, frame, snapshot, kind.wave, 2);

    // Start: the backdrop is up and the entrance has begun.
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(650));
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(300));
    await page.waitForTimeout(900);
    await shot('arrival-start');

    // Mid flight: entrance midpoint.
    await frame.evaluate((ms) => (window as any).colorPolishRuntime.step(ms), kind.wave < 6 ? 1500 : 2050);
    await shot('arrival-mid-flight');

    // Exit flight toward the rail.
    await frame.evaluate(() => {
      const runtime = (window as any).colorPolishRuntime;
      for (let i = 0; i < 300; i++) {
        const state = runtime.getState();
        if (state.active && state.active.phase === 'exit') break;
        runtime.step(200);
      }
      runtime.step(600);
    });
    await shot('arrival-exit-flight');

    // After clearing: the rail is readable again.
    await stepToDrained(frame);
    await waitForSkyGone(frame);
    await page.waitForTimeout(400);
    await shot('arrival-cleared');
  }

  expect(written).toHaveLength(8);
});
}



/* Reviewer additions (Plan 17 Lane 11 review). */

async function pushSafeMode(page: Page, snapshot: ArrivalSnapshot, sequence: number, status: 'quiet' | 'unavailable') {
  await page.evaluate(
    ({ snapshot, sequence, status }) => {
      (window as any).probePort.postMessage({
        version: 'color-polish-v6',
        type: 'color-polish:update',
        nonce: (window as any).probeNonce,
        sequence,
        snapshot: status === 'quiet' ? { ...snapshot, recognitions: [], arrivals: [] } : null,
        control: { nowMs: Date.parse(snapshot.serverTime), status, source: 'sample', playing: true, scene: 'welcome' },
      });
    },
    { snapshot, sequence, status },
  );
}

for (const status of ['quiet', 'unavailable'] as const) {
for (const kind of ARRIVAL_KINDS) {
test(`a ${status} update during the ${kind.name} arrival clears every personal word and the backdrop cannot outlive it`, async ({ page }) => {
  test.setTimeout(180_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);
  await pushArrivalWave(page, frame, snapshot, kind.wave, 2);
  await stepToReading(frame);

  const during = await frame.evaluate(() => ({
    sky: !!document.getElementById('arrival-sky'),
    names: document.querySelectorAll('#event [data-event-id], #event .event-orb').length,
  }));
  expect(during.sky).toBe(true);
  expect(during.names).toBeGreaterThan(0);

  await pushSafeMode(page, snapshot, 3, status);
  await expect
    .poll(async () => await frame.evaluate(() => (window as any).colorPolishRuntime.getState().mode), { timeout: 15_000 })
    .not.toBe('normal');

  const after = await frame.evaluate(() => {
    const event = document.getElementById('event')!;
    return {
      active: event.classList.contains('active'),
      children: event.childElementCount,
      personal: document.querySelectorAll('[data-event-id], .event-orb').length,
      sampleText: /Sample \d+\.\d+/.test(document.getElementById('tv')!.textContent || ''),
    };
  });
  expect(after.active).toBe(false);
  expect(after.children).toBe(0);
  expect(after.personal).toBe(0);
  expect(after.sampleText).toBe(false);

  // The backdrop fades with the frame and then removes itself; it never stays painted.
  await expect
    .poll(
      async () =>
        await frame.evaluate(() => {
          const sky = document.getElementById('arrival-sky');
          return sky ? parseFloat(window.getComputedStyle(sky).opacity) : 0;
        }),
      { timeout: 15_000 },
    )
    .toBe(0);
  await waitForSkyGone(frame);
});
}
}

test('captures every frame style, single and group, under the bright backdrop, and each stays bright', async ({ page }) => {
  test.setTimeout(600_000);
  const outputFolder =
    process.env.L11_CAPTURE_DIR ??
    resolve(process.cwd(), 'docs/runs/2026-09-18-tv-fit/logs/captures/L11/after');
  await mkdir(outputFolder, { recursive: true });
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);
  await page.waitForTimeout(300);
  const panel = { x: 54, y: 148, width: 1812, height: 615 };
  let seq = 1;
  let written = 0;

  for (const kind of ARRIVAL_KINDS) {
    for (let f = 0; f < 4; f++) {
      seq++;
      await frame.evaluate((index) => {
        // Force the next frame style; the bag is the arrival scene's own global.
        (0, eval)(`ARRIVAL_FRAME_BAG=[${index}]`);
      }, f);
      await pushArrivalWave(page, frame, snapshot, kind.wave, seq, { idPrefix: `frame-${kind.name}-${f}` });
      await stepToReading(frame);
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(1500));
      const info = await frame.evaluate(() => ({
        frame: document.getElementById('event')!.dataset.frame,
        name: document.getElementById('event')!.dataset.frameName || '',
        radius: window.getComputedStyle(document.querySelector('#event .arrival-frame')!).borderTopLeftRadius,
      }));
      expect(info.frame).toBe(String(f));
      expect(parseFloat(info.radius)).toBeGreaterThanOrEqual(36);
      // Let the one time name shimmer finish so the capture shows the resting look.
      await page.waitForTimeout(3600);

      // The arrival panel itself must read as light in every frame style, not as a dim slab.
      const stats = await luminanceStats(page, panel, 4);
      expect(stats.mean, `${kind.name} ${info.name} panel mean luminance`).toBeGreaterThan(0.7);

      const slug = info.name.toLowerCase().replace(/[^a-z]+/g, '-');
      const target = resolve(outputFolder, `w1920-${kind.name}-frame-${f}-${slug}.png`);
      await page.screenshot({ path: target });
      expect((await stat(target)).size).toBeGreaterThan(0);
      written++;
      await stepToDrained(frame);
    }
  }
  expect(written).toBe(8);
});
